/* =================================================================
   VIEW / MISSÃO — desenha os desafios e o resumo da missão
   Os quatro tipos de desafio (escolha, classificar, selecionar, ordenar)
   coletam a resposta e chamam handlers.avaliar(resposta). A correção é
   feita pelo MissaoModel (via controller); aqui só se mostra o resultado.

   Para criar um tipo novo de desafio: escreva uma função como as de baixo,
   que devolve o elemento do desafio, e registre-a em TIPOS (no fim de desafio()).
   ================================================================= */
window.SQ = window.SQ || {};
SQ.views = SQ.views || {};

SQ.views.Missao = (function () {
  const html = SQ.html;
  const U = SQ.util;

  const tituloAcerto = t => ['Isso mesmo!', 'Acertou na segunda!', 'Acertou na terceira!'][t] || 'Acertou!';
  const restantes = n => (n === 1 ? 'Você tem mais 1 tentativa.' : `Você tem mais ${n} tentativas.`);

  /* =================================================================
     Um desafio
     ================================================================= */
  function desafio(container, { desafio: d, indice, total, sala, ultimo }, handlers) {
    /* ---------- Partes comuns a todos os tipos ---------- */
    const areaFeedback = html.elemento`<div aria-live="polite"></div>`;
    const areaAcoes = html.elemento`<div class="actions"></div>`;

    /** Caixa de feedback: tipo 'ok', 'bad' ou 'reveal', um título e parágrafos. */
    function feedback(tipo, titulo, ...textos) {
      areaFeedback.replaceChildren(
        html` <div class="feedback ${tipo}">
          <h3>${titulo}</h3>
          ${textos.filter(Boolean).map(t => html`<p>${t}</p>`)}
        </div>`
      );
    }

    /** Desafio concluído (acertou ou esgotou as tentativas): mostra os pontos e o botão de seguir. */
    function terminou(r) {
      areaAcoes.replaceChildren(
        html` ${r.registro.pontos ? html`<span class="points-pop">+${r.registro.pontos} XP</span>` : null}
          <button class="btn" onclick=${handlers.proximo}>${ultimo ? 'Concluir missão' : 'Próximo desafio'}</button>`
      );
      const botao = areaAcoes.querySelector('.btn');
      if (botao) botao.focus({ preventScroll: true });
    }

    /** Conteúdo extra acima das alternativas: aviso de consequência, trecho de código ou registro do pipeline. */
    function extras() {
      return [
        d.consequencia
          ? html` <div class="context">
              <p>
                <strong>Consequência de uma decisão anterior. </strong>Erros nos requisitos não somem: eles aparecem
                depois, quando custam mais caro.
              </p>
            </div>`
          : null,
        d.trecho ? html`<pre class="code">${d.trecho}</pre>` : null,
        d.log
          ? html`<pre class="code" aria-label="Registro do pipeline">
${d.log.map((linha, i) => [
                html`<span class="log-line ${linha.ok ? 'ok' : 'bad'}">${linha.t}</span>`,
                i < d.log.length - 1 ? '\n' : ''
              ])}</pre>`
          : null
      ];
    }

    /* ---------- Tipo: escolha ---------- */
    function escolha() {
      const opcoes = U.embaralhar(d.opcoes);
      const grupo = html.elemento`
        <div class="options" role="group" aria-label="Alternativas">
          ${opcoes.map(
            (o, i) =>
              html` <button class="option" type="button" onclick=${e => responder(e.currentTarget, o)}>
                <span class="key" aria-hidden="true">${'ABCDE'[i]}</span>
                ${d.codigo ? html`<code>${o.texto}</code>` : html`<span>${o.texto}</span>`}
              </button>`
          )}
        </div>`;
      const botoes = [...grupo.querySelectorAll('button')];

      function responder(botao, o) {
        if (botao.disabled) return;
        const r = handlers.avaliar(o);
        if (!r) return;
        if (r.status === 'acerto') {
          botao.classList.add('right');
          botoes.forEach(b => (b.disabled = true));
          feedback('ok', tituloAcerto(r.tentativasAntes), o.porque);
          terminou(r);
          return;
        }
        botao.classList.add('wrong');
        botao.disabled = true;
        if (r.status === 'esgotou') {
          const certa = opcoes.findIndex(x => x.correta);
          botoes[certa].classList.add('right');
          botoes.forEach(b => (b.disabled = true));
          const textoCerta = `A resposta certa é: "${opcoes[certa].texto}". ${opcoes[certa].porque}`;
          feedback('reveal', 'Vamos ver a resposta', o.porque, textoCerta);
          terminou(r);
        } else {
          feedback('bad', 'Ainda não', o.porque, restantes(r.restantes));
        }
      }

      return grupo;
    }

    /* ---------- Tipo: classificar ---------- */
    function classificar() {
      const itens = U.embaralhar(d.itens);
      const escolhas = new Array(itens.length).fill(null);

      const linhaDoItem = (item, i) =>
        html` <div class="c-item" role="group" aria-label="${item.texto}">
          <div class="text">${item.texto}</div>
          <div class="chips">
            ${d.categorias.map(
              cat =>
                html`<button
                  class="chip"
                  type="button"
                  aria-pressed="false"
                  onclick=${e => escolherCategoria(e, i, cat)}
                >
                  ${cat}
                </button>`
            )}
          </div>
          <p class="why"></p>
        </div>`;

      const corpo = html.elemento`
        <div>
          <div class="classify">${itens.map(linhaDoItem)}</div>
          <div class="actions">
            <button class="btn" type="button" disabled onclick=${verificar} data-ref="verificar">Verificar</button>
          </div>
        </div>`;
      const refs = html.refs(corpo);
      const linhas = [...corpo.querySelectorAll('.c-item')];
      const porque = i => linhas[i].querySelector('.why');
      const travar = () => corpo.querySelectorAll('.chip').forEach(c => (c.disabled = true));

      function escolherCategoria(evento, i, cat) {
        if (evento.currentTarget.disabled) return;
        escolhas[i] = cat;
        linhas[i]
          .querySelectorAll('.chip')
          .forEach(c => c.setAttribute('aria-pressed', c.textContent === cat ? 'true' : 'false'));
        linhas[i].classList.remove('wrong');
        porque(i).textContent = '';
        refs.verificar.disabled = escolhas.some(x => x === null);
      }

      function verificar() {
        const r = handlers.avaliar({ itens, escolhas });
        if (!r) return;
        linhas.forEach((linha, i) => {
          const errado = r.erros && r.erros.includes(i);
          linha.classList.toggle('right', !errado);
          linha.classList.toggle('wrong', errado);
          porque(i).textContent = errado ? 'Reveja este item.' : '';
        });
        if (r.status === 'acerto') {
          travar();
          refs.verificar.remove();
          feedback('ok', tituloAcerto(r.tentativasAntes), d.explicacao);
          terminou(r);
        } else if (r.status === 'esgotou') {
          linhas.forEach((linha, i) => {
            const item = itens[i];
            linha.classList.remove('wrong');
            linha.classList.add('right');
            linha.querySelectorAll('.chip').forEach(c => {
              c.disabled = true;
              c.setAttribute('aria-pressed', c.textContent === item.correta ? 'true' : 'false');
            });
            porque(i).textContent = `${item.correta}: ${item.porque}`;
          });
          refs.verificar.remove();
          feedback('reveal', 'Vamos ver a resposta', d.explicacao);
          terminou(r);
        } else {
          const titulo =
            r.erros.length === 1 ? '1 item ainda está errado' : `${r.erros.length} itens ainda estão errados`;
          const instrucao = 'Os itens marcados em vermelho precisam de outra classificação.';
          feedback('bad', titulo, instrucao, d.explicacao, restantes(r.restantes));
        }
      }

      return corpo;
    }

    /* ---------- Tipo: selecionar (montar a Sprint) ---------- */
    function selecionar() {
      const selecionados = new Set();

      const corpo = html.elemento`
        <div>
          <div class="capacity">
            <span>Capacidade da equipe</span>
            <div class="cap-bar" aria-hidden="true" data-ref="barra"><span style="width:0%" data-ref="preenchido"></span></div>
            <span data-ref="total">0 de ${d.capacidade} pontos</span>
          </div>
          <div class="backlog" role="group" aria-label="Product Backlog">
            ${d.itens.map(
              (item, i) =>
                html` <button
                  class="pbi"
                  type="button"
                  aria-pressed="false"
                  onclick=${e => alternar(e.currentTarget, item)}
                >
                  <span class="prio">#${i + 1}</span>
                  <span>${item.texto}</span>
                  <span class="pts">${item.pontos} pts</span>
                </button>`
            )}
          </div>
          <div class="actions">
            <button class="btn" type="button" disabled onclick=${verificar} data-ref="verificar">Confirmar a Sprint</button>
          </div>
        </div>`;
      const refs = html.refs(corpo);
      const cartoes = [...corpo.querySelectorAll('.pbi')];

      function atualizarCapacidade() {
        const soma = d.itens.filter(i => selecionados.has(i.id)).reduce((s, i) => s + i.pontos, 0);
        refs.total.textContent = `${soma} de ${d.capacidade} pontos`;
        refs.preenchido.style.width = Math.min(100, (soma / d.capacidade) * 100) + '%';
        refs.barra.classList.toggle('over', soma > d.capacidade);
        refs.verificar.disabled = selecionados.size === 0;
      }

      function alternar(cartao, item) {
        if (cartao.disabled) return;
        if (selecionados.has(item.id)) selecionados.delete(item.id);
        else selecionados.add(item.id);
        cartao.setAttribute('aria-pressed', selecionados.has(item.id) ? 'true' : 'false');
        areaFeedback.replaceChildren();
        atualizarCapacidade();
      }

      function verificar() {
        const r = handlers.avaliar([...selecionados]);
        if (!r) return;
        if (r.status === 'acerto') {
          cartoes.forEach(c => (c.disabled = true));
          refs.verificar.remove();
          feedback('ok', tituloAcerto(r.tentativasAntes), d.explicacao);
          terminou(r);
        } else if (r.status === 'esgotou') {
          const esperado = new Set(d.esperado);
          cartoes.forEach((c, i) => {
            c.disabled = true;
            c.setAttribute('aria-pressed', esperado.has(d.itens[i].id) ? 'true' : 'false');
          });
          selecionados.clear();
          d.esperado.forEach(x => selecionados.add(x));
          atualizarCapacidade();
          refs.verificar.remove();
          feedback('reveal', 'Vamos ver a resposta', r.motivo, d.explicacao);
          terminou(r);
        } else {
          feedback('bad', 'Essa Sprint ainda não está boa', r.motivo, restantes(r.restantes));
        }
      }

      return corpo;
    }

    /* ---------- Tipo: ordenar ---------- */
    function ordenar() {
      let disponiveis = U.embaralhar(d.itens);
      if (disponiveis.every((x, i) => x === d.itens[i])) disponiveis.reverse();
      let sequencia = [];
      let marcas = null; // acertos de cada posição, depois de verificar
      let travado = false;

      const corpo = html.elemento`
        <div>
          <div class="order-zone">
            <div class="order-col">
              <h3>Etapas</h3>
              <ul class="order-list" aria-label="Etapas disponíveis" data-ref="origem"></ul>
            </div>
            <div class="order-col">
              <h3>Sua ordem</h3>
              <ol class="order-list target" aria-label="Sua ordem" data-ref="destino"></ol>
            </div>
          </div>
          <div class="actions">
            <button class="btn" type="button" disabled onclick=${verificar} data-ref="verificar">Verificar a ordem</button>
            <button class="btn ghost small" type="button" onclick=${recomecar} data-ref="recomecar">Recomeçar</button>
          </div>
        </div>`;
      const refs = html.refs(corpo);

      function desenharListas() {
        const classeNoDestino = i => (marcas ? (marcas[i] ? 'o-item right' : 'o-item wrong') : 'o-item');
        refs.origem.replaceChildren(
          disponiveis.length
            ? html`${disponiveis.map(t => html`<li><button class="o-item" type="button" aria-label="Adicionar: ${t}" onclick=${() => adicionar(t)}>${t}</button></li>`)}`
            : html`<li class="empty-slot">Todas as etapas foram posicionadas.</li>`
        );
        refs.destino.replaceChildren(
          sequencia.length
            ? html`${sequencia.map((t, i) => html`<li><button class="${classeNoDestino(i)}" type="button" aria-label="Remover: ${t}" onclick=${() => remover(t)}>${t}</button></li>`)}`
            : html`<li class="empty-slot">Clique nas etapas, na ordem certa.</li>`
        );
        refs.verificar.disabled = disponiveis.length > 0 || travado;
      }

      function adicionar(etapa) {
        if (travado) return;
        marcas = null;
        disponiveis = disponiveis.filter(x => x !== etapa);
        sequencia.push(etapa);
        desenharListas();
      }
      function remover(etapa) {
        if (travado) return;
        marcas = null;
        sequencia = sequencia.filter(x => x !== etapa);
        disponiveis.push(etapa);
        desenharListas();
      }
      function recomecar() {
        if (travado) return;
        disponiveis = U.embaralhar(d.itens);
        sequencia = [];
        marcas = null;
        areaFeedback.replaceChildren();
        desenharListas();
      }
      function concluir() {
        travado = true;
        refs.verificar.remove();
        refs.recomecar.remove();
      }

      function verificar() {
        const r = handlers.avaliar(sequencia.slice());
        if (!r) return;
        marcas = r.marcas;
        if (r.status === 'acerto') {
          concluir();
          feedback('ok', tituloAcerto(r.tentativasAntes), d.explicacao);
          terminou(r);
          desenharListas();
        } else if (r.status === 'esgotou') {
          sequencia = d.itens.slice();
          disponiveis = [];
          marcas = sequencia.map(() => true);
          concluir();
          feedback('reveal', 'Vamos ver a resposta', d.explicacao);
          terminou(r);
          desenharListas();
        } else {
          desenharListas();
          const titulo = `${r.certos} de ${d.itens.length} etapas na posição certa`;
          const instrucao = 'As etapas em vermelho estão fora do lugar. Clique nelas para devolvê-las e tente de novo.';
          feedback('bad', titulo, instrucao, restantes(r.restantes));
        }
      }

      desenharListas();
      return corpo;
    }

    /* ---------- Montagem da tela do desafio ---------- */
    const TIPOS = { escolha, classificar, selecionar, ordenar };
    const pontinho = i => (i < indice ? 'done' : i === indice ? 'now' : '');

    container.replaceChildren(
      html` <div class="challenge-top">
          <span class="muted">${sala} · Desafio ${indice + 1} de ${total}</span>
          <div class="dots" aria-hidden="true">
            ${Array.from({ length: total }, (_, i) => html`<span class="${pontinho(i)}"></span>`)}
          </div>
        </div>
        <p class="prompt">${d.enunciado}</p>
        ${extras()} ${TIPOS[d.tipo]()} ${areaFeedback} ${areaAcoes}`
    );
  }

  /* =================================================================
     Resumo ao final da missão
     ================================================================= */
  function resumo(container, { missao, res, primeiraVez, xpGanho, subiu, nivel, proxima, modulo }, handlers) {
    const MENSAGEM_POR_ESTRELAS = {
      3: 'Excelente: você dominou esta etapa.',
      2: 'Bom trabalho! Revise a trilha para acertar ainda mais de primeira.',
      1: 'Missão concluída. Vale revisar este tema na trilha antes de seguir.'
    };
    const indicador = (valor, legenda) =>
      html`<div class="fact"><strong>${valor}</strong><span>${legenda}</span></div>`;

    container.replaceChildren(
      html` <section class="summary">
        <div class="big-stars" role="img" aria-label="${res.estrelas} de 3 estrelas">
          ${'★'.repeat(res.estrelas)}<span class="off">${'★'.repeat(3 - res.estrelas)}</span>
        </div>
        <h2>${missao.titulo}</h2>
        <p class="muted">${MENSAGEM_POR_ESTRELAS[res.estrelas]}</p>
        ${primeiraVez ? html`<div class="reward"><span class="icon" aria-hidden="true">${missao.item.icone}</span>Você ganhou: ${missao.item.nome}</div>` : null}
        <div class="facts">
          ${indicador('+' + xpGanho, 'XP')} ${indicador(`${res.acertosPrimeira}/${res.total}`, 'de primeira')}
          ${indicador(U.formatarTempo(res.tempoSegundos * 1000), 'de missão')}
        </div>
        ${subiu ? html`<p style="font-weight: 700">Você subiu de nível: ${nivel}!</p>` : null}
        ${!primeiraVez ? html`<p class="muted">Você já tinha concluído esta missão. Vale a sua melhor pontuação.</p>` : null}
        <div class="context" style="text-align: left; max-width: 36em; margin: 1rem auto">
          <p><strong>${missao.npc}: </strong>${missao.falaFim}</p>
          ${primeiraVez && proxima ? html`<p class="muted">A porta da ${proxima.sala} foi liberada.</p>` : null}
        </div>
        <div class="actions" style="justify-content: center">
          <button class="btn" onclick=${handlers.voltar}>Voltar ao escritório</button>
          ${res.estrelas < 3 ? html`<button class="btn ghost" onclick=${handlers.revisar}>Revisar "${modulo.titulo}"</button>` : null}
        </div>
      </section>`
    );
  }

  return { desafio, resumo };
})();
