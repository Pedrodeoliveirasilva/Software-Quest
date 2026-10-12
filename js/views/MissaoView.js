/* =================================================================
   VIEW / MISSÃO — desenha os desafios e o resumo da missão
   Os quatro tipos de desafio (escolha, classificar, selecionar, ordenar)
   coletam a resposta e chamam handlers.avaliar(resposta). A correção é
   feita pelo MissaoModel (via controller); aqui só se mostra o resultado.
   ================================================================= */
window.SQ = window.SQ || {};
SQ.views = SQ.views || {};

SQ.views.Missao = (function () {
  const el = SQ.dom.el,
    U = SQ.util;

  const tituloAcerto = t => ['Isso mesmo!', 'Acertou na segunda!', 'Acertou na terceira!'][t] || 'Acertou!';
  const restantes = n => (n === 1 ? 'Você tem mais 1 tentativa.' : `Você tem mais ${n} tentativas.`);

  function desafio(container, { desafio: d, indice, total, sala, ultimo }, handlers) {
    const areaFeedback = el('div', { 'aria-live': 'polite' });
    const areaAcoes = el('div', { class: 'actions' });
    const feedback = (tipo, titulo, ...textos) =>
      areaFeedback.replaceChildren(
        el(
          'div',
          { class: 'feedback ' + tipo },
          el('h3', { text: titulo }),
          textos.filter(Boolean).map(t => el('p', { text: t }))
        )
      );

    function terminou(r) {
      areaAcoes.replaceChildren(
        r.registro.pontos ? el('span', { class: 'points-pop', text: `+${r.registro.pontos} XP` }) : null,
        el('button', { class: 'btn', onclick: handlers.proximo, text: ultimo ? 'Concluir missão' : 'Próximo desafio' })
      );
      const b = areaAcoes.querySelector('.btn');
      if (b) b.focus({ preventScroll: true });
    }

    const extras = [];
    if (d.consequencia)
      extras.push(
        el(
          'div',
          { class: 'context' },
          el(
            'p',
            {},
            el('strong', { text: 'Consequência de uma decisão anterior. ' }),
            'Erros nos requisitos não somem: eles aparecem depois, quando custam mais caro.'
          )
        )
      );
    if (d.trecho) extras.push(el('pre', { class: 'code' }, d.trecho));
    if (d.log)
      extras.push(
        el(
          'pre',
          { class: 'code', 'aria-label': 'Registro do pipeline' },
          d.log.map((l, i) => [
            el('span', { class: 'log-line ' + (l.ok ? 'ok' : 'bad'), text: l.t }),
            i < d.log.length - 1 ? '\n' : ''
          ])
        )
      );

    /* ---------- escolha ---------- */
    function escolha() {
      const opcoes = U.embaralhar(d.opcoes);
      const botoes = opcoes.map((o, i) =>
        el(
          'button',
          {
            class: 'option',
            type: 'button',
            onclick: () => {
              const b = botoes[i];
              if (b.disabled) return;
              const r = handlers.avaliar(o);
              if (!r) return;
              if (r.status === 'acerto') {
                b.classList.add('right');
                botoes.forEach(x => (x.disabled = true));
                feedback('ok', tituloAcerto(r.tentativasAntes), o.porque);
                terminou(r);
                return;
              }
              b.classList.add('wrong');
              b.disabled = true;
              if (r.status === 'esgotou') {
                const c = opcoes.findIndex(x => x.correta);
                botoes[c].classList.add('right');
                botoes.forEach(x => (x.disabled = true));
                feedback(
                  'reveal',
                  'Vamos ver a resposta',
                  o.porque,
                  `A resposta certa é: "${opcoes[c].texto}". ${opcoes[c].porque}`
                );
                terminou(r);
              } else feedback('bad', 'Ainda não', o.porque, restantes(r.restantes));
            }
          },
          el('span', { class: 'key', 'aria-hidden': 'true', text: 'ABCDE'[i] }),
          d.codigo ? el('code', { text: o.texto }) : el('span', { text: o.texto })
        )
      );
      return el('div', { class: 'options', role: 'group', 'aria-label': 'Alternativas' }, botoes);
    }

    /* ---------- classificar ---------- */
    function classificar() {
      const itens = U.embaralhar(d.itens);
      const escolhas = new Array(itens.length).fill(null);
      const verificar = el('button', { class: 'btn', type: 'button', disabled: true, text: 'Verificar' });
      const linhas = itens.map((item, i) => {
        const porque = el('p', { class: 'why' }),
          chips = el('div', { class: 'chips' });
        const linha = el(
          'div',
          { class: 'c-item', role: 'group', 'aria-label': item.texto },
          el('div', { class: 'text', text: item.texto }),
          chips,
          porque
        );
        d.categorias.forEach(cat =>
          chips.append(
            el('button', {
              class: 'chip',
              type: 'button',
              'aria-pressed': 'false',
              text: cat,
              onclick: e => {
                if (e.currentTarget.disabled) return;
                escolhas[i] = cat;
                chips
                  .querySelectorAll('.chip')
                  .forEach(c => c.setAttribute('aria-pressed', c.textContent === cat ? 'true' : 'false'));
                linha.classList.remove('wrong');
                porque.textContent = '';
                verificar.disabled = escolhas.some(x => x === null);
              }
            })
          )
        );
        return { linha, porque, item };
      });
      const travar = () =>
        linhas.forEach(({ linha }) => linha.querySelectorAll('.chip').forEach(c => (c.disabled = true)));
      verificar.addEventListener('click', () => {
        const r = handlers.avaliar({ itens, escolhas });
        if (!r) return;
        linhas.forEach(({ linha, porque }, i) => {
          const errado = r.erros && r.erros.includes(i);
          linha.classList.toggle('right', !errado);
          linha.classList.toggle('wrong', errado);
          porque.textContent = errado ? 'Reveja este item.' : '';
        });
        if (r.status === 'acerto') {
          travar();
          verificar.remove();
          feedback('ok', tituloAcerto(r.tentativasAntes), d.explicacao);
          terminou(r);
          return;
        }
        if (r.status === 'esgotou') {
          linhas.forEach(({ linha, porque, item }) => {
            linha.classList.remove('wrong');
            linha.classList.add('right');
            linha.querySelectorAll('.chip').forEach(c => {
              c.disabled = true;
              c.setAttribute('aria-pressed', c.textContent === item.correta ? 'true' : 'false');
            });
            porque.textContent = `${item.correta}: ${item.porque}`;
          });
          verificar.remove();
          feedback('reveal', 'Vamos ver a resposta', d.explicacao);
          terminou(r);
        } else
          feedback(
            'bad',
            r.erros.length === 1 ? '1 item ainda está errado' : `${r.erros.length} itens ainda estão errados`,
            'Os itens marcados em vermelho precisam de outra classificação.',
            d.explicacao,
            restantes(r.restantes)
          );
      });
      return el(
        'div',
        {},
        el(
          'div',
          { class: 'classify' },
          linhas.map(l => l.linha)
        ),
        el('div', { class: 'actions' }, verificar)
      );
    }

    /* ---------- selecionar (backlog) ---------- */
    function selecionar() {
      const sel = new Set();
      const barra = el('span', { style: 'width:0%' });
      const capBar = el('div', { class: 'cap-bar', 'aria-hidden': 'true' }, barra);
      const total = el('span', { text: `0 de ${d.capacidade} pontos` });
      const verificar = el('button', { class: 'btn', type: 'button', disabled: true, text: 'Confirmar a Sprint' });
      const atualizar = () => {
        const s = d.itens.filter(i => sel.has(i.id)).reduce((a, i) => a + i.pontos, 0);
        total.textContent = `${s} de ${d.capacidade} pontos`;
        barra.style.width = Math.min(100, (s / d.capacidade) * 100) + '%';
        capBar.classList.toggle('over', s > d.capacidade);
        verificar.disabled = sel.size === 0;
      };
      const cartoes = d.itens.map((item, i) =>
        el(
          'button',
          {
            class: 'pbi',
            type: 'button',
            'aria-pressed': 'false',
            onclick: e => {
              if (e.currentTarget.disabled) return;
              sel.has(item.id) ? sel.delete(item.id) : sel.add(item.id);
              e.currentTarget.setAttribute('aria-pressed', sel.has(item.id) ? 'true' : 'false');
              areaFeedback.replaceChildren();
              atualizar();
            }
          },
          el('span', { class: 'prio', text: `#${i + 1}` }),
          el('span', { text: item.texto }),
          el('span', { class: 'pts', text: `${item.pontos} pts` })
        )
      );
      verificar.addEventListener('click', () => {
        const r = handlers.avaliar([...sel]);
        if (!r) return;
        if (r.status === 'acerto') {
          cartoes.forEach(c => (c.disabled = true));
          verificar.remove();
          feedback('ok', tituloAcerto(r.tentativasAntes), d.explicacao);
          terminou(r);
          return;
        }
        if (r.status === 'esgotou') {
          const esp = new Set(d.esperado);
          cartoes.forEach((c, i) => {
            c.disabled = true;
            c.setAttribute('aria-pressed', esp.has(d.itens[i].id) ? 'true' : 'false');
          });
          sel.clear();
          d.esperado.forEach(x => sel.add(x));
          atualizar();
          verificar.remove();
          feedback('reveal', 'Vamos ver a resposta', r.motivo, d.explicacao);
          terminou(r);
        } else feedback('bad', 'Essa Sprint ainda não está boa', r.motivo, restantes(r.restantes));
      });
      return el(
        'div',
        {},
        el('div', { class: 'capacity' }, el('span', { text: 'Capacidade da equipe' }), capBar, total),
        el('div', { class: 'backlog', role: 'group', 'aria-label': 'Product Backlog' }, cartoes),
        el('div', { class: 'actions' }, verificar)
      );
    }

    /* ---------- ordenar ---------- */
    function ordenar() {
      let resto = U.embaralhar(d.itens);
      if (resto.every((x, i) => x === d.itens[i])) resto.reverse();
      let seq = [],
        marcas = null,
        travado = false;
      const origem = el('ul', { class: 'order-list', 'aria-label': 'Etapas disponíveis' });
      const destino = el('ol', { class: 'order-list target', 'aria-label': 'Sua ordem' });
      const verificar = el('button', { class: 'btn', type: 'button', disabled: true, text: 'Verificar a ordem' });
      const limpar = el('button', { class: 'btn ghost small', type: 'button', text: 'Recomeçar' });
      function render() {
        origem.replaceChildren(
          ...(resto.length
            ? resto.map(t =>
                el(
                  'li',
                  {},
                  el(
                    'button',
                    {
                      class: 'o-item',
                      type: 'button',
                      'aria-label': 'Adicionar: ' + t,
                      onclick: () => {
                        if (travado) return;
                        marcas = null;
                        resto = resto.filter(x => x !== t);
                        seq.push(t);
                        render();
                      }
                    },
                    t
                  )
                )
              )
            : [el('li', { class: 'empty-slot', text: 'Todas as etapas foram posicionadas.' })])
        );
        destino.replaceChildren(
          ...(seq.length
            ? seq.map((t, i) =>
                el(
                  'li',
                  {},
                  el(
                    'button',
                    {
                      class: 'o-item' + (marcas ? (marcas[i] ? ' right' : ' wrong') : ''),
                      type: 'button',
                      'aria-label': 'Remover: ' + t,
                      onclick: () => {
                        if (travado) return;
                        marcas = null;
                        seq = seq.filter(x => x !== t);
                        resto.push(t);
                        render();
                      }
                    },
                    t
                  )
                )
              )
            : [el('li', { class: 'empty-slot', text: 'Clique nas etapas, na ordem certa.' })])
        );
        verificar.disabled = resto.length > 0 || travado;
      }
      limpar.addEventListener('click', () => {
        if (travado) return;
        resto = U.embaralhar(d.itens);
        seq = [];
        marcas = null;
        areaFeedback.replaceChildren();
        render();
      });
      verificar.addEventListener('click', () => {
        const r = handlers.avaliar(seq.slice());
        if (!r) return;
        marcas = r.marcas;
        if (r.status === 'acerto') {
          travado = true;
          verificar.remove();
          limpar.remove();
          feedback('ok', tituloAcerto(r.tentativasAntes), d.explicacao);
          terminou(r);
          render();
          return;
        }
        if (r.status === 'esgotou') {
          travado = true;
          seq = d.itens.slice();
          resto = [];
          marcas = seq.map(() => true);
          verificar.remove();
          limpar.remove();
          feedback('reveal', 'Vamos ver a resposta', d.explicacao);
          terminou(r);
          render();
        } else {
          render();
          feedback(
            'bad',
            `${r.certos} de ${d.itens.length} etapas na posição certa`,
            'As etapas em vermelho estão fora do lugar. Clique nelas para devolvê-las e tente de novo.',
            restantes(r.restantes)
          );
        }
      });
      render();
      return el(
        'div',
        {},
        el(
          'div',
          { class: 'order-zone' },
          el('div', { class: 'order-col' }, el('h3', { text: 'Etapas' }), origem),
          el('div', { class: 'order-col' }, el('h3', { text: 'Sua ordem' }), destino)
        ),
        el('div', { class: 'actions' }, verificar, limpar)
      );
    }

    const corpo = { escolha, classificar, selecionar, ordenar }[d.tipo]();
    container.replaceChildren(
      el(
        'div',
        { class: 'challenge-top' },
        el('span', { class: 'muted', text: `${sala} · Desafio ${indice + 1} de ${total}` }),
        el(
          'div',
          { class: 'dots', 'aria-hidden': 'true' },
          Array.from({ length: total }, (_, i) =>
            el('span', { class: i < indice ? 'done' : i === indice ? 'now' : '' })
          )
        )
      ),
      el('p', { class: 'prompt', text: d.enunciado }),
      extras,
      corpo,
      areaFeedback,
      areaAcoes
    );
  }

  function resumo(container, { missao, res, primeiraVez, xpGanho, subiu, nivel, proxima, modulo }, handlers) {
    container.replaceChildren(
      el(
        'section',
        { class: 'summary' },
        el(
          'div',
          { class: 'big-stars', role: 'img', 'aria-label': `${res.estrelas} de 3 estrelas` },
          '★'.repeat(res.estrelas),
          el('span', { class: 'off', text: '★'.repeat(3 - res.estrelas) })
        ),
        el('h2', { text: missao.titulo }),
        el('p', {
          class: 'muted',
          text:
            res.estrelas === 3
              ? 'Excelente: você dominou esta etapa.'
              : res.estrelas === 2
                ? 'Bom trabalho! Revise a trilha para acertar ainda mais de primeira.'
                : 'Missão concluída. Vale revisar este tema na trilha antes de seguir.'
        }),
        primeiraVez
          ? el(
              'div',
              { class: 'reward' },
              el('span', { class: 'icon', 'aria-hidden': 'true', text: missao.item.icone }),
              `Você ganhou: ${missao.item.nome}`
            )
          : null,
        el(
          'div',
          { class: 'facts' },
          el('div', { class: 'fact' }, el('strong', { text: '+' + xpGanho }), el('span', { text: 'XP' })),
          el(
            'div',
            { class: 'fact' },
            el('strong', { text: `${res.acertosPrimeira}/${res.total}` }),
            el('span', { text: 'de primeira' })
          ),
          el(
            'div',
            { class: 'fact' },
            el('strong', { text: U.formatarTempo(res.tempoSegundos * 1000) }),
            el('span', { text: 'de missão' })
          )
        ),
        subiu ? el('p', { style: { fontWeight: 700 }, text: `Você subiu de nível: ${nivel}!` }) : null,
        !primeiraVez
          ? el('p', { class: 'muted', text: 'Você já tinha concluído esta missão. Vale a sua melhor pontuação.' })
          : null,
        el(
          'div',
          { class: 'context', style: { textAlign: 'left', maxWidth: '36em', margin: '1rem auto' } },
          el('p', {}, el('strong', { text: missao.npc + ': ' }), missao.falaFim),
          primeiraVez && proxima ? el('p', { class: 'muted', text: `A porta da ${proxima.sala} foi liberada.` }) : null
        ),
        el(
          'div',
          { class: 'actions', style: { justifyContent: 'center' } },
          el('button', { class: 'btn', onclick: handlers.voltar, text: 'Voltar ao escritório' }),
          res.estrelas < 3
            ? el('button', { class: 'btn ghost', onclick: handlers.revisar, text: `Revisar "${modulo.titulo}"` })
            : null
        )
      )
    );
  }

  return { desafio, resumo };
})();
