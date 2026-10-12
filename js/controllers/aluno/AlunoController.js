/* =================================================================
   CONTROLLER / ALUNO — monta a experiência do aluno
   Cria as views e os models, guarda tudo num "contexto" (ctx) e liga os
   controllers de cada área, que ficam nesta mesma pasta:

     MundoController      andar pelo mapa e conversar com os personagens
     MissaoController     jogar uma missão
     TrilhaController     estudar as lições
     ColecoesController   diário de missões, mochila e ranking
     PerfilController     foto, cor e especialidade do personagem

   O ctx é o "caderno compartilhado": cada controller lê dele o que precisa
   (perfil, views, funções de salvar) e publica nele as próprias ações.
   ================================================================= */
window.SQ = window.SQ || {};
SQ.controllers = SQ.controllers || {};
SQ.controllers.aluno = SQ.controllers.aluno || {};

SQ.controllers.Aluno = {
  iniciar(raiz, perfil) {
    const R = SQ.models.Repositorio,
      P = SQ.models.Perfil,
      D = SQ.dados;
    const overlay = SQ.dom.overlay,
      toast = SQ.dom.toast;
    const ctx = { perfil, R, P, D, overlay, toast };

    /* ---------- persistência ---------- */
    // O progresso é salvo logo; a posição no mapa, com atraso maior, para economizar
    // gravações no banco de dados.
    let timerSalvar = null;
    ctx.salvar = (imediato, atraso = 900) => {
      clearTimeout(timerSalvar);
      const exec = () =>
        R.salvarPerfil(perfil).catch(() => toast('Não foi possível salvar seu progresso. Verifique a internet.'));
      if (imediato) return exec();
      timerSalvar = setTimeout(exec, atraso);
    };
    // Registro de pesquisa: cada desafio, lição e missão concluídos
    ctx.evento = dados =>
      R.registrarEvento({
        uid: perfil.uid,
        usuario: perfil.usuario,
        codigoPesquisa: perfil.codigoPesquisa || null,
        turmaId: perfil.turmaId,
        turma: perfil.turma,
        professorUid: perfil.professorUid,
        ...dados
      }).catch(() => {});
    ctx.avisarNivel = r => {
      if (r && r.subiu) setTimeout(() => toast(`Você subiu de nível: ${P.nivelDe(perfil.xp).nome}!`, 3500), 400);
    };

    /* ---------- views e models ---------- */
    const A = SQ.controllers.aluno;
    ctx.view = SQ.views.Aluno(raiz, {
      handlers: {
        onMenu: id =>
          ({
            trilha: () => ctx.trilha.abrir(),
            missoes: () => ctx.colecoes.abrirMissoes(),
            mochila: () => ctx.colecoes.abrirMochila(),
            ranking: () => ctx.colecoes.abrirRanking(),
            perfil: () => ctx.personagem.abrir(),
            sair: () => Promise.resolve(ctx.salvar(true)).finally(() => R.sair())
          })[id](),
        onDirecao: (dx, dy) => ctx.mundo.andar(dx, dy),
        onInteragir: () => ctx.mundo.interagirProximo(),
        onRecomendacao: modulo => ctx.trilha.abrir(modulo)
      }
    });
    ctx.mundoModel = SQ.models.Mundo(perfil, {
      portaAberta: n => P.portaAberta(perfil, n),
      statusMissao: i => P.statusMissao(perfil, i)
    });
    ctx.mundoView = SQ.views.Mundo(ctx.view.canvas, ctx.mundoModel, perfil, {
      onDirecao: (dx, dy) => ctx.mundo.andar(dx, dy),
      onTocar: (x, y) => ctx.mundo.tocar(x, y),
      onInteragir: () => ctx.mundo.interagirProximo()
    });

    /** Redesenha barra superior, painel lateral e mapa depois de qualquer mudança no progresso. */
    ctx.atualizarTudo = () => {
      ctx.view.hud(perfil);
      ctx.view.lateral({ objetivo: P.objetivo(perfil), recomendacao: P.recomendacao(perfil) });
      ctx.mundoModel.atualizar();
      ctx.mundoView.desenhar();
      ctx.mundo.reavisarProximo();
    };

    /* ---------- controllers de cada área ---------- */
    ctx.mundo = A.Mundo(ctx);
    ctx.missao = A.Missao(ctx);
    ctx.trilha = A.Trilha(ctx);
    ctx.colecoes = A.Colecoes(ctx);
    ctx.personagem = A.Perfil(ctx);

    // Enquanto uma janela está aberta, o mapa fica pausado
    overlay.aoAbrir = () => {
      ctx.mundoView.pausar(true);
      ctx.mundo.cancelarCaminho();
      ctx.view.fecharDialogo();
    };
    overlay.aoFechar = silencioso => {
      ctx.mundoView.pausar(false);
      if (!silencioso) {
        ctx.atualizarTudo();
        ctx.view.focarMapa();
      }
    };

    /* ---------- início ---------- */
    ctx.atualizarTudo();
    requestAnimationFrame(() => ctx.view.centralizar(ctx.mundoModel.jogador));
    perfil.ultimoAcesso = new Date().toISOString();
    ctx.salvar();
    if (!perfil.boasVindas) {
      perfil.boasVindas = true;
      ctx.salvar();
      setTimeout(() => ctx.mundo.boasVindas(), 300);
    }

    return {
      destruir() {
        clearTimeout(timerSalvar);
        ctx.mundo.cancelarCaminho();
        ctx.mundoView.destruir();
        overlay.aoAbrir = null;
        overlay.aoFechar = null;
      }
    };
  }
};
