/* =================================================================
   VIEW / TRILHA — lista de módulos e leitura das lições
   ================================================================= */
window.SQ = window.SQ || {};
SQ.views = SQ.views || {};

SQ.views.Trilha = (function () {
  const el = SQ.dom.el,
    U = SQ.util,
    cfg = SQ.config;

  function lista(container, { modulos, missoes, perfil, recomendacao, foco }, handlers) {
    const total = modulos.reduce((s, m) => s + m.licoes.length, 0);
    const feitas = Object.keys(perfil.licoes).length;
    let blocoFoco = null;
    const blocos = modulos.map((mod, idx) => {
      const miss = missoes.find(x => x.id === mod.fase);
      const r = perfil.missoes[mod.fase];
      const n = mod.licoes.filter(l => perfil.licoes[l.id]).length;
      const b = el(
        'section',
        { class: 'modulo', id: 'mod-' + mod.fase },
        el(
          'div',
          { class: 'modulo-head' },
          el('h3', { text: `${idx + 1}. ${mod.titulo}` }),
          el('span', {
            class: 'muted',
            style: { fontSize: '.9rem' },
            text: r ? `Missão concluída · ${U.estrelas(r.estrelas)}` : `Missão na ${miss.sala}`
          })
        ),
        el(
          'div',
          { class: 'licoes' },
          mod.licoes.map(l => {
            const bloqueada = l.aprofundamento && !r,
              feita = !!perfil.licoes[l.id];
            return el(
              'button',
              {
                class: 'licao-btn' + (feita ? ' done' : ''),
                disabled: bloqueada,
                onclick: () => handlers.abrirLicao(mod, l)
              },
              el('span', { class: 'mark', 'aria-hidden': 'true', text: feita ? '✓' : '' }),
              el('span', {}, l.titulo, feita ? el('span', { class: 'sr-only', text: ' (concluída)' }) : null),
              el('span', { class: 'tag', text: bloqueada ? 'Libera após a missão' : `${l.minutos} min` })
            );
          })
        ),
        el(
          'div',
          { class: 'progress-line', 'aria-hidden': 'true' },
          el('span', { style: { width: (n / mod.licoes.length) * 100 + '%' } })
        )
      );
      if (foco === mod.fase) blocoFoco = b;
      return b;
    });
    container.replaceChildren(
      el('p', {
        text: `Você concluiu ${feitas} de ${total} lições. Cada lição vale ${cfg.xpLicao} XP, e acertar a verificação de primeira vale mais ${cfg.xpVerificacao} XP.`
      }),
      el(
        'div',
        { class: 'card reco', style: { marginBottom: '1rem', padding: '1rem' } },
        el('strong', { text: 'Recomendado para você: ' }),
        recomendacao.texto
      ),
      el('div', { class: 'trilha' }, blocos)
    );
    if (blocoFoco)
      setTimeout(() => {
        blocoFoco.scrollIntoView({ block: 'start' });
        blocoFoco.style.borderColor = 'var(--line)';
      }, 50);
  }

  function licao(container, { mod, licao: l, jaFeita }, handlers) {
    let tentativas = 0,
      respondeu = false;
    const areaFb = el('div', { 'aria-live': 'polite' });
    const concluirBtn = el('button', {
      class: 'btn',
      disabled: !jaFeita,
      text: jaFeita ? 'Voltar à trilha' : 'Concluir lição',
      onclick: () => handlers.concluir({ acertouPrimeira: tentativas === 0, tentativas: tentativas + 1 })
    });
    const blocos = l.blocos.map(b => {
      if (b.tipo === 'p') return el('p', { text: b.texto });
      if (b.tipo === 'lista')
        return [
          b.titulo ? el('h3', { text: b.titulo }) : null,
          el(
            'ul',
            {},
            b.itens.map(t => el('li', { text: t }))
          )
        ];
      if (b.tipo === 'exemplo') return el('div', { class: 'exemplo' }, el('strong', { text: b.titulo }), b.texto);
      if (b.tipo === 'dica') return el('div', { class: 'dica' }, el('strong', { text: 'Dica: ' }), b.texto);
      if (b.tipo === 'codigo') return el('pre', { class: 'code' }, b.texto);
      return null;
    });
    const v = l.verificacao;
    const opcoes = U.embaralhar(v.opcoes);
    const botoes = opcoes.map((op, k) =>
      el(
        'button',
        {
          class: 'option',
          type: 'button',
          onclick: () => {
            if (respondeu || botoes[k].disabled) return;
            if (op.correta) {
              respondeu = true;
              botoes[k].classList.add('right');
              botoes.forEach(b => (b.disabled = true));
              areaFb.replaceChildren(
                el(
                  'div',
                  { class: 'feedback ok' },
                  el('h3', { text: tentativas === 0 ? 'Isso mesmo!' : 'Agora sim!' }),
                  el('p', { text: op.porque })
                )
              );
              concluirBtn.disabled = false;
              concluirBtn.focus({ preventScroll: true });
            } else {
              tentativas++;
              botoes[k].classList.add('wrong');
              botoes[k].disabled = true;
              areaFb.replaceChildren(
                el(
                  'div',
                  { class: 'feedback bad' },
                  el('h3', { text: 'Ainda não' }),
                  el('p', { text: op.porque }),
                  el('p', { text: 'Releia a lição e tente outra alternativa.' })
                )
              );
            }
          }
        },
        el('span', { class: 'key', 'aria-hidden': 'true', text: 'ABCD'[k] }),
        v.codigo ? el('code', { text: op.texto }) : el('span', { text: op.texto })
      )
    );
    container.replaceChildren(
      el(
        'article',
        { class: 'lesson' },
        el('p', {
          class: 'muted',
          text: `${mod.titulo} · ${l.minutos} min de leitura${l.aprofundamento ? ' · Aprofundamento' : ''}`
        }),
        blocos,
        el(
          'section',
          { class: 'check' },
          el('h3', { text: 'Verifique o que aprendeu' }),
          el('p', { style: { fontWeight: 700 }, text: v.pergunta }),
          jaFeita
            ? el('p', { class: 'muted', text: 'Você já concluiu esta lição. Pode responder de novo para praticar.' })
            : null,
          el('div', { class: 'options' }, botoes),
          areaFb
        ),
        el(
          'div',
          { class: 'actions' },
          concluirBtn,
          el('button', { class: 'btn ghost small', onclick: handlers.voltar, text: 'Voltar sem concluir' })
        )
      )
    );
  }

  return { lista, licao };
})();
