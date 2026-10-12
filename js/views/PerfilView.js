/* =================================================================
   VIEW / PERFIL — "Meu personagem": foto, cor e especialidade do aluno
   A foto é salva na hora (handlers.mudarFoto); cor e especialidade, no botão Salvar.
   ================================================================= */
window.SQ = window.SQ || {};
SQ.views = SQ.views || {};

SQ.views.Perfil = function (container, { perfil }, handlers) {
  const html = SQ.html;
  const componentes = SQ.views.componentes;
  let cor = perfil.avatar.cor;
  let classe = perfil.avatar.classe;

  /* ---------- Montagem ---------- */
  const seletorFoto = componentes.seletorFoto({
    foto: perfil.avatar.foto,
    cor,
    texto: perfil.apelido,
    permitido: !!perfil.fotosPermitidas,
    mensagemBloqueio: 'Seu professor não liberou fotos nesta turma. Seu personagem usa a cor e a inicial do apelido.',
    dica: 'Use uma imagem que represente você: não precisa ser uma foto do seu rosto. Ela aparece no mapa e no ranking da turma.',
    onMudar: handlers.mudarFoto
  });
  const seletorCor = componentes.seletorCor(cor, c => (cor = c));
  const seletorClasse = componentes.seletorClasse(classe, c => (classe = c));

  container.replaceChildren(
    html` <div class="form-grid" style="max-width: 560px">
      <div class="field">
        <label>Foto</label>
        ${seletorFoto}
      </div>
      <div class="field">
        <label>Cor do personagem</label>
        ${seletorCor}
      </div>
      <div class="field">
        <label>Especialidade</label>
        ${seletorClasse}
      </div>
      <p class="muted" style="margin: 0">
        Apelido: ${perfil.apelido} · Usuário: ${perfil.usuario} · Turma: ${perfil.turma}
      </p>
      <div class="actions" style="margin-top: 0">
        <button class="btn" onclick=${() => handlers.salvar({ cor, classe })}>Salvar</button>
        <button class="btn ghost small" onclick=${handlers.fechar}>Fechar</button>
      </div>
    </div>`
  );
};
