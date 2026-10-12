/* =================================================================
   VIEW / ALUNO — estrutura da tela do aluno
   Barra superior (HUD), área do mapa, controles de toque, painel lateral,
   barra de interação e caixas de diálogo com personagens.
   ================================================================= */
window.SQ = window.SQ || {};
SQ.views = SQ.views || {};

SQ.views.Aluno = function (raiz, { handlers }) {
  const el = SQ.dom.el,
    U = SQ.util,
    P = SQ.models.Perfil;
  const $hud = el('header', { class: 'hud' });
  const $objetivo = el('div', { class: 'card objective' });
  const $reco = el('div', { class: 'card reco' });
  const $prompt = el('div', { class: 'prompt-bar', 'aria-live': 'polite' });
  const canvas = el('canvas', { tabindex: '0' });
  const rolagem = el('div', { class: 'canvas-scroll' }, canvas);
  const wrap = el('div', { class: 'canvas-wrap' }, rolagem, $prompt);
  let $dialogo = null;

  const dpad = el(
    'div',
    { class: 'dpad', 'aria-label': 'Controles de movimento' },
    el('button', { class: 'up', 'aria-label': 'Andar para cima', onclick: () => handlers.onDirecao(0, -1), text: '▲' }),
    el('button', {
      class: 'left',
      'aria-label': 'Andar para a esquerda',
      onclick: () => handlers.onDirecao(-1, 0),
      text: '◀'
    }),
    el('button', { class: 'act', onclick: () => handlers.onInteragir(), text: 'Falar' }),
    el('button', {
      class: 'right',
      'aria-label': 'Andar para a direita',
      onclick: () => handlers.onDirecao(1, 0),
      text: '▶'
    }),
    el('button', {
      class: 'down',
      'aria-label': 'Andar para baixo',
      onclick: () => handlers.onDirecao(0, 1),
      text: '▼'
    })
  );

  raiz.replaceChildren(
    $hud,
    el(
      'main',
      { class: 'wrap' },
      el(
        'div',
        { class: 'world' },
        el('div', {}, wrap, dpad),
        el(
          'aside',
          { class: 'side' },
          $objetivo,
          $reco,
          el(
            'div',
            { class: 'card' },
            el('h3', { text: 'Como jogar' }),
            el('p', {
              class: 'muted',
              style: { margin: 0, fontSize: '.95rem' },
              text: 'Ande com as setas (ou W, A, S, D) e aperte E para conversar. No celular ou com o mouse, toque no lugar para onde quer ir ou em uma pessoa para falar com ela. A Biblioteca abre a trilha de aprendizagem e o Mural mostra o ranking.'
            })
          )
        )
      )
    )
  );

  return {
    canvas,
    centralizar(pos) {
      const t = canvas.clientWidth / SQ.dados.mapa.linhas[0].length;
      rolagem.scrollLeft = (pos.x + 0.5) * t - rolagem.clientWidth / 2;
    },
    focarMapa() {
      canvas.focus({ preventScroll: true });
    },

    hud(perfil) {
      const n = P.nivelDe(perfil.xp),
        q = Math.round(perfil.qualidade);
      const faltam = n.proximo ? `${n.proximo.xp - perfil.xp} XP para ${n.proximo.nome}` : 'Nível máximo';
      $hud.replaceChildren(
        el(
          'div',
          { class: 'hud-inner' },
          el(
            'div',
            { class: 'who' },
            SQ.dom.avatar({ foto: perfil.avatar.foto, cor: perfil.avatar.cor, texto: perfil.apelido }),
            el(
              'div',
              {},
              el('div', { class: 'nick', text: perfil.apelido }),
              el('div', { class: 'lvl', text: `${n.nome} · ${U.classes[perfil.avatar.classe].nome} · ${perfil.turma}` })
            )
          ),
          el(
            'div',
            { class: 'xpbar' },
            el('div', { class: 'stat' }, el('strong', { text: perfil.xp }), 'XP'),
            el(
              'div',
              {
                class: 'bar',
                role: 'progressbar',
                'aria-valuenow': Math.round(n.pct * 100),
                'aria-valuemin': 0,
                'aria-valuemax': 100,
                'aria-label': faltam
              },
              el('span', { style: { width: n.pct * 100 + '%' } })
            ),
            el('small', { text: faltam })
          ),
          el(
            'span',
            { class: 'stat', title: 'Cada erro reduz a qualidade do projeto' },
            'Qualidade',
            el(
              'span',
              { class: 'meter' + (q < 50 ? ' low' : q < 75 ? ' warn' : '') },
              el('span', { style: { width: q + '%' } })
            ),
            el('strong', { text: q + '%' })
          ),
          el(
            'nav',
            { class: 'nav', 'aria-label': 'Menu' },
            [
              ['trilha', 'Trilha'],
              ['missoes', 'Missões'],
              ['mochila', 'Mochila'],
              ['ranking', 'Ranking'],
              ['perfil', 'Personagem'],
              ['sair', 'Sair']
            ].map(([id, t]) => el('button', { onclick: () => handlers.onMenu(id), text: t }))
          )
        )
      );
    },

    lateral({ objetivo, recomendacao }) {
      $objetivo.replaceChildren(
        el('h3', { text: 'Objetivo atual' }),
        el('p', { style: { margin: 0 }, text: objetivo })
      );
      $reco.replaceChildren(
        el('h3', { text: 'Recomendado para você' }),
        el('p', { text: recomendacao.texto }),
        recomendacao.modulo
          ? el('button', {
              class: 'btn small',
              onclick: () => handlers.onRecomendacao(recomendacao.modulo),
              text: 'Abrir na trilha'
            })
          : null
      );
    },

    prompt(alvo, objetivo) {
      $prompt.replaceChildren(
        alvo
          ? el('span', {}, el('strong', { text: alvo.nome }), ` · ${alvo.papel}`)
          : el('span', { class: 'muted', text: objetivo }),
        alvo
          ? el('button', {
              class: 'btn small',
              onclick: () => handlers.onInteragir(),
              text: alvo.tipo === 'npc' ? 'Conversar (E)' : 'Abrir (E)'
            })
          : null
      );
    },

    /* Diálogo com várias falas; as escolhas aparecem na última fala. */
    dialogo(quem, falas, escolhas) {
      this.fecharDialogo();
      let i = 0;
      const caixa = el('div', { class: 'dialog-box', role: 'dialog', 'aria-label': 'Conversa com ' + quem.nome });
      const passo = () => {
        const ultima = i === falas.length - 1;
        caixa.replaceChildren(
          el(
            'div',
            { class: 'speaker' },
            el('span', {
              class: 'dot-avatar',
              style: { background: quem.cor || '#6B3FD6' },
              'aria-hidden': 'true',
              text: quem.nome.slice(0, 1)
            }),
            el('div', {}, el('strong', { text: quem.nome }), el('span', { text: ' · ' + quem.papel }))
          ),
          el('p', { text: falas[i] }),
          el(
            'div',
            { class: 'choices' },
            ultima
              ? escolhas.map((c, k) =>
                  el('button', {
                    class: 'btn small' + (k ? ' ghost' : ''),
                    onclick: () => {
                      this.fecharDialogo();
                      c.acao();
                    },
                    text: c.texto
                  })
                )
              : el('button', {
                  class: 'btn small',
                  onclick: () => {
                    i++;
                    passo();
                  },
                  text: 'Continuar'
                })
          )
        );
        const b = caixa.querySelector('button');
        if (b) setTimeout(() => b.focus({ preventScroll: true }), 20);
      };
      passo();
      wrap.append(caixa);
      $dialogo = caixa;
    },
    fecharDialogo() {
      if ($dialogo) {
        $dialogo.remove();
        $dialogo = null;
      }
    }
  };
};
