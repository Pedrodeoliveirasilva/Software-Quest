/* =================================================================
   CONTROLLER / ALUNO / PERFIL — "Meu personagem": foto, cor e especialidade
   ================================================================= */
window.SQ = window.SQ || {};
SQ.controllers = SQ.controllers || {};
SQ.controllers.aluno = SQ.controllers.aluno || {};

SQ.controllers.aluno.Perfil = function (ctx) {
  const { perfil, R, overlay, toast } = ctx;

  function abrir() {
    const janela = overlay.abrir('Meu personagem');
    SQ.views.Perfil(
      janela.corpo,
      { perfil },
      {
        // a foto é salva na hora; se o servidor recusar, o erro aparece no próprio seletor
        async mudarFoto(foto) {
          try {
            perfil.avatar.foto = await R.definirFoto(perfil, foto);
          } catch (e) {
            throw new Error(R.mensagemErro(e), { cause: e });
          }
          ctx.view.hud(perfil);
          ctx.mundoView.atualizarAvatar();
          toast(foto ? 'Foto atualizada.' : 'Foto removida.');
        },
        salvar({ cor, classe }) {
          perfil.avatar.cor = cor;
          perfil.avatar.classe = classe;
          ctx.salvar(true);
          ctx.view.hud(perfil);
          ctx.mundoView.atualizarAvatar();
          toast('Personagem salvo.');
          overlay.fechar();
        },
        fechar: () => overlay.fechar()
      }
    );
  }

  return { abrir };
};
