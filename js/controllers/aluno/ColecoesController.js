/* =================================================================
   CONTROLLER / ALUNO / COLEÇÕES — diário de missões, mochila e ranking
   ================================================================= */
window.SQ = window.SQ || {};
SQ.controllers = SQ.controllers || {};
SQ.controllers.aluno = SQ.controllers.aluno || {};

SQ.controllers.aluno.Colecoes = function (ctx) {
  const { perfil, P, D, R, overlay } = ctx;
  const V = SQ.views.Colecoes;

  return {
    abrirMissoes() {
      const janela = overlay.abrir('Missões');
      V.missoes(
        janela.corpo,
        { missoes: D.missoes, perfil, status: i => P.statusMissao(perfil, i) },
        {
          irAte: m => {
            overlay.fechar();
            ctx.mundo.irAte('npc-' + m.id);
          }
        }
      );
    },
    abrirMochila() {
      const janela = overlay.abrir('Mochila');
      V.mochila(janela.corpo, {
        missoes: D.missoes,
        perfil,
        nivel: P.nivelDe(perfil.xp).nome,
        estrelas: P.totalEstrelas(perfil)
      });
    },
    async abrirRanking() {
      const janela = overlay.abrir('Ranking da turma');
      V.rankingCarregando(janela.corpo, perfil.turma);
      try {
        await ctx.salvar(true);
        V.ranking(janela.corpo, { lista: await R.ranking(perfil.turmaId), uid: perfil.uid });
      } catch (e) {
        V.ranking(janela.corpo, { erro: R.mensagemErro(e) });
      }
    }
  };
};
