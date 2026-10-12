/* =================================================================
   VIEW / PERFIL — "Meu personagem": foto, cor e especialidade do aluno
   A foto é salva na hora (handlers.mudarFoto); cor e especialidade, no botão Salvar.
   ================================================================= */
window.SQ = window.SQ || {};
SQ.views = SQ.views || {};

SQ.views.Perfil = function (container, { perfil }, handlers) {
  const el = SQ.dom.el,
    C = SQ.views.componentes;
  let cor = perfil.avatar.cor,
    classe = perfil.avatar.classe;
  container.replaceChildren(
    el(
      'div',
      { class: 'form-grid', style: { maxWidth: '560px' } },
      el(
        'div',
        { class: 'field' },
        el('label', { text: 'Foto' }),
        C.seletorFoto({
          foto: perfil.avatar.foto,
          cor,
          texto: perfil.apelido,
          permitido: !!perfil.fotosPermitidas,
          mensagemBloqueio:
            'Seu professor não liberou fotos nesta turma. Seu personagem usa a cor e a inicial do apelido.',
          dica: 'Use uma imagem que represente você: não precisa ser uma foto do seu rosto. Ela aparece no mapa e no ranking da turma.',
          onMudar: handlers.mudarFoto
        })
      ),
      el(
        'div',
        { class: 'field' },
        el('label', { text: 'Cor do personagem' }),
        C.seletorCor(cor, c => {
          cor = c;
        })
      ),
      el(
        'div',
        { class: 'field' },
        el('label', { text: 'Especialidade' }),
        C.seletorClasse(classe, c => {
          classe = c;
        })
      ),
      el('p', {
        class: 'muted',
        style: { margin: 0 },
        text: `Apelido: ${perfil.apelido} · Usuário: ${perfil.usuario} · Turma: ${perfil.turma}`
      }),
      el(
        'div',
        { class: 'actions', style: { marginTop: 0 } },
        el('button', { class: 'btn', onclick: () => handlers.salvar({ cor, classe }), text: 'Salvar' }),
        el('button', { class: 'btn ghost small', onclick: handlers.fechar, text: 'Fechar' })
      )
    )
  );
};
