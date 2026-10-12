/* =================================================================
   VIEW / APP — telas gerais: carregando e erro
   ================================================================= */
window.SQ = window.SQ || {};
SQ.views = SQ.views || {};

SQ.views.App = {
  carregando(raiz) {
    raiz.replaceChildren(SQ.dom.el('p', { class: 'empty', text: 'Carregando…' }));
  },
  erro(raiz, { titulo, mensagem, detalhe, acao }) {
    const el = SQ.dom.el;
    raiz.replaceChildren(
      el(
        'main',
        { class: 'wrap' },
        el(
          'div',
          { class: 'card' },
          el('h2', { text: titulo, style: { marginBottom: '.6rem' } }),
          el('p', { text: mensagem }),
          detalhe ? el('p', { class: 'muted', text: detalhe }) : null,
          acao ? el('button', { class: 'btn', onclick: acao.fn, text: acao.texto }) : null
        )
      )
    );
  }
};
