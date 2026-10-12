/* =================================================================
   VIEW / CONTA — "Minha conta" do professor: foto, nome e escola
   ================================================================= */
window.SQ = window.SQ || {};
SQ.views = SQ.views || {};

SQ.views.Conta = function (container, { prof }, handlers) {
  const el = SQ.dom.el,
    C = SQ.views.componentes;
  const nome = el('input', { id: 'conta-nome', maxlength: 80, value: prof.nome || '', autocomplete: 'name' });
  const escola = el('input', {
    id: 'conta-escola',
    maxlength: 80,
    value: prof.escola || '',
    autocomplete: 'organization'
  });
  const erro = el('p', { class: 'error-msg', role: 'alert' });
  const salvar = el('button', { class: 'btn', type: 'submit', text: 'Salvar' });
  container.replaceChildren(
    el(
      'form',
      {
        class: 'form-grid',
        style: { maxWidth: '560px' },
        onsubmit: async e => {
          e.preventDefault();
          erro.textContent = '';
          salvar.disabled = true;
          try {
            await handlers.salvar({ nome: nome.value, escola: escola.value });
          } catch (x) {
            erro.textContent = x.message;
          }
          salvar.disabled = false;
        }
      },
      el(
        'div',
        { class: 'field' },
        el('label', { text: 'Foto' }),
        C.seletorFoto({
          foto: prof.foto,
          cor: '#6B3FD6',
          texto: prof.nome,
          dica: 'Aparece no seu painel.',
          onMudar: handlers.mudarFoto
        })
      ),
      el('div', { class: 'field' }, el('label', { for: 'conta-nome', text: 'Nome' }), nome),
      el('div', { class: 'field' }, el('label', { for: 'conta-escola', text: 'Escola' }), escola),
      el('p', { class: 'muted', style: { margin: 0 }, text: 'E-mail: ' + (prof.email || '') }),
      erro,
      el(
        'div',
        { class: 'actions', style: { marginTop: 0 } },
        salvar,
        el('button', { class: 'btn ghost small', type: 'button', onclick: handlers.fechar, text: 'Fechar' })
      )
    )
  );
};
