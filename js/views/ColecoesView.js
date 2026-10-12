/* =================================================================
   VIEW / COLEÇÕES — diário de missões, mochila e ranking da turma
   ================================================================= */
window.SQ = window.SQ || {};
SQ.views = SQ.views || {};

SQ.views.Colecoes = (function () {
  const el = SQ.dom.el,
    U = SQ.util;

  function missoes(container, { missoes, perfil, status }, handlers) {
    container.replaceChildren(
      el(
        'div',
        { class: 'quests' },
        missoes.map((m, i) => {
          const st = status(i),
            r = perfil.missoes[m.id];
          return el(
            'div',
            { class: 'quest' + (st === 'concluida' ? ' done' : st === 'disponivel' ? ' current' : '') },
            el('span', { class: 'n', text: st === 'concluida' ? '✓' : i + 1 }),
            el(
              'div',
              {},
              el('strong', { text: m.titulo }),
              el('div', { class: 'muted', style: { fontSize: '.9rem' }, text: `${m.npc} · ${m.sala}` })
            ),
            st === 'concluida'
              ? el('span', { class: 'stars', 'aria-label': `${r.estrelas} estrelas`, text: U.estrelas(r.estrelas) })
              : st === 'disponivel'
                ? el('button', { class: 'btn small', onclick: () => handlers.irAte(m), text: 'Ir até lá' })
                : el('span', { class: 'muted', style: { fontSize: '.9rem' }, text: 'Bloqueada' })
          );
        })
      )
    );
  }

  function mochila(container, { missoes, perfil, nivel, estrelas }) {
    container.replaceChildren(
      el(
        'div',
        { class: 'facts', style: { maxWidth: 'none', gridTemplateColumns: 'repeat(4, 1fr)' } },
        el('div', { class: 'fact' }, el('strong', { text: nivel }), el('span', { text: 'nível' })),
        el('div', { class: 'fact' }, el('strong', { text: perfil.xp }), el('span', { text: 'XP' })),
        el(
          'div',
          { class: 'fact' },
          el('strong', { text: `${estrelas}/${missoes.length * 3}` }),
          el('span', { text: 'estrelas' })
        ),
        el(
          'div',
          { class: 'fact' },
          el('strong', { text: `${Object.keys(perfil.licoes).length}` }),
          el('span', { text: 'lições' })
        )
      ),
      el('h3', { style: { margin: '1rem 0 .6rem' }, text: 'Itens conquistados' }),
      el(
        'div',
        { class: 'inv' },
        missoes.map(m => {
          const tem = perfil.itens.includes(m.id);
          return el(
            'div',
            { class: 'inv-item' + (tem ? '' : ' off') },
            el('div', { class: 'icon', 'aria-hidden': 'true', text: tem ? m.item.icone : '?' }),
            el('strong', { text: tem ? m.item.nome : 'Item bloqueado' }),
            el('span', { class: 'muted', style: { fontSize: '.85rem' }, text: tem ? m.nome : `Missão: ${m.nome}` })
          );
        })
      )
    );
  }

  function rankingCarregando(container, turma) {
    container.replaceChildren(
      el('p', {
        class: 'muted',
        text: `${turma}. O ranking mostra apenas apelidos e conta a sua melhor pontuação em cada missão.`
      }),
      el('div', { class: 'rank-area' }, el('p', { class: 'empty', text: 'Carregando ranking…' }))
    );
  }
  function ranking(container, { lista, uid, erro }) {
    const area = container.querySelector('.rank-area');
    if (erro) {
      area.replaceChildren(el('p', { class: 'error-msg', text: 'Não foi possível carregar o ranking: ' + erro }));
      return;
    }
    const pos = lista.findIndex(d => d.uid === uid);
    area.replaceChildren(
      pos >= 0 ? el('p', { text: `Sua posição: ${pos + 1}º de ${lista.length}` }) : null,
      el(
        'ol',
        { class: 'rank' },
        lista
          .slice(0, 30)
          .map((d, k) =>
            el(
              'li',
              { class: d.uid === uid ? 'me' : '' },
              el('span', { class: 'pos', text: k + 1 + 'º' }),
              SQ.dom.avatar({ foto: d.avatar && d.avatar.foto, cor: d.avatar && d.avatar.cor, texto: d.apelido }),
              el(
                'div',
                {},
                el('strong', { text: d.apelido + (d.uid === uid ? ' (você)' : '') }),
                el('div', { class: 'sub', text: `${d.nivel} · ${d.missoes || 0}/7 missões` })
              ),
              el('span', { class: 'xp', text: d.xp + ' XP' })
            )
          )
      ),
      pos >= 30
        ? el('p', { class: 'muted', text: `Você está em ${pos + 1}º lugar. Continue jogando para subir!` })
        : null
    );
  }

  return { missoes, mochila, rankingCarregando, ranking };
})();
