/* =================================================================
   VIEW / COLEÇÕES — diário de missões, mochila e ranking da turma
   ================================================================= */
window.SQ = window.SQ || {};
SQ.views = SQ.views || {};

SQ.views.Colecoes = (function () {
  const html = SQ.html;
  const U = SQ.util;

  /* ---------- Diário de missões ---------- */
  function missoes(container, { missoes, perfil, status }, handlers) {
    const classeDaLinha = { concluida: 'quest done', disponivel: 'quest current', bloqueada: 'quest' };

    const situacao = (m, st) => {
      if (st === 'concluida') {
        const estrelas = perfil.missoes[m.id].estrelas;
        return html`<span class="stars" aria-label="${estrelas} estrelas">${U.estrelas(estrelas)}</span>`;
      }
      if (st === 'disponivel')
        return html`<button class="btn small" onclick=${() => handlers.irAte(m)}>Ir até lá</button>`;
      return html`<span class="muted" style="font-size: .9rem">Bloqueada</span>`;
    };

    const linha = (m, i) => {
      const st = status(i);
      return html` <div class="${classeDaLinha[st]}">
        <span class="n">${st === 'concluida' ? '✓' : i + 1}</span>
        <div>
          <strong>${m.titulo}</strong>
          <div class="muted" style="font-size: .9rem">${m.npc} · ${m.sala}</div>
        </div>
        ${situacao(m, st)}
      </div>`;
    };

    container.replaceChildren(html`<div class="quests">${missoes.map(linha)}</div>`);
  }

  /* ---------- Mochila ---------- */
  function mochila(container, { missoes, perfil, nivel, estrelas }) {
    const indicador = (valor, legenda) =>
      html` <div class="fact">
        <strong>${valor}</strong>
        <span>${legenda}</span>
      </div>`;

    const item = m => {
      const tem = perfil.itens.includes(m.id);
      return html` <div class="${tem ? 'inv-item' : 'inv-item off'}">
        <div class="icon" aria-hidden="true">${tem ? m.item.icone : '?'}</div>
        <strong>${tem ? m.item.nome : 'Item bloqueado'}</strong>
        <span class="muted" style="font-size: .85rem">${tem ? m.nome : `Missão: ${m.nome}`}</span>
      </div>`;
    };

    container.replaceChildren(
      html` <div class="facts" style="max-width: none; grid-template-columns: repeat(4, 1fr)">
          ${indicador(nivel, 'nível')} ${indicador(perfil.xp, 'XP')}
          ${indicador(`${estrelas}/${missoes.length * 3}`, 'estrelas')}
          ${indicador(Object.keys(perfil.licoes).length, 'lições')}
        </div>
        <h3 style="margin: 1rem 0 .6rem">Itens conquistados</h3>
        <div class="inv">${missoes.map(item)}</div>`
    );
  }

  /* ---------- Ranking ---------- */
  function rankingCarregando(container, turma) {
    container.replaceChildren(
      html` <p class="muted">
          ${turma}. O ranking mostra apenas apelidos e conta a sua melhor pontuação em cada missão.
        </p>
        <div class="rank-area">
          <p class="empty">Carregando ranking…</p>
        </div>`
    );
  }

  function ranking(container, { lista, uid, erro }) {
    const area = container.querySelector('.rank-area');
    if (erro) {
      area.replaceChildren(html`<p class="error-msg">Não foi possível carregar o ranking: ${erro}</p>`);
      return;
    }
    const posicao = lista.findIndex(d => d.uid === uid);

    const linha = (d, k) => {
      const souEu = d.uid === uid;
      const avatar = SQ.dom.avatar({
        foto: d.avatar && d.avatar.foto,
        cor: d.avatar && d.avatar.cor,
        texto: d.apelido
      });
      return html` <li class="${souEu ? 'me' : ''}">
        <span class="pos">${k + 1}º</span>
        ${avatar}
        <div>
          <strong>${d.apelido}${souEu ? ' (você)' : ''}</strong>
          <div class="sub">${d.nivel} · ${d.missoes || 0}/7 missões</div>
        </div>
        <span class="xp">${d.xp} XP</span>
      </li>`;
    };

    area.replaceChildren(
      html` ${posicao >= 0 ? html`<p>Sua posição: ${posicao + 1}º de ${lista.length}</p>` : null}
        <ol class="rank">
          ${lista.slice(0, 30).map(linha)}
        </ol>
        ${posicao >= 30 ? html`<p class="muted">Você está em ${posicao + 1}º lugar. Continue jogando para subir!</p>` : null}`
    );
  }

  return { missoes, mochila, rankingCarregando, ranking };
})();
