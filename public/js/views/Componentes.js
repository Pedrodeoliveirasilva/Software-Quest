/* =================================================================
   VIEW / COMPONENTES — pedaços de interface reaproveitados em várias telas
   - seletorFoto: prévia da foto com botões "Escolher foto" e "Remover"
   - seletorCor e seletorClasse: escolhas do personagem
   Cada função devolve um elemento pronto para ser colocado num template.
   ================================================================= */
window.SQ = window.SQ || {};
SQ.views = SQ.views || {};

SQ.views.componentes = (function () {
  const html = SQ.html;
  const U = SQ.util;

  /** Marca o botão escolhido de um grupo (aria-pressed) e desmarca os outros. */
  function marcarEscolhido(grupo, escolhido) {
    grupo.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b === escolhido ? 'true' : 'false'));
  }

  /**
   * Seletor de foto.
   * opções: { foto, cor, texto, dica, permitido, mensagemBloqueio, onMudar(fotoOuNull) → Promise }
   * Quando a pessoa escolhe uma imagem, ela é reduzida (SQ.imagem) e entregue a onMudar.
   */
  function seletorFoto(o) {
    let foto = o.foto || null;
    const idEntrada = 'foto-' + Math.random().toString(36).slice(2, 8);

    /* ---------- Montagem ---------- */
    const botaoRemover = html.elemento`
      <button class="link" type="button" onclick=${remover}>Remover foto</button>`;
    const erro = html.elemento`<p class="error-msg" role="alert"></p>`;
    const previa = html.elemento`<div class="foto-previa"></div>`;

    let seletor;
    if (o.permitido === false) {
      seletor = html.elemento`
        <div class="foto-seletor">
          ${previa}
          <div>
            <p class="muted" style="margin: 0">${o.mensagemBloqueio || 'Fotos não estão disponíveis.'}</p>
            ${foto ? botaoRemover : null}
            ${erro}
          </div>
        </div>`;
    } else {
      seletor = html.elemento`
        <div class="foto-seletor">
          ${previa}
          <div class="foto-acoes">
            <div class="actions" style="margin-top: 0">
              <label class="btn ghost small" for="${idEntrada}" tabindex="0" role="button" onkeydown=${teclaNoBotao} data-ref="escolher">Escolher foto</label>
              <input type="file" accept="image/*" class="sr-only" id="${idEntrada}" onchange=${escolher} data-ref="entrada">
              ${botaoRemover}
            </div>
            ${o.dica ? html`<p class="hint" style="margin: 0">${o.dica}</p>` : null}
            ${erro}
          </div>
        </div>`;
    }
    const refs = html.refs(seletor);
    desenharPrevia();

    /* ---------- Atualização ---------- */
    function desenharPrevia() {
      const rotulo = foto ? 'Sua foto' : 'Sem foto';
      previa.replaceChildren(SQ.dom.avatar({ foto, cor: o.cor, texto: o.texto, tamanho: 'grande', rotulo }));
      botaoRemover.classList.toggle('hidden', !foto);
    }
    function ocupado(sim) {
      if (refs.escolher) refs.escolher.classList.toggle('disabled', sim);
      if (refs.entrada) refs.entrada.disabled = sim;
      botaoRemover.disabled = sim;
    }
    async function trocarFoto(nova) {
      erro.textContent = '';
      ocupado(true);
      try {
        await o.onMudar(nova);
        foto = nova;
        desenharPrevia();
      } catch (e) {
        erro.textContent = e.message;
      }
      ocupado(false);
    }

    /* ---------- Eventos ---------- */
    function teclaNoBotao(evento) {
      if (evento.key === 'Enter' || evento.key === ' ') {
        evento.preventDefault();
        refs.entrada.click();
      }
    }
    async function escolher() {
      const arquivo = refs.entrada.files && refs.entrada.files[0];
      refs.entrada.value = '';
      if (!arquivo) return;
      try {
        await trocarFoto(await SQ.imagem.reduzir(arquivo));
      } catch (e) {
        erro.textContent = e.message;
        ocupado(false);
      }
    }
    function remover() {
      trocarFoto(null);
    }

    return seletor;
  }

  /** Bolinhas de cor do personagem. */
  function seletorCor(valor, onMudar) {
    const grupo = html.elemento`
      <div class="avatar-pick" role="group" aria-label="Cor do personagem">
        ${U.coresAvatar.map(
          cor =>
            html` <button
              type="button"
              style="background: ${cor}"
              aria-label="Cor ${cor}"
              aria-pressed="${cor === valor ? 'true' : 'false'}"
              onclick=${e => escolher(e, cor)}
            ></button>`
        )}
      </div>`;
    function escolher(evento, cor) {
      marcarEscolhido(grupo, evento.currentTarget);
      onMudar(cor);
    }
    return grupo;
  }

  /** Cartões de especialidade do personagem. */
  function seletorClasse(valor, onMudar) {
    const grupo = html.elemento`
      <div class="class-pick" role="group" aria-label="Especialidade">
        ${Object.entries(U.classes).map(
          ([id, c]) =>
            html` <button
              type="button"
              aria-pressed="${id === valor ? 'true' : 'false'}"
              onclick=${e => escolher(e, id)}
            >
              <strong>${c.nome}</strong>${c.desc}
            </button>`
        )}
      </div>`;
    function escolher(evento, id) {
      marcarEscolhido(grupo, evento.currentTarget);
      onMudar(id);
    }
    return grupo;
  }

  return { seletorFoto, seletorCor, seletorClasse };
})();
