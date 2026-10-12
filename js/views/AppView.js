/* =================================================================
   VIEW / APP — telas gerais: carregando e erro
   ================================================================= */
window.SQ = window.SQ || {};
SQ.views = SQ.views || {};

SQ.views.App = {
  carregando(raiz) {
    raiz.replaceChildren(SQ.html`<p class="empty">Carregando…</p>`);
  },

  /** Tela de erro com título, mensagem, detalhe opcional e um botão opcional ({ texto, fn }). */
  erro(raiz, { titulo, mensagem, detalhe, acao }) {
    const html = SQ.html;
    raiz.replaceChildren(
      html` <main class="wrap">
        <div class="card">
          <h2 style="margin-bottom: .6rem">${titulo}</h2>
          <p>${mensagem}</p>
          ${detalhe ? html`<p class="muted">${detalhe}</p>` : null}
          ${acao ? html`<button class="btn" onclick=${acao.fn}>${acao.texto}</button>` : null}
        </div>
      </main>`
    );
  }
};
