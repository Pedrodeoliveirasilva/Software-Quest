/* =================================================================
   VIEW / TRILHA — lista de módulos e leitura das lições
   ================================================================= */
window.SQ = window.SQ || {};
SQ.views = SQ.views || {};

SQ.views.Trilha = (function () {
  const html = SQ.html;
  const U = SQ.util;
  const cfg = SQ.config;

  /* =================================================================
     Lista de módulos
     ================================================================= */
  function lista(container, { modulos, missoes, perfil, recomendacao, foco }, handlers) {
    const total = modulos.reduce((s, m) => s + m.licoes.length, 0);
    const feitas = Object.keys(perfil.licoes).length;

    const botaoLicao = (mod, l) => {
      const missaoFeita = perfil.missoes[mod.fase];
      const bloqueada = l.aprofundamento && !missaoFeita;
      const feita = !!perfil.licoes[l.id];
      return html` <button
        class="${feita ? 'licao-btn done' : 'licao-btn'}"
        ${html.atributos({ disabled: bloqueada })}
        onclick=${() => handlers.abrirLicao(mod, l)}
      >
        <span class="mark" aria-hidden="true">${feita ? '✓' : ''}</span>
        <span>${l.titulo}${feita ? html`<span class="sr-only"> (concluída)</span>` : null}</span>
        <span class="tag">${bloqueada ? 'Libera após a missão' : `${l.minutos} min`}</span>
      </button>`;
    };

    const modulo = (mod, idx) => {
      const missao = missoes.find(x => x.id === mod.fase);
      const resultado = perfil.missoes[mod.fase];
      const concluidas = mod.licoes.filter(l => perfil.licoes[l.id]).length;
      const progresso = (concluidas / mod.licoes.length) * 100 + '%';
      return html` <section class="modulo" id="mod-${mod.fase}">
        <div class="modulo-head">
          <h3>${idx + 1}. ${mod.titulo}</h3>
          <span class="muted" style="font-size: .9rem"
            >${resultado ? `Missão concluída · ${U.estrelas(resultado.estrelas)}` : `Missão na ${missao.sala}`}</span
          >
        </div>
        <div class="licoes">${mod.licoes.map(l => botaoLicao(mod, l))}</div>
        <div class="progress-line" aria-hidden="true">
          <span style="width: ${progresso}"></span>
        </div>
      </section>`;
    };

    container.replaceChildren(
      html` <p>
          Você concluiu ${feitas} de ${total} lições. Cada lição vale ${cfg.xpLicao} XP, e acertar a verificação de
          primeira vale mais ${cfg.xpVerificacao} XP.
        </p>
        <div class="card reco" style="margin-bottom: 1rem; padding: 1rem">
          <strong>Recomendado para você: </strong>${recomendacao.texto}
        </div>
        <div class="trilha">${modulos.map(modulo)}</div>`
    );

    // Rola até o módulo pedido e destaca a borda
    const blocoFoco = foco && container.querySelector('#mod-' + foco);
    if (blocoFoco) {
      setTimeout(() => {
        blocoFoco.scrollIntoView({ block: 'start' });
        blocoFoco.style.borderColor = 'var(--line)';
      }, 50);
    }
  }

  /* =================================================================
     Leitura da lição
     ================================================================= */
  function licao(container, { mod, licao: l, jaFeita }, handlers) {
    let tentativas = 0;
    let respondeu = false;
    const v = l.verificacao;
    const opcoes = U.embaralhar(v.opcoes);

    /* ---------- Blocos de conteúdo ---------- */
    const bloco = b => {
      if (b.tipo === 'p') return html`<p>${b.texto}</p>`;
      if (b.tipo === 'lista') {
        return html` ${b.titulo ? html`<h3>${b.titulo}</h3>` : null}
          <ul>
            ${b.itens.map(t => html`<li>${t}</li>`)}
          </ul>`;
      }
      if (b.tipo === 'exemplo') return html`<div class="exemplo"><strong>${b.titulo}</strong>${b.texto}</div>`;
      if (b.tipo === 'dica') return html`<div class="dica"><strong>Dica: </strong>${b.texto}</div>`;
      if (b.tipo === 'codigo') return html`<pre class="code">${b.texto}</pre>`;
      return null;
    };

    const alternativa = (op, k) =>
      html` <button class="option" type="button" onclick=${e => responder(e.currentTarget, op)}>
        <span class="key" aria-hidden="true">${'ABCD'[k]}</span>
        ${v.codigo ? html`<code>${op.texto}</code>` : html`<span>${op.texto}</span>`}
      </button>`;

    /* ---------- Montagem ---------- */
    const tela = html` <article class="lesson">
      <p class="muted">${mod.titulo} · ${l.minutos} min de leitura${l.aprofundamento ? ' · Aprofundamento' : ''}</p>
      ${l.blocos.map(bloco)}
      <section class="check">
        <h3>Verifique o que aprendeu</h3>
        <p style="font-weight: 700">${v.pergunta}</p>
        ${jaFeita ? html`<p class="muted">Você já concluiu esta lição. Pode responder de novo para praticar.</p>` : null}
        <div class="options" data-ref="opcoes">${opcoes.map(alternativa)}</div>
        <div aria-live="polite" data-ref="feedback"></div>
      </section>
      <div class="actions">
        <button class="btn" ${html.atributos({ disabled: !jaFeita })} onclick=${concluir} data-ref="concluir">
          ${jaFeita ? 'Voltar à trilha' : 'Concluir lição'}
        </button>
        <button class="btn ghost small" onclick=${handlers.voltar}>Voltar sem concluir</button>
      </div>
    </article>`;
    const refs = html.refs(tela);
    container.replaceChildren(tela);

    /* ---------- Eventos ---------- */
    function responder(botao, op) {
      if (respondeu || botao.disabled) return;
      if (op.correta) {
        respondeu = true;
        botao.classList.add('right');
        refs.opcoes.querySelectorAll('button').forEach(b => (b.disabled = true));
        refs.feedback.replaceChildren(
          html` <div class="feedback ok">
            <h3>${tentativas === 0 ? 'Isso mesmo!' : 'Agora sim!'}</h3>
            <p>${op.porque}</p>
          </div>`
        );
        refs.concluir.disabled = false;
        refs.concluir.focus({ preventScroll: true });
      } else {
        tentativas++;
        botao.classList.add('wrong');
        botao.disabled = true;
        refs.feedback.replaceChildren(
          html` <div class="feedback bad">
            <h3>Ainda não</h3>
            <p>${op.porque}</p>
            <p>Releia a lição e tente outra alternativa.</p>
          </div>`
        );
      }
    }

    function concluir() {
      handlers.concluir({ acertouPrimeira: tentativas === 0, tentativas: tentativas + 1 });
    }
  }

  return { lista, licao };
})();
