/* =================================================================
   CONTROLLER / ALUNO — coordena a experiência do aluno
   Liga as views (tela, mundo, missões, trilha, coleções) aos models
   (perfil, mundo, missão) e ao repositório. Toda ação do aluno passa
   por aqui: andar, conversar, jogar uma missão, estudar uma lição.
   ================================================================= */
window.SQ = window.SQ || {};
SQ.controllers = SQ.controllers || {};

SQ.controllers.Aluno = {
  iniciar(raiz, perfil) {
    const R = SQ.models.Repositorio, P = SQ.models.Perfil, D = SQ.dados, U = SQ.util, cfg = SQ.config;
    const V = SQ.views, overlay = SQ.dom.overlay, toast = SQ.dom.toast;

    /* ---------------- persistência ---------------- */
    // O progresso é salvo logo; a posição no mapa, com atraso maior, para economizar
    // gravações no banco de dados (limite do plano gratuito do Firebase).
    let salvarTimer = null;
    function salvar(imediato, atraso = 900) {
      clearTimeout(salvarTimer);
      const exec = () => R.salvarPerfil(perfil).catch(() => toast('Não foi possível salvar seu progresso. Verifique a internet.'));
      if (imediato) return exec();
      salvarTimer = setTimeout(exec, atraso);
    }
    const evento = dados => R.registrarEvento({ uid: perfil.uid, usuario: perfil.usuario, codigoPesquisa: perfil.codigoPesquisa || null,
      turmaId: perfil.turmaId, turma: perfil.turma, professorUid: perfil.professorUid, ...dados }).catch(() => {});
    const avisarNivel = r => { if (r.subiu) setTimeout(() => toast(`Você subiu de nível: ${P.nivelDe(perfil.xp).nome}!`, 3500), 400); };

    /* ---------------- views e models ---------------- */
    const view = V.Aluno(raiz, { handlers: {
      onMenu: id => ({ trilha: () => abrirTrilha(), missoes: abrirMissoes, mochila: abrirMochila, ranking: abrirRanking, sair })[id](),
      onDirecao: (dx, dy) => andar(dx, dy),
      onInteragir: () => interagirProximo(),
      onRecomendacao: modulo => abrirTrilha(modulo)
    } });
    const mundo = SQ.models.Mundo(perfil, { portaAberta: n => P.portaAberta(perfil, n), statusMissao: i => P.statusMissao(perfil, i) });
    const mundoView = V.Mundo(view.canvas, mundo, perfil, {
      onDirecao: (dx, dy) => andar(dx, dy),
      onTocar: (x, y) => tocar(x, y),
      onInteragir: () => interagirProximo()
    });

    overlay.aoAbrir = () => { mundoView.pausar(true); cancelarCaminho(); view.fecharDialogo(); };
    overlay.aoFechar = silencioso => { mundoView.pausar(false); if (!silencioso) { atualizarTudo(); view.focarMapa(); } };

    let ultimoProximo;
    function avisarProximo() {
      const alvo = mundo.alvoProximo();
      if (alvo !== ultimoProximo) { ultimoProximo = alvo; view.prompt(alvo, P.objetivo(perfil)); }
    }
    function atualizarTudo() {
      view.hud(perfil);
      view.lateral({ objetivo: P.objetivo(perfil), recomendacao: P.recomendacao(perfil) });
      mundo.atualizar(); mundoView.desenhar();
      ultimoProximo = undefined; avisarProximo();
    }
    const avisarPorta = n => toast(`Porta trancada. Conclua a missão de ${D.missoes[n - 2].nome} para liberar a ${D.missoes[n - 1].sala}.`);

    /* ---------------- movimento ---------------- */
    let caminho = [], alvoFinal = null, passoTimer = null;
    function cancelarCaminho() { caminho = []; alvoFinal = null; clearTimeout(passoTimer); }

    function passo(dx, dy, fim) {
      if (mundoView.pausado || mundoView.animando) return fim && fim(false);
      const r = mundo.mover(dx, dy);
      if (!r.ok) {
        if (r.portaTrancada) avisarPorta(r.portaTrancada);
        mundoView.desenhar(); avisarProximo(); return fim && fim(false);
      }
      mundoView.animarPasso(r.de, r.para, () => {
        perfil.posicao = r.para; salvar(false, 20000);
        view.fecharDialogo(); view.centralizar(r.para); avisarProximo();
        fim && fim(true);
      });
    }
    function andar(dx, dy) { cancelarCaminho(); passo(dx, dy); }
    function tocar(x, y) {
      if (mundoView.pausado) return;
      cancelarCaminho();
      const plano = mundo.planejarToque(x, y);
      if (plano) seguir(plano);
    }
    function seguir(plano) { caminho = plano.passos.slice(); alvoFinal = plano.alvo; proximoPasso(); }
    function proximoPasso() {
      clearTimeout(passoTimer);
      if (!caminho.length) {
        const a = alvoFinal; alvoFinal = null;
        if (a && a.ent) { mundo.virarPara(a.ent); mundoView.desenhar(); avisarProximo(); interagir(a.ent); }
        else if (a && a.porta) avisarPorta(a.porta);
        return;
      }
      const [nx, ny] = caminho.shift();
      passo(nx - mundo.jogador.x, ny - mundo.jogador.y, ok => { if (ok) passoTimer = setTimeout(proximoPasso, 10); else cancelarCaminho(); });
    }
    function interagirProximo() {
      if (mundoView.pausado || mundoView.animando) return;
      const alvo = mundo.alvoProximo();
      if (!alvo) { toast('Chegue perto de uma pessoa ou objeto para interagir.'); return; }
      mundo.virarPara(alvo); mundoView.desenhar();
      interagir(alvo);
    }

    /* ---------------- conversas ---------------- */
    function interagir(alvo) {
      if (alvo.acao === 'trilha') return abrirTrilha();
      if (alvo.acao === 'ranking') return abrirRanking();
      if (alvo.acao === 'mentora') {
        const r = P.recomendacao(perfil);
        return view.dialogo(alvo, [P.objetivo(perfil), r.texto], [
          r.modulo ? { texto: 'Abrir a trilha', acao: () => abrirTrilha(r.modulo) } : { texto: 'Ver missões', acao: abrirMissoes },
          { texto: 'Valeu, Ana!', acao: () => {} }]);
      }
      if (alvo.acao === 'dica') {
        const dicas = ['Sabia que o medidor de qualidade é como a dívida técnica do projeto? Cada erro deixa o sistema mais difícil de manter.',
          'Na dúvida, releia as dicas da trilha antes da missão. Acertar de primeira vale 100 XP!',
          'O Mural no corredor mostra o ranking da turma. Dá para rejogar missões para melhorar as estrelas.'];
        return view.dialogo(alvo, ['Oi! Eu sou a Duda, estagiária aqui na DevNova.', dicas[Math.floor(Math.random() * dicas.length)]], [{ texto: 'Obrigado(a)!', acao: () => {} }]);
      }
      const i = alvo.missao, m = D.missoes[i], feita = perfil.missoes[m.id], mod = P.modulo(m.id);
      if (feita) {
        return view.dialogo(alvo, [`Você já concluiu esta missão com ${feita.estrelas} de 3 estrelas.`, 'Quer jogar de novo para tentar melhorar? Vale sempre a sua melhor pontuação.'],
          [{ texto: 'Jogar de novo', acao: () => abrirMissao(i) }, { texto: 'Agora não', acao: () => {} }]);
      }
      const falas = m.falaInicio.slice();
      if (!P.basicasFeitas(perfil, mod)) falas.push(`Dica: você ainda não estudou "${mod.titulo}" na trilha. Recomendo estudar antes de começar.`);
      view.dialogo(alvo, falas, [
        { texto: 'Começar a missão', acao: () => abrirMissao(i) },
        { texto: 'Estudar primeiro', acao: () => abrirTrilha(m.id) },
        { texto: 'Agora não', acao: () => {} }]);
    }

    /* ---------------- missões ---------------- */
    function abrirMissao(i) {
      const m = D.missoes[i];
      const repeticao = !!perfil.missoes[m.id];
      const missao = SQ.models.Missao(m, perfil);
      let terminou = false;
      const o = overlay.abrir(m.titulo, { antesDeFechar: async () => terminou || confirm('Sair da missão agora? O progresso desta missão será perdido.') });
      const area = SQ.dom.el('div');
      o.corpo.replaceChildren(area);

      const mostrar = () => V.Missao.desafio(area, { desafio: missao.desafio, indice: missao.indice, total: missao.total, sala: m.sala, ultimo: missao.ultimo }, {
        avaliar(resposta) {
          const r = missao.avaliar(resposta);
          if (!r) return null;
          if (r.status !== 'acerto') { P.registrarErro(perfil); view.hud(perfil); salvar(); }
          if (r.registro) evento({ ...r.registro, repeticao });
          return r;
        },
        proximo() {
          if (missao.ultimo) return finalizar();
          missao.avancar(); mostrar(); overlay.rolarTopo();
        }
      });

      function finalizar() {
        terminou = true;
        const res = missao.resultado();
        const out = P.concluirMissao(perfil, m, res);
        evento({ tipo: 'missao', faseId: m.id, fase: m.nome, pontos: res.pontos, estrelas: res.estrelas, acertosPrimeira: res.acertosPrimeira,
          tentativas: null, tempoSegundos: res.tempoSegundos, dataHora: new Date().toISOString(), repeticao: !out.primeiraVez });
        salvar(true); view.hud(perfil); avisarNivel(out);
        o.titulo$.textContent = 'Missão concluída';
        V.Missao.resumo(o.corpo, { missao: m, res, ...out, nivel: P.nivelDe(perfil.xp).nome, proxima: D.missoes[i + 1], modulo: P.modulo(m.id) },
          { voltar: () => overlay.fechar(), revisar: () => abrirTrilha(m.id) });
        overlay.rolarTopo();
      }
      mostrar();
    }

    /* ---------------- trilha ---------------- */
    function abrirTrilha(foco) {
      const o = overlay.abrir('Trilha de aprendizagem');
      V.Trilha.lista(o.corpo, { modulos: D.trilha, missoes: D.missoes, perfil, recomendacao: P.recomendacao(perfil), foco }, { abrirLicao });
    }
    function abrirLicao(mod, licao) {
      const o = overlay.atual; if (!o) return;
      o.titulo$.textContent = U.capitalizar(licao.titulo.replace('Aprofundamento: ', ''));
      const inicio = Date.now();
      V.Trilha.licao(o.corpo, { mod, licao, jaFeita: !!perfil.licoes[licao.id] }, {
        concluir({ acertouPrimeira, tentativas }) {
          const r = P.concluirLicao(perfil, licao, acertouPrimeira);
          if (!r.jaFeita) {
            evento({ tipo: 'licao', faseId: mod.fase, fase: D.missoes.find(m => m.id === mod.fase).nome, licaoId: licao.id, tentativas, acertou: true, acertouPrimeira,
              pontos: r.xp, tempoSegundos: Math.round((Date.now() - inicio) / 1000), dataHora: new Date().toISOString() });
            salvar(true); view.hud(perfil);
            toast(`Lição concluída: +${r.xp} XP`); avisarNivel(r);
          }
          abrirTrilha(mod.fase);
        },
        voltar: () => abrirTrilha(mod.fase)
      });
      overlay.rolarTopo();
    }

    /* ---------------- diário, mochila e ranking ---------------- */
    function abrirMissoes() {
      const o = overlay.abrir('Missões');
      V.Colecoes.missoes(o.corpo, { missoes: D.missoes, perfil, status: i => P.statusMissao(perfil, i) }, {
        irAte: m => { overlay.fechar(); const plano = mundo.planejarAte('npc-' + m.id); if (plano) seguir(plano); }
      });
    }
    function abrirMochila() {
      const o = overlay.abrir('Mochila');
      V.Colecoes.mochila(o.corpo, { missoes: D.missoes, perfil, nivel: P.nivelDe(perfil.xp).nome, estrelas: P.totalEstrelas(perfil) });
    }
    async function abrirRanking() {
      const o = overlay.abrir('Ranking da turma');
      V.Colecoes.rankingCarregando(o.corpo, perfil.turma);
      try { await salvar(true); V.Colecoes.ranking(o.corpo, { lista: await R.ranking(perfil.turmaId), uid: perfil.uid }); }
      catch (e) { V.Colecoes.ranking(o.corpo, { erro: R.mensagemErro(e) }); }
    }
    function sair() { Promise.resolve(salvar(true)).finally(() => R.sair()); }

    /* ---------------- início ---------------- */
    atualizarTudo();
    requestAnimationFrame(() => view.centralizar(mundo.jogador));
    perfil.ultimoAcesso = new Date().toISOString(); salvar();
    if (!perfil.boasVindas) {
      perfil.boasVindas = true; salvar();
      setTimeout(() => view.dialogo({ nome: 'Ana', papel: 'Líder técnica', cor: '#6B3FD6' },
        [D.historia, 'Eu sou a Ana, líder técnica da equipe. Antes de cada missão, passe na Biblioteca (a estante à direita do corredor) para estudar o tema. Depois, fale com a pessoa da sala marcada com "!".'],
        [{ texto: 'Abrir a trilha', acao: () => abrirTrilha('requisitos') }, { texto: 'Explorar o escritório', acao: () => {} }]), 300);
    }

    return {
      destruir() {
        clearTimeout(salvarTimer); cancelarCaminho(); mundoView.destruir();
        overlay.aoAbrir = null; overlay.aoFechar = null;
      }
    };
  }
};
