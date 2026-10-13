/* =================================================================
   VIEW / PAINEL — tela do professor
   Recebe turmas e estatísticas prontas (calculadas pelo PainelModel) e
   repassa as ações ao ProfessorController.

   Partes da tela, de cima para baixo:
     cabeçalho → filtro de turmas → formulário "Nova turma" → cartão da turma
     → indicadores → gráficos → desafios com mais erros → alunos → exportação
   ================================================================= */
window.SQ = window.SQ || {};
SQ.views = SQ.views || {};

SQ.views.Painel = function (raiz, { prof, handlers }) {
  const html = SQ.html;
  const U = SQ.util;

  /* =================================================================
     Esqueleto da página
     ================================================================= */
  const pagina = html` <main class="wrap">
    <div class="panel-head">
      <div class="panel-who" data-ref="quem"></div>
      <div class="actions" style="margin-top: 0">
        <button class="link" onclick=${handlers.privacidade}>Privacidade</button>
        <button class="btn ghost small" onclick=${handlers.minhaConta}>Minha conta</button>
        <button class="btn ghost small" onclick=${handlers.sair}>Sair</button>
      </div>
    </div>
    <div data-ref="areaTurmas"></div>
    <div data-ref="corpo"><p class="empty">Carregando dados…</p></div>
  </main>`;
  const refs = html.refs(pagina);
  const aviso = html.elemento`<p class="muted" aria-live="polite"></p>`;
  raiz.replaceChildren(pagina);
  cabecalho(prof);

  /** Foto, nome e escola do professor. */
  function cabecalho(p) {
    refs.quem.replaceChildren(
      html` ${SQ.dom.avatar({ foto: p.foto, cor: '#6B3FD6', texto: p.nome, tamanho: 'medio' })}
        <div>
          <p class="muted" style="margin: 0">${[p.nome, p.escola].filter(Boolean).join(' · ')}</p>
          <h1>Painel do professor</h1>
        </div>`
    );
  }

  /* =================================================================
     Turmas
     ================================================================= */
  function turmas({ turmas, turmaSel }) {
    const formulario = formularioNovaTurma();
    const turmaAtual = turmas.find(x => x.id === turmaSel);

    const filtro = html` <div class="rank-filter">
      ${
        turmas.length
          ? html` <label for="f-turma">Turma</label>
              <select id="f-turma" class="btn ghost small" onchange=${e => handlers.selecionarTurma(e.target.value)}>
                ${turmas.map(
                  x =>
                    html`<option value="${x.id}" ${html.atributos({ selected: x.id === turmaSel })}>
                      ${x.nome}${x.ativa ? '' : ' (cadastros fechados)'}
                    </option>`
                )}
              </select>`
          : null
      }
      <button class="btn small" onclick=${() => formulario.abrir()}>+ Nova turma</button>
      ${turmas.length ? html`<button class="btn ghost small" onclick=${handlers.atualizar}>Atualizar dados</button>` : null}
    </div>`;

    const semTurmas = html` <div class="card" style="margin-bottom: 1rem">
      <h2 style="font-size: 1.2rem; margin-bottom: .4rem">Comece criando sua primeira turma</h2>
      <p class="muted" style="margin: 0">
        Cada turma recebe um código de acesso. Os alunos usam esse código para criar a conta e entrar no jogo, e os
        dados deles aparecem aqui.
      </p>
    </div>`;

    refs.areaTurmas.replaceChildren(
      html` ${filtro} ${formulario.elemento} ${!turmas.length ? semTurmas : null}
      ${turmaAtual ? cartaoTurma(turmaAtual) : null}`
    );
    if (!turmas.length) refs.corpo.replaceChildren();
  }

  /** Formulário "Nova turma" (começa escondido). Devolve { elemento, abrir }. */
  function formularioNovaTurma() {
    const form = html.elemento`
      <form class="card hidden" style="margin-bottom: 1rem" onsubmit=${criar}>
        <h2 style="font-size: 1.15rem; margin-bottom: .8rem">Nova turma</h2>
        <div class="form-grid">
          <div class="field">
            <label for="t-nome">Nome da turma</label>
            <input id="t-nome" maxlength="60" placeholder="Ex.: 2ª série A — Desenvolvimento de Sistemas" data-ref="nome">
          </div>
          <div class="field">
            <label for="t-escola">Escola</label>
            <input id="t-escola" maxlength="80" value="${prof.escola || ''}" data-ref="escola">
          </div>
          <label class="check-line">
            <input id="t-pesq" type="checkbox" data-ref="pesquisa">
            <span><strong>Turma participante de pesquisa. </strong>O cadastro dos alunos pedirá também o código de participante (P01 a P99) usado nos formulários de pré e pós-teste.</span>
          </label>
          <p class="error-msg" role="alert" data-ref="erro"></p>
          <div class="actions" style="margin-top: 0">
            <button class="btn" type="submit">Criar turma</button>
            <button class="btn ghost small" type="button" onclick=${() => form.classList.add('hidden')}>Cancelar</button>
          </div>
        </div>
      </form>`;
    const campos = html.refs(form);
    const travar = sim => form.querySelectorAll('button,input').forEach(x => (x.disabled = sim));

    async function criar(evento) {
      evento.preventDefault();
      campos.erro.textContent = '';
      travar(true);
      try {
        await handlers.criarTurma({
          nome: campos.nome.value,
          escola: campos.escola.value,
          pesquisa: campos.pesquisa.checked
        });
      } catch (x) {
        campos.erro.textContent = x.message;
        travar(false);
        if (x.campo === 'nome') campos.nome.focus();
      }
    }

    return {
      elemento: form,
      abrir() {
        form.classList.remove('hidden');
        campos.nome.focus();
      }
    };
  }

  /** Cartão da turma selecionada: nome, código de acesso e opções. */
  function cartaoTurma(t) {
    const descricao = [t.escola, t.pesquisa ? 'Participante de pesquisa' : null].filter(Boolean).join(' · ') || ' ';
    const alternar = campo => evento =>
      handlers
        .alterarTurma(t, { [campo]: evento.target.checked })
        .catch(() => (evento.target.checked = !evento.target.checked));

    function alternarFotos(evento) {
      const desligando = !evento.target.checked;
      if (
        desligando &&
        !confirm('Desativar as fotos remove as fotos atuais de todos os alunos desta turma. Continuar?')
      ) {
        evento.target.checked = true;
        return;
      }
      alternar('fotos')(evento);
    }

    const opcao = (marcada, aoMudar, texto) =>
      html` <label class="check-line">
        <input type="checkbox" ${html.atributos({ checked: marcada })} onchange=${aoMudar} />
        <span>${texto}</span>
      </label>`;

    return html` <div class="card turma-card" style="margin-bottom: 1.2rem">
      <div class="turma-info">
        <div>
          <h2 style="font-size: 1.25rem">${t.nome}</h2>
          <p class="muted" style="margin: .2rem 0 0">${descricao}</p>
        </div>
        <div class="codigo-box">
          <span class="muted" style="font-size: .85rem">Código de acesso</span>
          <strong class="codigo">${U.formatarCodigo(t.codigo)}</strong>
          <button class="btn ghost small" onclick=${() => handlers.copiarInstrucao(t)}>
            Copiar instrução para os alunos
          </button>
        </div>
      </div>
      <div class="actions" style="margin-top: .8rem">
        ${opcao(t.ativa, alternar('ativa'), 'Aceitar novos cadastros')}
        ${opcao(t.pesquisa, alternar('pesquisa'), 'Pedir código de participante da pesquisa')}
        ${opcao(!!t.fotos, alternarFotos, 'Permitir fotos nos personagens dos alunos')}
      </div>
    </div>`;
  }

  /* =================================================================
     Dados da turma
     ================================================================= */
  const COLUNAS_ALUNOS = [
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

  /** Uma linha de gráfico de barras: roxo, amarelo (.mid) abaixo de 70% ou vermelho (.low) abaixo de 50%. */
  function barra(rotulo, valor, quantidade) {
    const cor = valor < 50 ? 'low' : valor < 70 ? 'mid' : '';
    return html` <div class="bar-row">
      <span>${rotulo}</span>
      <div class="track" role="img" aria-label="${rotulo}: ${valor}%">
        <span class="${cor}" style="width: ${Math.max(2, valor)}%"></span>
      </div>
      <span class="val">${quantidade === 0 ? '–' : valor + '%'}</span>
    </div>`;
  }

  function indicadores(k, totalMissoes) {
    const kpi = (valor, legenda) => html`<div class="kpi"><strong>${valor}</strong><span>${legenda}</span></div>`;
    return html` <div class="kpis">
      ${kpi(k.alunos, 'alunos cadastrados')} ${kpi(`${k.mediaMissoes}/${totalMissoes}`, 'missões por aluno (média)')}
      ${kpi(k.mediaXp, 'XP médio')} ${kpi(k.acertoGeral == null ? '–' : k.acertoGeral + '%', 'acertos de primeira')}
    </div>`;
  }

  function graficos(porTema, porTrilha) {
    return html` <div class="panel-grid">
      <section class="panel-section">
        <h2>Acerto de primeira por tema</h2>
        <p>Temas em vermelho ou amarelo merecem revisão em sala.</p>
        <div class="bars">${porTema.map(t => barra(t.nome, t.valor, t.n))}</div>
      </section>
      <section class="panel-section">
        <h2>Trilha de aprendizagem</h2>
        <p>Alunos que concluíram as lições básicas de cada módulo.</p>
        <div class="bars">${porTrilha.map(t => barra(t.nome, t.valor, t.n))}</div>
      </section>
    </div>`;
  }

  function tabelaDificeis(dificeis) {
    const encurtar = t => (t.length > 70 ? t.slice(0, 70) + '…' : t);
    const conteudo = dificeis.length
      ? html` <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fase</th>
                <th>Desafio</th>
                <th>Alunos</th>
                <th>Erraram de primeira</th>
                <th>Tentativas (média)</th>
              </tr>
            </thead>
            <tbody>
              ${dificeis.map(
                d =>
                  html` <tr>
                    <td>${d.fase}</td>
                    <td title="${d.enunciado}">${encurtar(d.enunciado)}</td>
                    <td>${d.n}</td>
                    <td>${d.taxa}%</td>
                    <td>${d.media}</td>
                  </tr>`
              )}
            </tbody>
          </table>
        </div>`
      : html`<p class="empty">Ainda não há desafios respondidos.</p>`;

    return html` <section class="panel-section" style="margin-bottom: 1.2rem">
      <h2>Desafios com mais erros</h2>
      <p>
        Porcentagem de alunos que não acertaram de primeira (considera só a primeira vez que cada aluno fez o desafio).
      </p>
      ${conteudo}
    </section>`;
  }

  function tabelaAlunos(ordenados, ordem, totalMissoes, totalLicoes) {
    const cabecalhoDaColuna = ([campo, titulo]) => {
      const ativa = ordem.campo === campo;
      const sentido = ativa ? (ordem.asc ? 'ascending' : 'descending') : null;
      const seta = ativa ? (ordem.asc ? ' ▲' : ' ▼') : '';
      return html`<th ${html.atributos({ 'aria-sort': sentido })}>
        <button onclick=${() => handlers.ordenar(campo)}>${titulo}${seta}</button>
      </th>`;
    };

    const linha = r =>
      html` <tr>
        <td>${SQ.dom.avatar({ foto: r.foto, cor: r.cor, texto: r.apelido })} ${r.usuario}</td>
        <td>${r.apelido}</td>
        <td>${r.pesquisa || '–'}</td>
        <td>${r.nivel}</td>
        <td>${r.xp}</td>
        <td>${r.missoes}/${totalMissoes}</td>
        <td>${r.licoes}/${totalLicoes}</td>
        <td>${r.acerto == null ? '–' : r.acerto + '%'}</td>
        <td>${r.qualidade}%</td>
        <td>${U.formatarTempo(r.tempo * 1000)}</td>
        <td>${r.ultimo ? new Date(r.ultimo).toLocaleString('pt-BR') : '–'}</td>
        <td>
          ${handlers.redefinirSenha ? html`<button class="btn ghost small" onclick=${() => handlers.redefinirSenha(r)}>Nova senha</button>` : null}
          ${r.foto ? html`<button class="link" onclick=${() => handlers.removerFoto(r)}>Remover foto</button>` : null}
        </td>
      </tr>`;

    const conteudo = ordenados.length
      ? html` <div class="table-wrap">
          <table>
            <thead>
              <tr>
                ${COLUNAS_ALUNOS.map(cabecalhoDaColuna)}
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              ${ordenados.map(linha)}
            </tbody>
          </table>
        </div>`
      : html`<p class="empty">
          Nenhum aluno nesta turma ainda. Passe o código de acesso para os alunos: eles se cadastram em "Primeiro
          acesso".
        </p>`;

    return html` <section class="panel-section">
      <h2>Alunos</h2>
      <p>Clique no título de uma coluna para ordenar.</p>
      ${conteudo}
    </section>`;
  }

  function exportacao(temEventos, temAlunos) {
    return html` <div class="actions">
      <button class="btn small" ${html.atributos({ disabled: !temEventos })} onclick=${handlers.exportarEventos}>
        Baixar CSV de eventos
      </button>
      <button class="btn small ghost" ${html.atributos({ disabled: !temAlunos })} onclick=${handlers.exportarResumo}>
        Baixar CSV de resumo por aluno
      </button>
    </div>`;
  }

  /** Monta todos os dados da turma de uma vez. */
  function dados({ stats, ordenados, ordem, totalLicoes, totalMissoes, temEventos }) {
    refs.corpo.replaceChildren(
      html` ${indicadores(stats.indicadores, totalMissoes)} ${graficos(stats.porTema, stats.porTrilha)}
      ${tabelaDificeis(stats.dificeis)} ${tabelaAlunos(ordenados, ordem, totalMissoes, totalLicoes)}
      ${exportacao(temEventos, ordenados.length > 0)} ${aviso}`
    );
  }

  /* =================================================================
     Interface usada pelo ProfessorController
     ================================================================= */
  return {
    turmas,
    dados,
    cabecalho,
    carregando: () => refs.corpo.replaceChildren(html`<p class="empty">Carregando dados da turma…</p>`),
    erro: mensagem => refs.corpo.replaceChildren(html`<p class="error-msg">${mensagem}</p>`),
    aviso: mensagem => (aviso.textContent = mensagem)
  };
};
