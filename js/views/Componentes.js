/* =================================================================
   VIEW / COMPONENTES — pedaços de interface reaproveitados em várias telas
   - seletorFoto: prévia da foto com botões "Escolher foto" e "Remover"
   - seletorCor e seletorClasse: escolhas do personagem
   ================================================================= */
window.SQ = window.SQ || {};
SQ.views = SQ.views || {};

SQ.views.componentes = (function () {
  const el = SQ.dom.el,
    U = SQ.util;

  /**
   * Seletor de foto.
   * opções: { foto, cor, texto, dica, permitido, mensagemBloqueio, onMudar(fotoOuNull) → Promise }
   * Quando o aluno escolhe uma imagem, ela é reduzida (SQ.imagem) e entregue a onMudar.
   */
  function seletorFoto(o) {
    let foto = o.foto || null;
    const previa = el('div', { class: 'foto-previa' });
    const erro = el('p', { class: 'error-msg', role: 'alert' });
    const entrada = el('input', {
      type: 'file',
      accept: 'image/*',
      class: 'sr-only',
      id: 'foto-' + Math.random().toString(36).slice(2, 8)
    });
    const escolher = el(
      'label',
      {
        class: 'btn ghost small',
        for: entrada.id,
        tabindex: '0',
        role: 'button',
        onkeydown: e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            entrada.click();
          }
        }
      },
      'Escolher foto'
    );
    const remover = el('button', { class: 'link', type: 'button', text: 'Remover foto' });
    const ocupado = v => {
      escolher.classList.toggle('disabled', v);
      remover.disabled = v;
      entrada.disabled = v;
    };

    function desenhar() {
      previa.replaceChildren(
        SQ.dom.avatar({ foto, cor: o.cor, texto: o.texto, tamanho: 'grande', rotulo: foto ? 'Sua foto' : 'Sem foto' })
      );
      remover.classList.toggle('hidden', !foto);
    }
    entrada.addEventListener('change', async () => {
      const arquivo = entrada.files && entrada.files[0];
      entrada.value = '';
      if (!arquivo) return;
      erro.textContent = '';
      ocupado(true);
      try {
        const nova = await SQ.imagem.reduzir(arquivo);
        await o.onMudar(nova);
        foto = nova;
        desenhar();
      } catch (e) {
        erro.textContent = e.message;
      }
      ocupado(false);
    });
    remover.addEventListener('click', async () => {
      erro.textContent = '';
      ocupado(true);
      try {
        await o.onMudar(null);
        foto = null;
        desenhar();
      } catch (e) {
        erro.textContent = e.message;
      }
      ocupado(false);
    });
    desenhar();

    if (o.permitido === false) {
      return el(
        'div',
        { class: 'foto-seletor' },
        previa,
        el(
          'div',
          {},
          el('p', { class: 'muted', style: { margin: 0 }, text: o.mensagemBloqueio || 'Fotos não estão disponíveis.' }),
          foto ? remover : null,
          erro
        )
      );
    }
    return el(
      'div',
      { class: 'foto-seletor' },
      previa,
      el(
        'div',
        { class: 'foto-acoes' },
        el('div', { class: 'actions', style: { marginTop: 0 } }, escolher, entrada, remover),
        o.dica ? el('p', { class: 'hint', style: { margin: 0 }, text: o.dica }) : null,
        erro
      )
    );
  }

  /** Bolinhas de cor do personagem. */
  function seletorCor(valor, onMudar) {
    const grupo = el('div', { class: 'avatar-pick', role: 'group', 'aria-label': 'Cor do personagem' });
    U.coresAvatar.forEach(c =>
      grupo.append(
        el('button', {
          type: 'button',
          style: { background: c },
          'aria-label': 'Cor ' + c,
          'aria-pressed': c === valor ? 'true' : 'false',
          onclick: e => {
            grupo
              .querySelectorAll('button')
              .forEach(b => b.setAttribute('aria-pressed', b === e.currentTarget ? 'true' : 'false'));
            onMudar(c);
          }
        })
      )
    );
    return grupo;
  }

  /** Cartões de especialidade do personagem. */
  function seletorClasse(valor, onMudar) {
    const grupo = el('div', { class: 'class-pick', role: 'group', 'aria-label': 'Especialidade' });
    Object.entries(U.classes).forEach(([id, c]) =>
      grupo.append(
        el(
          'button',
          {
            type: 'button',
            'aria-pressed': id === valor ? 'true' : 'false',
            onclick: e => {
              grupo
                .querySelectorAll('button')
                .forEach(b => b.setAttribute('aria-pressed', b === e.currentTarget ? 'true' : 'false'));
              onMudar(id);
            }
          },
          el('strong', { text: c.nome }),
          c.desc
        )
      )
    );
    return grupo;
  }

  return { seletorFoto, seletorCor, seletorClasse };
})();
