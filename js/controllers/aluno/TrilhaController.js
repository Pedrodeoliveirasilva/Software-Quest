/* =================================================================
   CONTROLLER / ALUNO / TRILHA — estudar as lições
   ================================================================= */
window.SQ = window.SQ || {};
SQ.controllers = SQ.controllers || {};
SQ.controllers.aluno = SQ.controllers.aluno || {};

SQ.controllers.aluno.Trilha = function (ctx) {
  const { perfil, P, D, overlay, toast } = ctx;
  const V = SQ.views.Trilha;

  /** Abre a lista de módulos; "foco" rola até o módulo de uma fase (ex.: 'testes'). */
  function abrir(foco) {
    const janela = overlay.abrir('Trilha de aprendizagem');
    V.lista(
      janela.corpo,
      { modulos: D.trilha, missoes: D.missoes, perfil, recomendacao: P.recomendacao(perfil), foco },
      { abrirLicao }
    );
  }

  function abrirLicao(mod, licao) {
    const janela = overlay.atual;
    if (!janela) return;
    janela.titulo$.textContent = SQ.util.capitalizar(licao.titulo.replace('Aprofundamento: ', ''));
    const inicio = Date.now();
    V.licao(
      janela.corpo,
      { mod, licao, jaFeita: !!perfil.licoes[licao.id] },
      {
        concluir({ acertouPrimeira, tentativas }) {
          const r = P.concluirLicao(perfil, licao, acertouPrimeira);
          if (!r.jaFeita) {
            ctx.evento({
              tipo: 'licao',
              faseId: mod.fase,
              fase: D.missoes.find(m => m.id === mod.fase).nome,
              licaoId: licao.id,
              tentativas,
              acertou: true,
              acertouPrimeira,
              pontos: r.xp,
              tempoSegundos: Math.round((Date.now() - inicio) / 1000),
              dataHora: new Date().toISOString()
            });
            ctx.salvar(true);
            ctx.view.hud(perfil);
            toast(`Lição concluída: +${r.xp} XP`);
            ctx.avisarNivel(r);
          }
          abrir(mod.fase);
        },
        voltar: () => abrir(mod.fase)
      }
    );
    overlay.rolarTopo();
  }

  return { abrir };
};
