/* =================================================================
   PAINEL DO PROFESSOR
   Turmas com código de acesso e, para cada turma, progresso dos alunos,
   desempenho por tema, desafios com mais erros e exportação em CSV.
   ================================================================= */
window.SQ = window.SQ || {};

SQ.telaProfessor = async function (raiz, sessao, { onSair }) {
  const el = SQ.el, B = SQ.backend;
  const prof = { uid: sessao.uid, nome: sessao.nome, escola: sessao.escola || '', email: sessao.email };
  let turmas = [], alunos = [], eventos = [], turmaSel = null, ordem = { campo: 'usuario', asc: true };

  const aviso = el('p', { class: 'muted', 'aria-live': 'polite' });
  const areaTurmas = el('div');
  const corpo = el('div', {}, el('p', { class: 'empty', text: 'Carregando dados…' }));

  async function carregar() {
    aviso.textContent = '';
    try {
      turmas = await B.listarTurmas(prof.uid);
      if (turmaSel && !turmas.find(t => t.id === turmaSel)) turmaSel = null;
      if (!turmaSel && turmas.length) turmaSel = turmas[0].id;
      renderTurmas();
      if (!turmaSel) { corpo.replaceChildren(); return; }
      corpo.replaceChildren(el('p', { class: 'empty', text: 'Carregando dados da turma…' }));
      [alunos, eventos] = await Promise.all([B.listarAlunos(prof.uid, turmaSel), B.listarEventos(prof.uid, turmaSel)]);
      alunos = alunos.filter(a => a && a.papel === 'aluno');
      render();
    } catch (e) {
      corpo.replaceChildren(el('p', { class: 'error-msg', text: 'Não foi possível carregar os dados: ' + B.mensagemErro(e) }));
    }
  }

  /* ---------- Turmas ---------- */
  function renderTurmas() {
    const nome = el('input', { id: 't-nome', maxlength: 60, placeholder: 'Ex.: 2ª série A — Desenvolvimento de Sistemas' });
    const escola = el('input', { id: 't-escola', maxlength: 80, value: prof.escola || '' });
    const pesquisa = el('input', { id: 't-pesq', type: 'checkbox' });
    const erroT = el('p', { class: 'error-msg', role: 'alert' });
    const form = el('form', { class: 'card hidden', style: { marginBottom: '1rem' }, onsubmit: async e => {
      e.preventDefault(); erroT.textContent = '';
      const n = nome.value.trim();
      if (n.length < 2) { erroT.textContent = 'Dê um nome à turma.'; nome.focus(); return; }
      form.querySelectorAll('button,input').forEach(x => x.disabled = true);
      try { const t = await B.criarTurma(prof, { nome: n, escola: escola.value.trim(), pesquisa: pesquisa.checked }); turmaSel = t.id; await carregar(); SQ.toast(`Turma criada. Código: ${SQ.formatarCodigo(t.codigo)}`, 4000); }
      catch (x) { erroT.textContent = B.mensagemErro(x); form.querySelectorAll('button,input').forEach(y => y.disabled = false); }
    } },
      el('h2', { style: { fontSize: '1.15rem', marginBottom: '.8rem' }, text: 'Nova turma' }),
      el('div', { class: 'form-grid' },
        el('div', { class: 'field' }, el('label', { for: 't-nome', text: 'Nome da turma' }), nome),
        el('div', { class: 'field' }, el('label', { for: 't-escola', text: 'Escola' }), escola),
        el('label', { class: 'check-line' }, pesquisa, el('span', {}, el('strong', { text: 'Turma participante de pesquisa. ' }), 'O cadastro dos alunos pedirá também o código de participante (P01 a P99) usado nos formulários de pré e pós-teste.')),
        erroT,
        el('div', { class: 'actions', style: { marginTop: 0 } },
          el('button', { class: 'btn', type: 'submit', text: 'Criar turma' }),
          el('button', { class: 'btn ghost small', type: 'button', onclick: () => form.classList.add('hidden'), text: 'Cancelar' }))));

    const t = turmas.find(x => x.id === turmaSel);
    areaTurmas.replaceChildren(
      el('div', { class: 'rank-filter' },
        turmas.length ? [el('label', { for: 'f-turma', text: 'Turma' }),
          el('select', { id: 'f-turma', class: 'btn ghost small', onchange: e => { turmaSel = e.target.value; carregar(); } },
            turmas.map(x => el('option', { value: x.id, text: x.nome + (x.ativa ? '' : ' (cadastros fechados)'), selected: x.id === turmaSel })))] : null,
        el('button', { class: 'btn small', onclick: () => { form.classList.remove('hidden'); nome.focus(); }, text: '+ Nova turma' }),
        turmas.length ? el('button', { class: 'btn ghost small', onclick: carregar, text: 'Atualizar dados' }) : null),
      form,
      !turmas.length ? el('div', { class: 'card', style: { marginBottom: '1rem' } },
        el('h2', { style: { fontSize: '1.2rem', marginBottom: '.4rem' }, text: 'Comece criando sua primeira turma' }),
        el('p', { class: 'muted', style: { margin: 0 }, text: 'Cada turma recebe um código de acesso. Os alunos usam esse código para criar a conta e entrar no jogo, e os dados deles aparecem aqui.' })) : null,
      t ? cartaoTurma(t) : null);
  }

  function cartaoTurma(t) {
    const cod = SQ.formatarCodigo(t.codigo);
    return el('div', { class: 'card turma-card', style: { marginBottom: '1.2rem' } },
      el('div', { class: 'turma-info' },
        el('div', {},
          el('h2', { style: { fontSize: '1.25rem' }, text: t.nome }),
          el('p', { class: 'muted', style: { margin: '.2rem 0 0' }, text: [t.escola, t.pesquisa ? 'Participante de pesquisa' : null].filter(Boolean).join(' · ') || ' ' })),
        el('div', { class: 'codigo-box' },
          el('span', { class: 'muted', style: { fontSize: '.85rem' }, text: 'Código de acesso' }),
          el('strong', { class: 'codigo', text: cod }),
          el('button', { class: 'btn ghost small', onclick: async () => {
            const msg = `Entre no Software Quest, clique em "Primeiro acesso" e use o código da turma: ${cod}`;
            try { await navigator.clipboard.writeText(msg); SQ.toast('Instrução copiada. Cole no grupo da turma.'); } catch (e) { SQ.toast(msg, 6000); }
          }, text: 'Copiar instrução para os alunos' }))),
      el('div', { class: 'actions', style: { marginTop: '.8rem' } },
        el('label', { class: 'check-line' }, el('input', { type: 'checkbox', checked: t.ativa, onchange: async e => {
          try { await B.atualizarTurma(t, { ativa: e.target.checked }); SQ.toast(e.target.checked ? 'Cadastros abertos.' : 'Cadastros fechados: novos alunos não conseguem entrar nesta turma.'); carregar(); }
          catch (x) { SQ.toast(B.mensagemErro(x)); e.target.checked = !e.target.checked; }
        } }), el('span', { text: 'Aceitar novos cadastros' })),
        el('label', { class: 'check-line' }, el('input', { type: 'checkbox', checked: t.pesquisa, onchange: async e => {
          try { await B.atualizarTurma(t, { pesquisa: e.target.checked }); carregar(); }
          catch (x) { SQ.toast(B.mensagemErro(x)); e.target.checked = !e.target.checked; }
        } }), el('span', { text: 'Pedir código de participante da pesquisa' }))));
  }

  // Para as estatísticas vale a primeira vez que cada aluno fez cada desafio.
  function primeirasTentativas(evs) {
    const vistos = new Set(), out = [];
    evs.filter(e => e.tipo === 'desafio').sort((a, b) => String(a.dataHora).localeCompare(String(b.dataHora))).forEach(e => {
      const k = e.uid + '|' + e.desafioId; if (vistos.has(k)) return; vistos.add(k); out.push(e);
    });
    return out;
  }
  const pct = (a, b) => b ? Math.round(a / b * 100) : 0;

  function resumoAluno(a) {
    const ms = Object.values(a.missoes || {});
    const ap = ms.reduce((s, m) => s + (m.acertosPrimeira || 0), 0), tot = ms.reduce((s, m) => s + (m.total || 0), 0);
    return {
      usuario: a.usuario, apelido: a.apelido, pesquisa: a.codigoPesquisa || '', nivel: SQ.nivelDe(a.xp || 0).nome, xp: a.xp || 0,
      missoes: ms.length, licoes: Object.keys(a.licoes || {}).length, acerto: tot ? pct(ap, tot) : null,
      qualidade: Math.round(a.qualidade ?? 100), tempo: ms.reduce((s, m) => s + (m.tempoSegundos || 0), 0),
      ultimo: a.ultimoAcesso || a.criadoEm || ''
    };
  }

  function barra(rotulo, valor, sufixo = '%', n) {
    const cls = valor < 50 ? 'low' : valor < 70 ? 'mid' : '';
    return el('div', { class: 'bar-row' },
      el('span', { text: rotulo }),
      el('div', { class: 'track', role: 'img', 'aria-label': `${rotulo}: ${valor}${sufixo}` }, el('span', { class: cls, style: `width:${Math.max(2, valor)}%` })),
      el('span', { class: 'val', text: n === 0 ? '–' : valor + sufixo }));
  }

  function render() {
    const als = alunos;
    const evs = eventos;
    const prim = primeirasTentativas(evs);
    const resumos = als.map(resumoAluno);

    const mediaXp = resumos.length ? Math.round(resumos.reduce((s, r) => s + r.xp, 0) / resumos.length) : 0;
    const mediaMissoes = resumos.length ? (resumos.reduce((s, r) => s + r.missoes, 0) / resumos.length).toFixed(1) : '0';
    const acertoGeral = pct(prim.filter(e => e.acertouPrimeira).length, prim.length);

    // Desempenho por tema
    const porTema = SQ.missoes.map(m => {
      const es = prim.filter(e => e.faseId === m.id);
      return { nome: m.nome, v: pct(es.filter(e => e.acertouPrimeira).length, es.length), n: es.length };
    });
    // Trilha: alunos que concluíram as lições básicas de cada módulo
    const porTrilha = SQ.trilha.map(mod => {
      const basicas = mod.licoes.filter(l => !l.aprofundamento).map(l => l.id);
      const ok = als.filter(a => basicas.every(id => a.licoes && a.licoes[id])).length;
      return { nome: SQ.missoes.find(m => m.id === mod.fase).nome, v: pct(ok, als.length), n: als.length };
    });
    // Desafios com mais erros
    const porDesafio = {};
    prim.forEach(e => { const d = porDesafio[e.desafioId] || (porDesafio[e.desafioId] = { id: e.desafioId, fase: e.fase, n: 0, erros: 0, tent: 0 }); d.n++; if (!e.acertouPrimeira) d.erros++; d.tent += e.tentativas; });
    const difíceis = Object.values(porDesafio).map(d => ({ ...d, taxa: pct(d.erros, d.n) })).sort((a, b) => b.taxa - a.taxa || b.n - a.n).slice(0, 8);
    const enunciado = id => { for (const m of SQ.missoes) { const d = m.desafios.find(x => x.id === id); if (d) return d.enunciado; } return id === 'man-consequencia' ? 'Consequência: requisito classificado errado' : id; };

    // Tabela de alunos com ordenação
    const campos = [['usuario', 'Usuário'], ['apelido', 'Apelido'], ['pesquisa', 'Cód. pesquisa'], ['nivel', 'Nível'], ['xp', 'XP'], ['missoes', 'Missões'], ['licoes', 'Lições'], ['acerto', 'Acerto 1ª'], ['qualidade', 'Qualidade'], ['tempo', 'Tempo'], ['ultimo', 'Último acesso']];
    const ordenados = resumos.slice().sort((a, b) => {
      const va = a[ordem.campo] ?? -1, vb = b[ordem.campo] ?? -1;
      const c = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb));
      return ordem.asc ? c : -c;
    });

    corpo.replaceChildren(
      el('div', { class: 'kpis' },
        el('div', { class: 'kpi' }, el('strong', { text: als.length }), el('span', { text: 'alunos cadastrados' })),
        el('div', { class: 'kpi' }, el('strong', { text: `${mediaMissoes}/7` }), el('span', { text: 'missões por aluno (média)' })),
        el('div', { class: 'kpi' }, el('strong', { text: mediaXp }), el('span', { text: 'XP médio' })),
        el('div', { class: 'kpi' }, el('strong', { text: prim.length ? acertoGeral + '%' : '–' }), el('span', { text: 'acertos de primeira' }))),
      el('div', { class: 'panel-grid' },
        el('section', { class: 'panel-section' }, el('h2', { text: 'Acerto de primeira por tema' }),
          el('p', { text: 'Temas em vermelho ou amarelo merecem revisão em sala.' }),
          el('div', { class: 'bars' }, porTema.map(t => barra(t.nome, t.v, '%', t.n)))),
        el('section', { class: 'panel-section' }, el('h2', { text: 'Trilha de aprendizagem' }),
          el('p', { text: 'Alunos que concluíram as lições básicas de cada módulo.' }),
          el('div', { class: 'bars' }, porTrilha.map(t => barra(t.nome, t.v, '%', t.n))))),
      el('section', { class: 'panel-section', style: 'margin-bottom:1.2rem' }, el('h2', { text: 'Desafios com mais erros' }),
        el('p', { text: 'Porcentagem de alunos que não acertaram de primeira (considera só a primeira vez que cada aluno fez o desafio).' }),
        difíceis.length ? el('div', { class: 'table-wrap' }, el('table', {},
          el('thead', {}, el('tr', {}, ['Fase', 'Desafio', 'Alunos', 'Erraram de primeira', 'Tentativas (média)'].map(t => el('th', { text: t })))),
          el('tbody', {}, difíceis.map(d => el('tr', {}, el('td', { text: d.fase }), el('td', { text: enunciado(d.id).slice(0, 70) + (enunciado(d.id).length > 70 ? '…' : ''), title: enunciado(d.id) }),
            el('td', { text: d.n }), el('td', { text: d.taxa + '%' }), el('td', { text: (d.tent / d.n).toFixed(1) }))))))
          : el('p', { class: 'empty', text: 'Ainda não há desafios respondidos.' })),
      el('section', { class: 'panel-section' }, el('h2', { text: 'Alunos' }),
        el('p', { text: 'Clique no título de uma coluna para ordenar.' }),
        resumos.length ? el('div', { class: 'table-wrap' }, el('table', {},
          el('thead', {}, el('tr', {}, campos.map(([c, t]) => el('th', { 'aria-sort': ordem.campo === c ? (ordem.asc ? 'ascending' : 'descending') : null },
            el('button', { onclick: () => { ordem = { campo: c, asc: ordem.campo === c ? !ordem.asc : true }; render(); } }, t + (ordem.campo === c ? (ordem.asc ? ' ▲' : ' ▼') : '')))))),
          el('tbody', {}, ordenados.map(r => el('tr', {},
            el('td', { text: r.usuario }), el('td', { text: r.apelido }), el('td', { text: r.pesquisa || '–' }), el('td', { text: r.nivel }), el('td', { text: r.xp }),
            el('td', { text: `${r.missoes}/7` }), el('td', { text: `${r.licoes}/${SQ.trilha.reduce((s, m) => s + m.licoes.length, 0)}` }),
            el('td', { text: r.acerto == null ? '–' : r.acerto + '%' }), el('td', { text: r.qualidade + '%' }), el('td', { text: SQ.formatarTempo(r.tempo * 1000) }),
            el('td', { text: r.ultimo ? new Date(r.ultimo).toLocaleString('pt-BR') : '–' }))))))
          : el('p', { class: 'empty', text: 'Nenhum aluno nesta turma ainda. Passe o código de acesso para os alunos: eles se cadastram em "Primeiro acesso".' })),
      el('div', { class: 'actions' },
        el('button', { class: 'btn small', disabled: !evs.length, onclick: () => exportarEventos(evs), text: 'Baixar CSV de eventos' }),
        el('button', { class: 'btn small ghost', disabled: !resumos.length, onclick: () => exportarResumo(als), text: 'Baixar CSV de resumo por aluno' })),
      aviso

    );
  }

  function blocoExemplo() {
    return B.modo === 'demo' ? el('div', { class: 'card', style: 'margin-top:1.2rem' },
        el('h2', { style: 'font-size:1.1rem;margin-bottom:.3rem', text: 'Dados de exemplo (só na demonstração)' }),
        el('p', { class: 'muted', text: 'Cria a "Turma de exemplo" com 8 alunos fictícios para você ver o painel preenchido. Pode ser apagada a qualquer momento.' }),
        el('div', { class: 'actions', style: 'margin-top:.4rem' },
          el('button', { class: 'btn small ghost', onclick: async () => { turmaSel = await B.gerarDadosExemplo(prof); carregar(); }, text: 'Gerar dados de exemplo' }),
          el('button', { class: 'btn small ghost', onclick: async () => { await B.apagarDadosExemplo(prof); turmaSel = null; carregar(); }, text: 'Apagar dados de exemplo' }))) : null;
  }

  function nomeArquivoTurma() {
    const t = turmas.find(x => x.id === turmaSel);
    return (t ? t.nome : 'turma').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
  }

  async function exportarEventos(evs) {
    const cab = ['usuario', 'codigo_pesquisa', 'turma', 'data_hora', 'tipo', 'fase', 'desafio', 'tipo_desafio', 'licao', 'tentativas', 'acertou', 'acertou_primeira', 'pontos', 'estrelas', 'tempo_segundos', 'repeticao'];
    const linhas = [cab].concat(evs.slice().sort((a, b) => String(a.usuario).localeCompare(String(b.usuario)) || String(a.dataHora).localeCompare(String(b.dataHora))).map(e => [
      e.usuario, e.codigoPesquisa || '', e.turma, e.dataHora, e.tipo, e.fase || '', e.desafioId || '', e.tipoDesafio || '', e.licaoId || '', e.tentativas ?? '',
      e.acertou == null ? '' : (e.acertou ? 1 : 0), e.acertouPrimeira == null ? '' : (e.acertouPrimeira ? 1 : 0), e.pontos ?? '', e.estrelas ?? '', e.tempoSegundos ?? '', e.repeticao ? 1 : 0
    ]));
    const r = await SQ.baixarArquivo(`softwarequest_eventos_${nomeArquivoTurma()}_${new Date().toISOString().slice(0, 10)}.csv`, SQ.csv(linhas));
    aviso.textContent = r === 'salvo' ? 'CSV de eventos baixado.' : 'Download cancelado.';
  }

  async function exportarResumo(als) {
    const cab = ['usuario', 'codigo_pesquisa', 'apelido', 'turma', 'nivel', 'xp', 'qualidade', 'missoes_concluidas', 'licoes_concluidas', 'criado_em', 'ultimo_acesso',
      ...SQ.missoes.flatMap(m => [`${m.id}_pontos`, `${m.id}_acertos_primeira`, `${m.id}_desafios`, `${m.id}_tempo_segundos`])];
    const linhas = [cab].concat(als.map(a => [
      a.usuario, a.codigoPesquisa || '', a.apelido, a.turma, SQ.nivelDe(a.xp || 0).nome, a.xp || 0, Math.round(a.qualidade ?? 100), Object.keys(a.missoes || {}).length, Object.keys(a.licoes || {}).length, a.criadoEm || '', a.ultimoAcesso || '',
      ...SQ.missoes.flatMap(m => { const r = (a.missoes || {})[m.id]; return r ? [r.pontos, r.acertosPrimeira, r.total, r.tempoSegundos] : ['', '', '', '']; })
    ]));
    const r = await SQ.baixarArquivo(`softwarequest_resumo_${nomeArquivoTurma()}_${new Date().toISOString().slice(0, 10)}.csv`, SQ.csv(linhas));
    aviso.textContent = r === 'salvo' ? 'CSV de resumo baixado.' : 'Download cancelado.';
  }

  raiz.replaceChildren(
    B.modo === 'demo' ? el('div', { class: 'banner-demo', text: 'Modo demonstração: os dados ficam salvos só neste navegador.' }) : null,
    el('main', { class: 'wrap' },
      el('div', { class: 'panel-head' },
        el('div', {}, el('p', { class: 'muted', style: 'margin:0', text: [prof.nome, prof.escola].filter(Boolean).join(' · ') }), el('h1', { text: 'Painel do professor' })),
        el('div', { class: 'actions', style: { marginTop: 0 } },
          el('button', { class: 'link', onclick: () => SQ.abrirPrivacidade && SQ.abrirPrivacidade(), text: 'Privacidade' }),
          el('button', { class: 'btn ghost small', onclick: onSair, text: 'Sair' }))),
      areaTurmas, corpo, blocoExemplo())
  );
  carregar();
};
