/* =================================================================
   MODEL / PAINEL — estatísticas da turma e exportação em CSV
   Calcula os indicadores do painel do professor a partir dos alunos e
   eventos de uma turma. Não acessa a interface nem o banco de dados.
   ================================================================= */
window.SQ = window.SQ || {};
SQ.models = SQ.models || {};

SQ.models.Painel = (function () {
  const D = SQ.dados,
    P = SQ.models.Perfil;
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

  // Para as estatísticas vale a primeira vez que cada aluno fez cada desafio.
  function primeirasTentativas(eventos) {
    const vistos = new Set(),
      out = [];
    eventos
      .filter(e => e.tipo === 'desafio')
      .sort((a, b) => String(a.dataHora).localeCompare(String(b.dataHora)))
      .forEach(e => {
        const k = e.uid + '|' + e.desafioId;
        if (vistos.has(k)) return;
        vistos.add(k);
        out.push(e);
      });
    return out;
  }

  function resumoAluno(a) {
    const ms = Object.values(a.missoes || {});
    const ap = ms.reduce((s, m) => s + (m.acertosPrimeira || 0), 0),
      tot = ms.reduce((s, m) => s + (m.total || 0), 0);
    return {
      uid: a.uid,
      usuario: a.usuario,
      apelido: a.apelido,
      foto: (a.avatar && a.avatar.foto) || null,
      cor: a.avatar && a.avatar.cor,
      pesquisa: a.codigoPesquisa || '',
      nivel: P.nivelDe(a.xp || 0).nome,
      xp: a.xp || 0,
      missoes: ms.length,
      licoes: Object.keys(a.licoes || {}).length,
      acerto: tot ? pct(ap, tot) : null,
      qualidade: Math.round(a.qualidade ?? 100),
      tempo: ms.reduce((s, m) => s + (m.tempoSegundos || 0), 0),
      ultimo: a.ultimoAcesso || a.criadoEm || ''
    };
  }

  function enunciado(id) {
    for (const m of D.missoes) {
      const d = m.desafios.find(x => x.id === id);
      if (d) return d.enunciado;
    }
    return id === 'man-consequencia' ? 'Consequência: requisito classificado errado' : id;
  }

  return {
    totalLicoes: () => D.trilha.reduce((s, m) => s + m.licoes.length, 0),

    calcular(alunos, eventos) {
      const prim = primeirasTentativas(eventos);
      const resumos = alunos.map(resumoAluno);
      const porDesafio = {};
      prim.forEach(e => {
        const d =
          porDesafio[e.desafioId] ||
          (porDesafio[e.desafioId] = { id: e.desafioId, fase: e.fase, n: 0, erros: 0, tent: 0 });
        d.n++;
        if (!e.acertouPrimeira) d.erros++;
        d.tent += e.tentativas;
      });
      return {
        resumos,
        indicadores: {
          alunos: alunos.length,
          mediaXp: resumos.length ? Math.round(resumos.reduce((s, r) => s + r.xp, 0) / resumos.length) : 0,
          mediaMissoes: resumos.length ? (resumos.reduce((s, r) => s + r.missoes, 0) / resumos.length).toFixed(1) : '0',
          acertoGeral: prim.length ? pct(prim.filter(e => e.acertouPrimeira).length, prim.length) : null
        },
        porTema: D.missoes.map(m => {
          const es = prim.filter(e => e.faseId === m.id);
          return { nome: m.nome, valor: pct(es.filter(e => e.acertouPrimeira).length, es.length), n: es.length };
        }),
        porTrilha: D.trilha.map(mod => {
          const basicas = mod.licoes.filter(l => !l.aprofundamento).map(l => l.id);
          const ok = alunos.filter(a => basicas.every(id => a.licoes && a.licoes[id])).length;
          return { nome: D.missoes.find(m => m.id === mod.fase).nome, valor: pct(ok, alunos.length), n: alunos.length };
        }),
        dificeis: Object.values(porDesafio)
          .map(d => ({ ...d, taxa: pct(d.erros, d.n), media: (d.tent / d.n).toFixed(1), enunciado: enunciado(d.id) }))
          .sort((a, b) => b.taxa - a.taxa || b.n - a.n)
          .slice(0, 8)
      };
    },

    ordenar(resumos, { campo, asc }) {
      return resumos.slice().sort((a, b) => {
        const va = a[campo] ?? -1,
          vb = b[campo] ?? -1;
        const c = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb));
        return asc ? c : -c;
      });
    },

    csvEventos(eventos) {
      const cab = [
        'usuario',
        'codigo_pesquisa',
        'turma',
        'data_hora',
        'tipo',
        'fase',
        'desafio',
        'tipo_desafio',
        'licao',
        'tentativas',
        'acertou',
        'acertou_primeira',
        'pontos',
        'estrelas',
        'tempo_segundos',
        'repeticao'
      ];
      const b = v => (v == null ? '' : v ? 1 : 0);
      return SQ.util.csv(
        [cab].concat(
          eventos
            .slice()
            .sort(
              (a, c) =>
                String(a.usuario).localeCompare(String(c.usuario)) ||
                String(a.dataHora).localeCompare(String(c.dataHora))
            )
            .map(e => [
              e.usuario,
              e.codigoPesquisa || '',
              e.turma,
              e.dataHora,
              e.tipo,
              e.fase || '',
              e.desafioId || '',
              e.tipoDesafio || '',
              e.licaoId || '',
              e.tentativas ?? '',
              b(e.acertou),
              b(e.acertouPrimeira),
              e.pontos ?? '',
              e.estrelas ?? '',
              e.tempoSegundos ?? '',
              e.repeticao ? 1 : 0
            ])
        )
      );
    },

    csvResumo(alunos) {
      const cab = [
        'usuario',
        'codigo_pesquisa',
        'apelido',
        'turma',
        'nivel',
        'xp',
        'qualidade',
        'missoes_concluidas',
        'licoes_concluidas',
        'criado_em',
        'ultimo_acesso',
        ...D.missoes.flatMap(m => [
          `${m.id}_pontos`,
          `${m.id}_acertos_primeira`,
          `${m.id}_desafios`,
          `${m.id}_tempo_segundos`
        ])
      ];
      return SQ.util.csv(
        [cab].concat(
          alunos.map(a => [
            a.usuario,
            a.codigoPesquisa || '',
            a.apelido,
            a.turma,
            P.nivelDe(a.xp || 0).nome,
            a.xp || 0,
            Math.round(a.qualidade ?? 100),
            Object.keys(a.missoes || {}).length,
            Object.keys(a.licoes || {}).length,
            a.criadoEm || '',
            a.ultimoAcesso || '',
            ...D.missoes.flatMap(m => {
              const r = (a.missoes || {})[m.id];
              return r ? [r.pontos, r.acertosPrimeira, r.total, r.tempoSegundos] : ['', '', '', ''];
            })
          ])
        )
      );
    }
  };
})();
