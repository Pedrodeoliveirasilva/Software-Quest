/* =================================================================
   MODEL / PERFIL — regras de progresso do aluno
   XP, níveis, desbloqueio de salas, conclusão de missões e lições,
   recomendações de estudo. Não acessa a interface nem o banco de dados.
   ================================================================= */
window.SQ = window.SQ || {};
SQ.models = SQ.models || {};

SQ.models.Perfil = (function () {
  const cfg = SQ.config,
    D = SQ.dados,
    U = SQ.util;

  const modulo = id => D.trilha.find(t => t.fase === id);
  const missaoPorId = id => D.missoes.find(m => m.id === id);

  const M = {
    novo({ uid, usuario, apelido, turma, avatar, codigoPesquisa }) {
      return {
        uid,
        papel: 'aluno',
        usuario,
        apelido,
        avatar,
        turmaId: turma.turmaId,
        turma: turma.nome,
        codigoTurma: turma.codigo,
        professorUid: turma.professorUid,
        codigoPesquisa: codigoPesquisa || null, // código de participante (só em turmas de pesquisa)
        xp: 0,
        qualidade: 100,
        licoes: {}, // { idLicao: { concluidaEm, acertouPrimeira } }
        missoes: {}, // { idMissao: { pontos, estrelas, acertosPrimeira, total, tempoSegundos, concluidaEm, vezes } }
        itens: [], // ids das missões cujos itens foram ganhos
        requisitosErrados: [], // consequência usada na missão de manutenção
        posicao: null,
        criadoEm: new Date().toISOString(),
        ultimoAcesso: null
      };
    },

    nivelDe(xp) {
      const niveis = cfg.niveis;
      let atual = niveis[0],
        proximo = null;
      for (let i = 0; i < niveis.length; i++)
        if (xp >= niveis[i].xp) {
          atual = niveis[i];
          proximo = niveis[i + 1] || null;
        }
      const pct = proximo ? (xp - atual.xp) / (proximo.xp - atual.xp) : 1;
      return { nome: atual.nome, indice: niveis.indexOf(atual) + 1, proximo, pct: Math.max(0, Math.min(1, pct)) };
    },

    modulo,
    missaoPorId,
    basicasFeitas: (p, mod) => mod.licoes.filter(l => !l.aprofundamento).every(l => p.licoes[l.id]),
    proximaMissao: p => D.missoes.findIndex(m => !p.missoes[m.id]),
    portaAberta: (p, n) => n === 1 || !!p.missoes[D.missoes[n - 2].id],
    statusMissao(p, i) {
      if (p.missoes[D.missoes[i].id]) return 'concluida';
      return M.portaAberta(p, i + 1) ? 'disponivel' : 'bloqueada';
    },
    totalEstrelas: p => Object.values(p.missoes).reduce((s, r) => s + r.estrelas, 0),

    objetivo(p) {
      const n = M.proximaMissao(p);
      if (n < 0) return 'Projeto concluído! Veja suas medalhas na mochila e sua posição no ranking.';
      const m = D.missoes[n];
      return `Fale com ${m.npc} (${m.papel}) na ${m.sala}. Procure o sinal "!" sobre a cabeça.`;
    },

    /* Recomendação adaptativa: revisar o tema com dificuldade, preparar a próxima missão ou aprofundar. */
    recomendacao(p) {
      for (const m of D.missoes) {
        const r = p.missoes[m.id];
        if (r && r.estrelas === 1) {
          const mod = modulo(m.id);
          if (mod.licoes.find(l => !p.licoes[l.id]))
            return {
              texto: `Você teve dificuldade na missão de ${m.nome}. Revise o módulo "${mod.titulo}" na trilha.`,
              modulo: m.id
            };
        }
      }
      const n = M.proximaMissao(p);
      if (n >= 0) {
        const mod = modulo(D.missoes[n].id);
        if (!M.basicasFeitas(p, mod))
          return { texto: `Prepare-se para a próxima missão: estude "${mod.titulo}" na Biblioteca.`, modulo: mod.fase };
      }
      for (const m of D.missoes) {
        if (!p.missoes[m.id]) continue;
        const ap = modulo(m.id).licoes.find(l => l.aprofundamento && !p.licoes[l.id]);
        if (ap)
          return {
            texto: `Aprofunde seus conhecimentos: "${U.capitalizar(ap.titulo.replace('Aprofundamento: ', ''))}".`,
            modulo: m.id
          };
      }
      if (n < 0)
        return {
          texto: 'Você concluiu tudo! Rejogue as missões em que ganhou menos estrelas para melhorar sua pontuação.',
          modulo: null
        };
      return { texto: `Tudo pronto! Vá até a ${D.missoes[n].sala} e fale com ${D.missoes[n].npc}.`, modulo: null };
    },

    /* ---------- mudanças de estado (retornam o que aconteceu) ---------- */
    ganharXp(p, qtd) {
      const antes = M.nivelDe(p.xp).nome;
      p.xp += qtd;
      const depois = M.nivelDe(p.xp).nome;
      return { subiu: depois !== antes, nivel: depois };
    },
    registrarErro(p) {
      p.qualidade = Math.max(0, p.qualidade - cfg.perdaQualidadePorErro);
    },

    concluirMissao(p, missao, res) {
      const anterior = p.missoes[missao.id];
      const primeiraVez = !anterior;
      const melhor = primeiraVez || res.pontos > anterior.pontos;
      const xpGanho = primeiraVez ? res.pontos : Math.max(0, res.pontos - anterior.pontos);
      const { subiu } = M.ganharXp(p, xpGanho);
      p.missoes[missao.id] = melhor
        ? {
            pontos: res.pontos,
            estrelas: res.estrelas,
            acertosPrimeira: res.acertosPrimeira,
            total: res.total,
            tempoSegundos: res.tempoSegundos,
            concluidaEm: new Date().toISOString(),
            vezes: (anterior?.vezes || 0) + 1
          }
        : { ...anterior, vezes: (anterior.vezes || 1) + 1 };
      if (primeiraVez && !p.itens.includes(missao.id)) p.itens.push(missao.id);
      if (primeiraVez && res.requisitosErrados && res.requisitosErrados.length)
        p.requisitosErrados = res.requisitosErrados;
      return { primeiraVez, xpGanho, subiu };
    },

    concluirLicao(p, licao, acertouPrimeira) {
      if (p.licoes[licao.id]) return { xp: 0, jaFeita: true, subiu: false };
      p.licoes[licao.id] = { concluidaEm: new Date().toISOString(), acertouPrimeira };
      const xp = cfg.xpLicao + (acertouPrimeira ? cfg.xpVerificacao : 0);
      const { subiu } = M.ganharXp(p, xp);
      return { xp, jaFeita: false, subiu };
    },

    resumoRanking: p => ({
      apelido: p.apelido,
      turmaId: p.turmaId,
      professorUid: p.professorUid,
      xp: p.xp || 0,
      nivel: M.nivelDe(p.xp || 0).nome,
      avatar: p.avatar,
      missoes: Object.keys(p.missoes || {}).length
    })
  };
  return M;
})();
