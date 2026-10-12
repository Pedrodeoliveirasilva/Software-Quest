/* =================================================================
   VIEW / PAINEL — tela do professor
   Recebe turmas e estatísticas prontas (calculadas pelo PainelModel) e
   repassa as ações ao ProfessorController.
   ================================================================= */
window.SQ = window.SQ || {};
SQ.views = SQ.views || {};

SQ.views.Painel = function (raiz, { prof, handlers }) {
  const el = SQ.dom.el,
    U = SQ.util;
  const areaTurmas = el('div');
  const corpo = el('div', {}, el('p', { class: 'empty', text: 'Carregando dados…' }));
  const $aviso = el('p', { class: 'muted', 'aria-live': 'polite' });
  const $quem = el('div', { class: 'panel-who' });
  function cabecalho(p) {
    $quem.replaceChildren(
      SQ.dom.avatar({ foto: p.foto, cor: '#6B3FD6', texto: p.nome, tamanho: 'medio' }),
      el(
        'div',
        {},
        el('p', { class: 'muted', style: { margin: 0 }, text: [p.nome, p.escola].filter(Boolean).join(' · ') }),
        el('h1', { text: 'Painel do professor' })
      )
    );
  }
  cabecalho(prof);

  raiz.replaceChildren(
    el(
      'main',
      { class: 'wrap' },
      el(
        'div',
        { class: 'panel-head' },
        $quem,
        el(
          'div',
          { class: 'actions', style: { marginTop: 0 } },
          el('button', { class: 'link', onclick: handlers.privacidade, text: 'Privacidade' }),
          el('button', { class: 'btn ghost small', onclick: handlers.minhaConta, text: 'Minha conta' }),
          el('button', { class: 'btn ghost small', onclick: handlers.sair, text: 'Sair' })
        )
      ),
      areaTurmas,
      corpo
    )
  );

  /* ---------- turmas ---------- */
  function turmas({ turmas, turmaSel }) {
    const nome = el('input', {
      id: 't-nome',
      maxlength: 60,
      placeholder: 'Ex.: 2ª série A — Desenvolvimento de Sistemas'
    });
    const escola = el('input', { id: 't-escola', maxlength: 80, value: prof.escola || '' });
    const pesquisa = el('input', { id: 't-pesq', type: 'checkbox' });
    const erroT = el('p', { class: 'error-msg', role: 'alert' });
    const form = el(
      'form',
      {
        class: 'card hidden',
        style: { marginBottom: '1rem' },
        onsubmit: async e => {
          e.preventDefault();
          erroT.textContent = '';
          form.querySelectorAll('button,input').forEach(x => (x.disabled = true));
          try {
            await handlers.criarTurma({ nome: nome.value, escola: escola.value, pesquisa: pesquisa.checked });
          } catch (x) {
            erroT.textContent = x.message;
            form.querySelectorAll('button,input').forEach(y => (y.disabled = false));
            if (x.campo === 'nome') nome.focus();
          }
        }
      },
      el('h2', { style: { fontSize: '1.15rem', marginBottom: '.8rem' }, text: 'Nova turma' }),
      el(
        'div',
        { class: 'form-grid' },
        el('div', { class: 'field' }, el('label', { for: 't-nome', text: 'Nome da turma' }), nome),
        el('div', { class: 'field' }, el('label', { for: 't-escola', text: 'Escola' }), escola),
        el(
          'label',
          { class: 'check-line' },
          pesquisa,
          el(
            'span',
            {},
            el('strong', { text: 'Turma participante de pesquisa. ' }),
            'O cadastro dos alunos pedirá também o código de participante (P01 a P99) usado nos formulários de pré e pós-teste.'
          )
        ),
        erroT,
        el(
          'div',
          { class: 'actions', style: { marginTop: 0 } },
          el('button', { class: 'btn', type: 'submit', text: 'Criar turma' }),
          el('button', {
            class: 'btn ghost small',
            type: 'button',
            onclick: () => form.classList.add('hidden'),
            text: 'Cancelar'
          })
        )
      )
    );
    const t = turmas.find(x => x.id === turmaSel);
    areaTurmas.replaceChildren(
      el(
        'div',
        { class: 'rank-filter' },
        turmas.length
          ? [
              el('label', { for: 'f-turma', text: 'Turma' }),
              el(
                'select',
                { id: 'f-turma', class: 'btn ghost small', onchange: e => handlers.selecionarTurma(e.target.value) },
                turmas.map(x =>
                  el('option', {
                    value: x.id,
                    text: x.nome + (x.ativa ? '' : ' (cadastros fechados)'),
                    selected: x.id === turmaSel
                  })
                )
              )
            ]
          : null,
        el('button', {
          class: 'btn small',
          onclick: () => {
            form.classList.remove('hidden');
            nome.focus();
          },
          text: '+ Nova turma'
        }),
        turmas.length
          ? el('button', { class: 'btn ghost small', onclick: handlers.atualizar, text: 'Atualizar dados' })
          : null
      ),
      form,
      !turmas.length
        ? el(
            'div',
            { class: 'card', style: { marginBottom: '1rem' } },
            el('h2', {
              style: { fontSize: '1.2rem', marginBottom: '.4rem' },
              text: 'Comece criando sua primeira turma'
            }),
            el('p', {
              class: 'muted',
              style: { margin: 0 },
              text: 'Cada turma recebe um código de acesso. Os alunos usam esse código para criar a conta e entrar no jogo, e os dados deles aparecem aqui.'
            })
          )
        : null,
      t ? cartaoTurma(t) : null
    );
    if (!turmas.length) corpo.replaceChildren();
  }

  function cartaoTurma(t) {
    const alternar = campo => e =>
      handlers.alterarTurma(t, { [campo]: e.target.checked }).catch(() => {
        e.target.checked = !e.target.checked;
      });
    return el(
      'div',
      { class: 'card turma-card', style: { marginBottom: '1.2rem' } },
      el(
        'div',
        { class: 'turma-info' },
        el(
          'div',
          {},
          el('h2', { style: { fontSize: '1.25rem' }, text: t.nome }),
          el('p', {
            class: 'muted',
            style: { margin: '.2rem 0 0' },
            text: [t.escola, t.pesquisa ? 'Participante de pesquisa' : null].filter(Boolean).join(' · ') || ' '
          })
        ),
        el(
          'div',
          { class: 'codigo-box' },
          el('span', { class: 'muted', style: { fontSize: '.85rem' }, text: 'Código de acesso' }),
          el('strong', { class: 'codigo', text: U.formatarCodigo(t.codigo) }),
          el('button', {
            class: 'btn ghost small',
            onclick: () => handlers.copiarInstrucao(t),
            text: 'Copiar instrução para os alunos'
          })
        )
      ),
      el(
        'div',
        { class: 'actions', style: { marginTop: '.8rem' } },
        el(
          'label',
          { class: 'check-line' },
          el('input', { type: 'checkbox', checked: t.ativa, onchange: alternar('ativa') }),
          el('span', { text: 'Aceitar novos cadastros' })
        ),
        el(
          'label',
          { class: 'check-line' },
          el('input', { type: 'checkbox', checked: t.pesquisa, onchange: alternar('pesquisa') }),
          el('span', { text: 'Pedir código de participante da pesquisa' })
        ),
        el(
          'label',
          { class: 'check-line' },
          el('input', {
            type: 'checkbox',
            checked: !!t.fotos,
            onchange: e => {
              if (
                !e.target.checked &&
                !confirm('Desativar as fotos remove as fotos atuais de todos os alunos desta turma. Continuar?')
              ) {
                e.target.checked = true;
                return;
              }
              alternar('fotos')(e);
            }
          }),
          el('span', { text: 'Permitir fotos nos personagens dos alunos' })
        )
      )
    );
  }

  /* ---------- estatísticas ---------- */
  function barra(rotulo, valor, n) {
    const cls = valor < 50 ? 'low' : valor < 70 ? 'mid' : '';
    return el(
      'div',
      { class: 'bar-row' },
      el('span', { text: rotulo }),
      el(
        'div',
        { class: 'track', role: 'img', 'aria-label': `${rotulo}: ${valor}%` },
        el('span', { class: cls, style: { width: Math.max(2, valor) + '%' } })
      ),
      el('span', { class: 'val', text: n === 0 ? '–' : valor + '%' })
    );
  }

  function dados({ stats, ordenados, ordem, totalLicoes, totalMissoes, temEventos }) {
    const { indicadores: k, porTema, porTrilha, dificeis } = stats;
    const campos = [
      ['usuario', 'Usuário'],
      ['apelido', 'Apelido'],
      ['pesquisa', 'Cód. pesquisa'],
      ['nivel', 'Nível'],
      ['xp', 'XP'],
      ['missoes', 'Missões'],
      ['licoes', 'Lições'],
      ['acerto', 'Acerto 1ª'],
      ['qualidade', 'Qualidade'],
      ['tempo', 'Tempo'],
      ['ultimo', 'Último acesso']
    ];
    const corta = t => (t.length > 70 ? t.slice(0, 70) + '…' : t);
    corpo.replaceChildren(
      el(
        'div',
        { class: 'kpis' },
        el('div', { class: 'kpi' }, el('strong', { text: k.alunos }), el('span', { text: 'alunos cadastrados' })),
        el(
          'div',
          { class: 'kpi' },
          el('strong', { text: `${k.mediaMissoes}/${totalMissoes}` }),
          el('span', { text: 'missões por aluno (média)' })
        ),
        el('div', { class: 'kpi' }, el('strong', { text: k.mediaXp }), el('span', { text: 'XP médio' })),
        el(
          'div',
          { class: 'kpi' },
          el('strong', { text: k.acertoGeral == null ? '–' : k.acertoGeral + '%' }),
          el('span', { text: 'acertos de primeira' })
        )
      ),
      el(
        'div',
        { class: 'panel-grid' },
        el(
          'section',
          { class: 'panel-section' },
          el('h2', { text: 'Acerto de primeira por tema' }),
          el('p', { text: 'Temas em vermelho ou amarelo merecem revisão em sala.' }),
          el(
            'div',
            { class: 'bars' },
            porTema.map(t => barra(t.nome, t.valor, t.n))
          )
        ),
        el(
          'section',
          { class: 'panel-section' },
          el('h2', { text: 'Trilha de aprendizagem' }),
          el('p', { text: 'Alunos que concluíram as lições básicas de cada módulo.' }),
          el(
            'div',
            { class: 'bars' },
            porTrilha.map(t => barra(t.nome, t.valor, t.n))
          )
        )
      ),
      el(
        'section',
        { class: 'panel-section', style: { marginBottom: '1.2rem' } },
        el('h2', { text: 'Desafios com mais erros' }),
        el('p', {
          text: 'Porcentagem de alunos que não acertaram de primeira (considera só a primeira vez que cada aluno fez o desafio).'
        }),
        dificeis.length
          ? el(
              'div',
              { class: 'table-wrap' },
              el(
                'table',
                {},
                el(
                  'thead',
                  {},
                  el(
                    'tr',
                    {},
                    ['Fase', 'Desafio', 'Alunos', 'Erraram de primeira', 'Tentativas (média)'].map(t =>
                      el('th', { text: t })
                    )
                  )
                ),
                el(
                  'tbody',
                  {},
                  dificeis.map(d =>
                    el(
                      'tr',
                      {},
                      el('td', { text: d.fase }),
                      el('td', { text: corta(d.enunciado), title: d.enunciado }),
                      el('td', { text: d.n }),
                      el('td', { text: d.taxa + '%' }),
                      el('td', { text: d.media })
                    )
                  )
                )
              )
            )
          : el('p', { class: 'empty', text: 'Ainda não há desafios respondidos.' })
      ),
      el(
        'section',
        { class: 'panel-section' },
        el('h2', { text: 'Alunos' }),
        el('p', { text: 'Clique no título de uma coluna para ordenar.' }),
        ordenados.length
          ? el(
              'div',
              { class: 'table-wrap' },
              el(
                'table',
                {},
                el(
                  'thead',
                  {},
                  el(
                    'tr',
                    {},
                    campos.map(([c, t]) =>
                      el(
                        'th',
                        { 'aria-sort': ordem.campo === c ? (ordem.asc ? 'ascending' : 'descending') : null },
                        el(
                          'button',
                          { onclick: () => handlers.ordenar(c) },
                          t + (ordem.campo === c ? (ordem.asc ? ' ▲' : ' ▼') : '')
                        )
                      )
                    ),
                    el('th', { text: 'Ações' })
                  )
                ),
                el(
                  'tbody',
                  {},
                  ordenados.map(r =>
                    el(
                      'tr',
                      {},
                      el('td', {}, SQ.dom.avatar({ foto: r.foto, cor: r.cor, texto: r.apelido }), ' ', r.usuario),
                      el('td', { text: r.apelido }),
                      el('td', { text: r.pesquisa || '–' }),
                      el('td', { text: r.nivel }),
                      el('td', { text: r.xp }),
                      el('td', { text: `${r.missoes}/${totalMissoes}` }),
                      el('td', { text: `${r.licoes}/${totalLicoes}` }),
                      el('td', { text: r.acerto == null ? '–' : r.acerto + '%' }),
                      el('td', { text: r.qualidade + '%' }),
                      el('td', { text: U.formatarTempo(r.tempo * 1000) }),
                      el('td', { text: r.ultimo ? new Date(r.ultimo).toLocaleString('pt-BR') : '–' }),
                      el(
                        'td',
                        {},
                        handlers.redefinirSenha
                          ? el('button', {
                              class: 'btn ghost small',
                              onclick: () => handlers.redefinirSenha(r),
                              text: 'Nova senha'
                            })
                          : null,
                        r.foto
                          ? el('button', {
                              class: 'link',
                              onclick: () => handlers.removerFoto(r),
                              text: 'Remover foto'
                            })
                          : null
                      )
                    )
                  )
                )
              )
            )
          : el('p', {
              class: 'empty',
              text: 'Nenhum aluno nesta turma ainda. Passe o código de acesso para os alunos: eles se cadastram em "Primeiro acesso".'
            })
      ),
      el(
        'div',
        { class: 'actions' },
        el('button', {
          class: 'btn small',
          disabled: !temEventos,
          onclick: handlers.exportarEventos,
          text: 'Baixar CSV de eventos'
        }),
        el('button', {
          class: 'btn small ghost',
          disabled: !ordenados.length,
          onclick: handlers.exportarResumo,
          text: 'Baixar CSV de resumo por aluno'
        })
      ),
      $aviso
    );
  }

  return {
    turmas,
    dados,
    cabecalho,
    carregando: () => corpo.replaceChildren(el('p', { class: 'empty', text: 'Carregando dados da turma…' })),
    erro: msg => corpo.replaceChildren(el('p', { class: 'error-msg', text: msg })),
    aviso: msg => {
      $aviso.textContent = msg;
    }
  };
};
