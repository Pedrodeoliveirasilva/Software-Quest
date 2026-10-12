/* =================================================================
   VIEW / LOGIN — telas de entrada e cadastro de alunos e professores
   Coleta os valores dos formulários e chama os handlers do AuthController,
   que validam e respondem com sucesso ou com um erro { message, campo }.
   ================================================================= */
window.SQ = window.SQ || {};
SQ.views = SQ.views || {};

SQ.views.Login = function (raiz, { aba, modo, handlers }) {
  const el = SQ.dom.el,
    U = SQ.util;
  const erro = el('p', { class: 'error-msg', role: 'alert' });
  const ok = el('p', { class: 'ok-msg', role: 'status' });
  const campos = {};
  const enviando = (form, v) => form.querySelectorAll('button, input, select').forEach(x => (x.disabled = v));

  /* Executa um handler, mostrando o erro e focando o campo indicado. */
  async function executar(form, acao) {
    erro.textContent = '';
    ok.textContent = '';
    enviando(form, true);
    try {
      const r = await acao();
      enviando(form, false);
      return r;
    } catch (x) {
      erro.textContent = x.message;
      enviando(form, false);
      if (x.campo && campos[x.campo]) campos[x.campo].focus();
      throw x;
    }
  }
  const termos = () => {
    const cb = el('input', { type: 'checkbox', id: 'aceite' });
    campos.aceite = cb;
    return {
      cb,
      linha: el(
        'label',
        { class: 'check-line', for: 'aceite' },
        cb,
        el(
          'span',
          {},
          'Li e aceito a ',
          el('button', {
            type: 'button',
            class: 'link inline',
            onclick: handlers.privacidade,
            text: 'política de privacidade e os termos de uso'
          }),
          '.'
        )
      )
    };
  };
  const campoCodigo = (id, valor = '') =>
    el('input', {
      id,
      maxlength: 7,
      autocomplete: 'off',
      placeholder: 'QX7-42B',
      value: valor,
      class: 'input-codigo',
      oninput: e => {
        const v = U.normalizarCodigo(e.target.value).slice(0, 6);
        e.target.value = v.length > 3 ? v.slice(0, 3) + '-' + v.slice(3) : v;
      }
    });
  const campo = (id, rotulo, input, dica) => {
    campos[id] = input;
    return el(
      'div',
      { class: 'field' },
      el('label', { for: input.id, text: rotulo }),
      input,
      dica ? el('span', { class: 'hint', text: dica }) : null
    );
  };

  /* ----- aluno: entrar ----- */
  function entrarAluno() {
    const cod = campoCodigo('l-cod');
    const usu = el('input', { id: 'l-usu', maxlength: 20, autocomplete: 'username', autocapitalize: 'none' });
    const sen = el('input', { id: 'l-sen', type: 'password', autocomplete: 'current-password' });
    const f = el(
      'form',
      {
        class: 'form-grid',
        onsubmit: e => {
          e.preventDefault();
          executar(f, () => handlers.entrarAluno({ codigo: cod.value, usuario: usu.value, senha: sen.value })).catch(
            () => {}
          );
        }
      },
      campo('codigo', 'Código da turma', cod),
      campo('usuario', 'Nome de usuário', usu),
      campo('senha', 'Senha', sen),
      erro,
      el('button', { class: 'btn block', type: 'submit', text: 'Entrar' }),
      el('button', {
        class: 'link',
        type: 'button',
        onclick: () => handlers.irPara('aluno', 'cadastro'),
        text: 'Primeiro acesso? Crie sua conta'
      }),
      el('p', {
        class: 'muted',
        style: { fontSize: '.88rem', margin: 0 },
        text: 'Esqueceu a senha? Fale com seu professor.'
      })
    );
    setTimeout(() => cod.focus(), 30);
    return f;
  }

  /* ----- aluno: cadastro em duas etapas (código da turma, depois os dados) ----- */
  function cadastroAluno() {
    const cod = campoCodigo('c-cod');
    const etapa2 = el('div', { class: 'form-grid' });
    const continuar = el('button', { class: 'btn block', type: 'button', text: 'Continuar' });
    let turma = null;
    const f = el(
      'form',
      {
        class: 'form-grid',
        onsubmit: e => {
          e.preventDefault();
          if (!turma) continuar.click();
        }
      },
      campo('codigo', 'Código da turma', cod, 'Seu professor passa esse código.'),
      erro,
      continuar,
      etapa2,
      el('button', {
        class: 'link',
        type: 'button',
        onclick: () => handlers.irPara('aluno', 'entrar'),
        text: 'Já tenho conta'
      })
    );
    continuar.addEventListener('click', () =>
      executar(f, () => handlers.buscarTurma(cod.value))
        .then(t => {
          turma = t;
          cod.disabled = true;
          continuar.remove();
          etapa(t);
        })
        .catch(() => {})
    );

    function etapa(t) {
      let cor = U.coresAvatar[0],
        classe = 'frontend',
        foto = null;
      const C = SQ.views.componentes;
      const usu = el('input', {
        id: 'c-usu',
        maxlength: 20,
        autocomplete: 'username',
        autocapitalize: 'none',
        placeholder: 'ex.: ana_b'
      });
      const ap = el('input', { id: 'c-ap', maxlength: 16, autocomplete: 'off', placeholder: 'Ex.: Coruja Veloz' });
      const pesq = t.pesquisa
        ? el('input', {
            id: 'c-pesq',
            maxlength: 3,
            autocomplete: 'off',
            placeholder: 'P07',
            style: { textTransform: 'uppercase' }
          })
        : null;
      const s1 = el('input', { id: 'c-s1', type: 'password', autocomplete: 'new-password' });
      const s2 = el('input', { id: 'c-s2', type: 'password', autocomplete: 'new-password' });
      const tr = termos();
      const cores = C.seletorCor(cor, c => {
        cor = c;
      });
      const classes = C.seletorClasse(classe, c => {
        classe = c;
      });
      // Foto opcional, só quando o professor liberou fotos na turma
      const seletorFoto = t.fotos
        ? C.seletorFoto({
            foto: null,
            cor,
            texto: 'A',
            dica: 'Opcional. Use uma imagem que represente você: não precisa ser uma foto do seu rosto.',
            onMudar: async f => {
              foto = f;
            }
          })
        : null;
      const criar = el('button', { class: 'btn block', type: 'button', text: 'Criar conta e jogar' });
      criar.addEventListener('click', () =>
        executar(f, () =>
          handlers.cadastrarAluno({
            turma,
            usuario: usu.value,
            apelido: ap.value,
            codigoPesquisa: pesq ? pesq.value : null,
            senha: s1.value,
            senha2: s2.value,
            aceite: tr.cb.checked,
            avatar: { cor, classe, foto }
          })
        ).catch(() => {
          cod.disabled = true;
        })
      );
      etapa2.replaceChildren(
        el(
          'div',
          { class: 'turma-ok' },
          el('strong', { text: t.nome }),
          el('span', { text: [t.escola, t.professorNome && 'Prof. ' + t.professorNome].filter(Boolean).join(' · ') })
        ),
        campo('usuario', 'Nome de usuário', usu, 'Você vai usar para entrar. Letras sem acento, números ou _.'),
        campo('apelido', 'Apelido no jogo', ap, 'Aparece no ranking da turma. Não use seu nome completo.'),
        pesq
          ? campo(
              'codigoPesquisa',
              'Código de participante da pesquisa',
              pesq,
              'O mesmo código usado no pré-teste (ex.: P07).'
            )
          : null,
        seletorFoto ? el('div', { class: 'field' }, el('label', { text: 'Foto do personagem' }), seletorFoto) : null,
        el('div', { class: 'field' }, el('label', { text: 'Cor do personagem' }), cores),
        el('div', { class: 'field' }, el('label', { text: 'Especialidade' }), classes),
        campo('senha', 'Crie uma senha', s1, 'Pelo menos 6 caracteres. Anote para não esquecer.'),
        campo('senha2', 'Repita a senha', s2),
        tr.linha,
        erro,
        criar
      );
      setTimeout(() => usu.focus(), 30);
    }
    setTimeout(() => cod.focus(), 30);
    return f;
  }

  /* ----- professor ----- */
  function entrarProfessor() {
    const em = el('input', { id: 'p-em', type: 'email', autocomplete: 'username' });
    const sen = el('input', { id: 'p-sen', type: 'password', autocomplete: 'current-password' });
    const f = el(
      'form',
      {
        class: 'form-grid',
        onsubmit: e => {
          e.preventDefault();
          executar(f, () => handlers.entrarProfessor({ email: em.value, senha: sen.value })).catch(() => {});
        }
      },
      campo('email', 'E-mail', em),
      campo('senha', 'Senha', sen),
      erro,
      el('button', { class: 'btn block', type: 'submit', text: 'Entrar no painel' }),
      el('button', {
        class: 'link',
        type: 'button',
        onclick: () => handlers.irPara('professor', 'cadastro'),
        text: 'Ainda não tem conta? Cadastre-se'
      }),
      el('button', {
        class: 'link',
        type: 'button',
        onclick: () => handlers.irPara('professor', 'recuperar'),
        text: 'Esqueci minha senha'
      })
    );
    setTimeout(() => em.focus(), 30);
    return f;
  }

  function cadastroProfessor() {
    const nome = el('input', { id: 'pc-nome', maxlength: 80, autocomplete: 'name' });
    const escola = el('input', { id: 'pc-escola', maxlength: 80, autocomplete: 'organization' });
    const em = el('input', { id: 'pc-em', type: 'email', autocomplete: 'email' });
    const s1 = el('input', { id: 'pc-s1', type: 'password', autocomplete: 'new-password' });
    const s2 = el('input', { id: 'pc-s2', type: 'password', autocomplete: 'new-password' });
    const tr = termos();
    const f = el(
      'form',
      {
        class: 'form-grid',
        onsubmit: e => {
          e.preventDefault();
          executar(f, () =>
            handlers.cadastrarProfessor({
              nome: nome.value,
              escola: escola.value,
              email: em.value,
              senha: s1.value,
              senha2: s2.value,
              aceite: tr.cb.checked
            })
          ).catch(() => {});
        }
      },
      campo('nome', 'Seu nome', nome),
      campo('escola', 'Escola', escola),
      campo('email', 'E-mail', em, 'Usado para entrar e para recuperar a senha.'),
      campo('senha', 'Crie uma senha', s1),
      campo('senha2', 'Repita a senha', s2),
      tr.linha,
      erro,
      el('button', { class: 'btn block', type: 'submit', text: 'Criar conta de professor' }),
      el('button', {
        class: 'link',
        type: 'button',
        onclick: () => handlers.irPara('professor', 'entrar'),
        text: 'Já tenho conta'
      })
    );
    setTimeout(() => nome.focus(), 30);
    return f;
  }

  function recuperar() {
    const em = el('input', { id: 'pr-em', type: 'email', autocomplete: 'email' });
    const f = el(
      'form',
      {
        class: 'form-grid',
        onsubmit: e => {
          e.preventDefault();
          executar(f, () => handlers.recuperarSenha(em.value))
            .then(msg => {
              ok.textContent = msg;
            })
            .catch(() => {});
        }
      },
      el('p', {
        class: 'muted',
        style: { margin: 0 },
        text: 'Informe o e-mail da sua conta de professor. Vamos enviar um link para você criar uma nova senha.'
      }),
      campo('email', 'E-mail', em),
      erro,
      ok,
      el('button', { class: 'btn block', type: 'submit', text: 'Enviar link' }),
      el('button', {
        class: 'link',
        type: 'button',
        onclick: () => handlers.irPara('professor', 'entrar'),
        text: 'Voltar'
      })
    );
    setTimeout(() => em.focus(), 30);
    return f;
  }

  const telas = {
    aluno: { entrar: ['Entrar', entrarAluno], cadastro: ['Primeiro acesso', cadastroAluno] },
    professor: {
      entrar: ['Painel do professor', entrarProfessor],
      cadastro: ['Cadastro de professor', cadastroProfessor],
      recuperar: ['Recuperar senha', recuperar]
    }
  };
  const [titulo, montar] = (telas[aba] || telas.aluno)[modo] || telas[aba].entrar;

  raiz.replaceChildren(
    el(
      'main',
      { class: 'login' },
      el(
        'section',
        { class: 'login-hero' },
        el('h1', {}, 'Software Quest', el('span', { text: 'Missão Entrega Contínua' })),
        el('p', {
          class: 'lead',
          text: 'Entre na DevNova e conduza um projeto de software de verdade, do primeiro pedido da cliente até o sistema no ar.'
        }),
        el(
          'ul',
          {},
          el('li', { text: 'Estude cada etapa na trilha de aprendizagem.' }),
          el('li', { text: 'Ande pelo escritório e cumpra as missões.' }),
          el('li', { text: 'Ganhe XP, itens e suba no ranking da turma.' })
        ),
        el(
          'p',
          { class: 'muted', style: { marginTop: '1.2rem', fontSize: '.95rem' } },
          'Professor: crie sua conta, crie uma turma e passe o código para os alunos. É gratuito. ',
          el('button', {
            class: 'link inline',
            type: 'button',
            onclick: handlers.privacidade,
            text: 'Política de privacidade'
          })
        )
      ),
      el(
        'section',
        { class: 'card' },
        el(
          'div',
          { class: 'tabs', role: 'tablist' },
          el('button', {
            role: 'tab',
            'aria-selected': aba === 'aluno' ? 'true' : 'false',
            onclick: () => handlers.irPara('aluno', 'entrar'),
            text: 'Sou aluno'
          }),
          el('button', {
            role: 'tab',
            'aria-selected': aba === 'professor' ? 'true' : 'false',
            onclick: () => handlers.irPara('professor', 'entrar'),
            text: 'Sou professor'
          })
        ),
        el('h2', { style: { fontSize: '1.4rem', marginBottom: '1rem' }, text: titulo }),
        montar()
      )
    )
  );
};
