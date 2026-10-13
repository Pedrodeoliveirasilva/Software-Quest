/* =================================================================
   CONTROLLER / ALUNO / MISSÃO — jogar uma missão
   Cria o MissaoModel, mostra cada desafio na MissaoView, aplica a perda de
   qualidade a cada erro, registra os eventos de pesquisa e, no fim,
   atualiza o perfil (XP, estrelas, itens) e mostra o resumo.
   ================================================================= */
window.SQ = window.SQ || {};
SQ.controllers = SQ.controllers || {};
SQ.controllers.aluno = SQ.controllers.aluno || {};

SQ.controllers.aluno.Missao = function (ctx) {
  const { perfil, P, D, overlay } = ctx;
  const V = SQ.views.Missao;

  function abrir(i) {
    const m = D.missoes[i];
    const repeticao = !!perfil.missoes[m.id];
    const missao = SQ.models.Missao(m, perfil);
    let terminou = false;
    const janela = overlay.abrir(m.titulo, {
      antesDeFechar: async () => terminou || confirm('Sair da missão agora? O progresso desta missão será perdido.')
    });
    const area = SQ.html.elemento`<div></div>`;
    janela.corpo.replaceChildren(area);

    function mostrarDesafio() {
      V.desafio(
        area,
        { desafio: missao.desafio, indice: missao.indice, total: missao.total, sala: m.sala, ultimo: missao.ultimo },
        {
          avaliar(resposta) {
            const r = missao.avaliar(resposta);
            if (!r) return null;
            if (r.status !== 'acerto') {
              P.registrarErro(perfil);
              ctx.view.hud(perfil);
              ctx.salvar();
            }
            if (r.registro) ctx.evento({ ...r.registro, repeticao });
            return r;
          },
          proximo() {
            if (missao.ultimo) return finalizar();
            missao.avancar();
            mostrarDesafio();
            overlay.rolarTopo();
          }
        }
      );
    }

    function finalizar() {
      terminou = true;
      const res = missao.resultado();
      const out = P.concluirMissao(perfil, m, res);
      ctx.evento({
        tipo: 'missao',
        faseId: m.id,
        fase: m.nome,
        pontos: res.pontos,
        estrelas: res.estrelas,
        acertosPrimeira: res.acertosPrimeira,
        tentativas: null,
        tempoSegundos: res.tempoSegundos,
        dataHora: new Date().toISOString(),
        repeticao: !out.primeiraVez
      });
      ctx.salvar(true);
      ctx.view.hud(perfil);
      ctx.avisarNivel(out);
      janela.titulo$.textContent = 'Missão concluída';
      V.resumo(
        janela.corpo,
        { missao: m, res, ...out, nivel: P.nivelDe(perfil.xp).nome, proxima: D.missoes[i + 1], modulo: P.modulo(m.id) },
        { voltar: () => overlay.fechar(), revisar: () => ctx.trilha.abrir(m.id) }
      );
      overlay.rolarTopo();
    }

    mostrarDesafio();
  }

  return { abrir };
};
