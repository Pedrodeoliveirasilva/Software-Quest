/* =================================================================
   CONTROLLER / ALUNO / MUNDO — andar pelo mapa e conversar
   Recebe teclas, toques e o botão "Falar"; usa o MundoModel para decidir
   se o passo é possível e a MundoView para animar. Abre as conversas com
   os personagens e, a partir delas, as missões e a trilha.
   ================================================================= */
window.SQ = window.SQ || {};
SQ.controllers = SQ.controllers || {};
SQ.controllers.aluno = SQ.controllers.aluno || {};

SQ.controllers.aluno.Mundo = function (ctx) {
  const { perfil, P, D, toast } = ctx;
  const modelo = () => ctx.mundoModel,
    tela = () => ctx.mundoView;

  /* ---------- aviso de quem está por perto (barra abaixo do mapa) ---------- */
  let ultimoProximo;
  function avisarProximo() {
    const alvo = modelo().alvoProximo();
    if (alvo !== ultimoProximo) {
      ultimoProximo = alvo;
      ctx.view.prompt(alvo, P.objetivo(perfil));
    }
  }
  const avisarPorta = n =>
    toast(`Porta trancada. Conclua a missão de ${D.missoes[n - 2].nome} para liberar a ${D.missoes[n - 1].sala}.`);

  /* ---------- movimento passo a passo ---------- */
  let caminho = [],
    alvoFinal = null,
    timerPasso = null;
  function cancelarCaminho() {
    caminho = [];
    alvoFinal = null;
    clearTimeout(timerPasso);
  }

  function passo(dx, dy, fim) {
    if (tela().pausado || tela().animando) return fim && fim(false);
    const r = modelo().mover(dx, dy);
    if (!r.ok) {
      if (r.portaTrancada) avisarPorta(r.portaTrancada);
      tela().desenhar();
      avisarProximo();
      return fim && fim(false);
    }
    tela().animarPasso(r.de, r.para, () => {
      perfil.posicao = r.para;
      ctx.salvar(false, 20000);
      ctx.view.fecharDialogo();
      ctx.view.centralizar(r.para);
      avisarProximo();
      fim && fim(true);
    });
  }

  /* ---------- caminho até um ponto tocado ---------- */
  function seguir(plano) {
    caminho = plano.passos.slice();
    alvoFinal = plano.alvo;
    proximoPasso();
  }
  function proximoPasso() {
    clearTimeout(timerPasso);
    if (!caminho.length) {
      const a = alvoFinal;
      alvoFinal = null;
      if (a && a.ent) {
        modelo().virarPara(a.ent);
        tela().desenhar();
        avisarProximo();
        conversar(a.ent);
      } else if (a && a.porta) avisarPorta(a.porta);
      return;
    }
    const [nx, ny] = caminho.shift();
    passo(nx - modelo().jogador.x, ny - modelo().jogador.y, ok => {
      if (ok) timerPasso = setTimeout(proximoPasso, 10);
      else cancelarCaminho();
    });
  }

  /* ---------- conversas ---------- */
  function conversar(alvo) {
    if (alvo.acao === 'trilha') return ctx.trilha.abrir();
    if (alvo.acao === 'ranking') return ctx.colecoes.abrirRanking();
    if (alvo.acao === 'mentora') {
      const r = P.recomendacao(perfil);
      return ctx.view.dialogo(
        alvo,
        [P.objetivo(perfil), r.texto],
        [
          r.modulo
            ? { texto: 'Abrir a trilha', acao: () => ctx.trilha.abrir(r.modulo) }
            : { texto: 'Ver missões', acao: () => ctx.colecoes.abrirMissoes() },
          { texto: 'Valeu, Ana!', acao: () => {} }
        ]
      );
    }
    if (alvo.acao === 'dica') {
      const dicas = [
        'Sabia que o medidor de qualidade é como a dívida técnica do projeto? Cada erro deixa o sistema mais difícil de manter.',
        'Na dúvida, releia as dicas da trilha antes da missão. Acertar de primeira vale 100 XP!',
        'O Mural no corredor mostra o ranking da turma. Dá para rejogar missões para melhorar as estrelas.'
      ];
      return ctx.view.dialogo(
        alvo,
        ['Oi! Eu sou a Duda, estagiária aqui na DevNova.', dicas[Math.floor(Math.random() * dicas.length)]],
        [{ texto: 'Obrigado(a)!', acao: () => {} }]
      );
    }
    // personagem de missão
    const i = alvo.missao,
      m = D.missoes[i],
      feita = perfil.missoes[m.id],
      mod = P.modulo(m.id);
    if (feita) {
      return ctx.view.dialogo(
        alvo,
        [
          `Você já concluiu esta missão com ${feita.estrelas} de 3 estrelas.`,
          'Quer jogar de novo para tentar melhorar? Vale sempre a sua melhor pontuação.'
        ],
        [
          { texto: 'Jogar de novo', acao: () => ctx.missao.abrir(i) },
          { texto: 'Agora não', acao: () => {} }
        ]
      );
    }
    const falas = m.falaInicio.slice();
    if (!P.basicasFeitas(perfil, mod))
      falas.push(`Dica: você ainda não estudou "${mod.titulo}" na trilha. Recomendo estudar antes de começar.`);
    ctx.view.dialogo(alvo, falas, [
      { texto: 'Começar a missão', acao: () => ctx.missao.abrir(i) },
      { texto: 'Estudar primeiro', acao: () => ctx.trilha.abrir(m.id) },
      { texto: 'Agora não', acao: () => {} }
    ]);
  }

  /* ---------- ações públicas ---------- */
  return {
    andar(dx, dy) {
      cancelarCaminho();
      passo(dx, dy);
    },
    tocar(x, y) {
      if (tela().pausado) return;
      cancelarCaminho();
      const plano = modelo().planejarToque(x, y);
      if (plano) seguir(plano);
    },
    interagirProximo() {
      if (tela().pausado || tela().animando) return;
      const alvo = modelo().alvoProximo();
      if (!alvo) {
        toast('Chegue perto de uma pessoa ou objeto para interagir.');
        return;
      }
      modelo().virarPara(alvo);
      tela().desenhar();
      conversar(alvo);
    },
    irAte(entId) {
      const plano = modelo().planejarAte(entId);
      if (plano) seguir(plano);
    },
    cancelarCaminho,
    reavisarProximo() {
      ultimoProximo = undefined;
      avisarProximo();
    },
    boasVindas() {
      ctx.view.dialogo(
        { nome: 'Ana', papel: 'Líder técnica', cor: '#6B3FD6' },
        [
          D.historia,
          'Eu sou a Ana, líder técnica da equipe. Antes de cada missão, passe na Biblioteca (a estante à direita do corredor) para estudar o tema. Depois, fale com a pessoa da sala marcada com "!".'
        ],
        [
          { texto: 'Abrir a trilha', acao: () => ctx.trilha.abrir('requisitos') },
          { texto: 'Explorar o escritório', acao: () => {} }
        ]
      );
    }
  };
};
