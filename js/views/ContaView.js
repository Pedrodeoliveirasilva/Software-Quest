/* =================================================================
   VIEW / CONTA — "Minha conta" do professor: foto, nome e escola
   A foto é salva na hora (handlers.mudarFoto); nome e escola, no botão Salvar.
   ================================================================= */
window.SQ = window.SQ || {};
SQ.views = SQ.views || {};

SQ.views.Conta = function (container, { prof }, handlers) {
  const html = SQ.html;
  const componentes = SQ.views.componentes;

  /* ---------- Montagem ---------- */
  const seletorFoto = componentes.seletorFoto({
    foto: prof.foto,
    cor: '#6B3FD6',
    texto: prof.nome,
    dica: 'Aparece no seu painel.',
    onMudar: handlers.mudarFoto
  });

  const tela = html` <form class="form-grid" style="max-width: 560px" onsubmit=${enviar}>
    <div class="field">
      <label>Foto</label>
      ${seletorFoto}
    </div>
    <div class="field">
      <label for="conta-nome">Nome</label>
      <input id="conta-nome" maxlength="80" value="${prof.nome || ''}" autocomplete="name" data-ref="nome" />
    </div>
    <div class="field">
      <label for="conta-escola">Escola</label>
      <input
        id="conta-escola"
        maxlength="80"
        value="${prof.escola || ''}"
        autocomplete="organization"
        data-ref="escola"
      />
    </div>
    <p class="muted" style="margin: 0">E-mail: ${prof.email || ''}</p>
    <p class="error-msg" role="alert" data-ref="erro"></p>
    <div class="actions" style="margin-top: 0">
      <button class="btn" type="submit" data-ref="salvar">Salvar</button>
      <button class="btn ghost small" type="button" onclick=${handlers.fechar}>Fechar</button>
    </div>
  </form>`;
  const refs = html.refs(tela);
  container.replaceChildren(tela);

  /* ---------- Eventos ---------- */
  async function enviar(evento) {
    evento.preventDefault();
    refs.erro.textContent = '';
    refs.salvar.disabled = true;
    try {
      await handlers.salvar({ nome: refs.nome.value, escola: refs.escola.value });
    } catch (x) {
      refs.erro.textContent = x.message;
    }
    refs.salvar.disabled = false;
  }
};
