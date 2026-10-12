/* =================================================================
   VIEW / LOGIN — telas de entrada e cadastro de alunos e professores
   Coleta os valores dos formulários e chama os handlers do AuthController,
   que validam e respondem com sucesso ou com um erro { message, campo }.
   Campos marcados com data-campo="nome" recebem o foco quando o erro é deles.
   ================================================================= */
window.SQ = window.SQ || {};
SQ.views = SQ.views || {};

SQ.views.Login = function (raiz, { aba, modo, handlers }) {
  const html = SQ.html;
  const U = SQ.util;
  const erro = html.elemento`<p class="error-msg" role="alert"></p>`;
  const ok = html.elemento`<p class="ok-msg" role="status"></p>`;
  const campos = {};

  /* =================================================================
     Ajudantes dos formulários
     ================================================================= */

  /** Guarda os campos marcados com data-campo, para focar o campo com erro. */
  function registrarCampos(raizDoFormulario) {
    raizDoFormulario.querySelectorAll('[data-campo]').forEach(c => {
      campos[c.dataset.campo] = c;
      c.removeAttribute('data-campo');
    });
  }

  /** Executa um handler, mostrando o erro e focando o campo indicado. */
  async function executar(form, acao) {
    const travar = sim => form.querySelectorAll('button, input, select').forEach(x => (x.disabled = sim));
    erro.textContent = '';
    ok.textContent = '';
    travar(true);
    try {
      const resultado = await acao();
      travar(false);
      return resultado;
    } catch (x) {
      erro.textContent = x.message;
      travar(false);
      if (x.campo && campos[x.campo]) campos[x.campo].focus();
      throw x;
    }
  }

  /** Formata o código da turma enquanto a pessoa digita (QX7-42B). */
  function formatarCodigo(evento) {
    const v = U.normalizarCodigo(evento.target.value).slice(0, 6);
    evento.target.value = v.length > 3 ? v.slice(0, 3) + '-' + v.slice(3) : v;
  }

  const dica = texto => html`<span class="hint">${texto}</span>`;

  const campoCodigo = (id, dicaDoCampo) =>
    html` <div class="field">
      <label for="${id}">Código da turma</label>
      <input
        id="${id}"
        maxlength="7"
        autocomplete="off"
        placeholder="QX7-42B"
        value=""
        class="input-codigo"
        oninput=${formatarCodigo}
        data-campo="codigo"
      />
      ${dicaDoCampo ? dica(dicaDoCampo) : null}
    </div>`;

  const aceiteDosTermos = () =>
    html` <label class="check-line" for="aceite">
      <input type="checkbox" id="aceite" data-campo="aceite" />
      <span
        >Li e aceito a
        <button type="button" class="link inline" onclick=${handlers.privacidade}>
          política de privacidade e os termos de uso</button
        >.</span
      >
    </label>`;

  const ignorar = () => {};

  /* =================================================================
     Aluno: entrar
     ================================================================= */
  function entrarAluno() {
    const form = html.elemento`
      <form class="form-grid" onsubmit=${enviar}>
        ${campoCodigo('l-cod')}
        <div class="field">
          <label for="l-usu">Nome de usuário</label>
          <input id="l-usu" maxlength="20" autocomplete="username" autocapitalize="none" data-campo="usuario">
        </div>
        <div class="field">
          <label for="l-sen">Senha</label>
          <input id="l-sen" type="password" autocomplete="current-password" data-campo="senha">
        </div>
        ${erro}
        <button class="btn block" type="submit">Entrar</button>
        <button class="link" type="button" onclick=${() => handlers.irPara('aluno', 'cadastro')}>Primeiro acesso? Crie sua conta</button>
        <p class="muted" style="font-size: .88rem; margin: 0">Esqueceu a senha? Fale com seu professor.</p>
      </form>`;
    registrarCampos(form);

    function enviar(evento) {
      evento.preventDefault();
      const dados = { codigo: campos.codigo.value, usuario: campos.usuario.value, senha: campos.senha.value };
      executar(form, () => handlers.entrarAluno(dados)).catch(ignorar);
    }

    setTimeout(() => campos.codigo.focus(), 30);
    return form;
  }

  /* =================================================================
     Aluno: primeiro acesso, em duas etapas (código da turma, depois os dados)
     ================================================================= */
  function cadastroAluno() {
    let turma = null;

    const form = html.elemento`
      <form class="form-grid" onsubmit=${enviar}>
        ${campoCodigo('c-cod', 'Seu professor passa esse código.')}
        ${erro}
        <button class="btn block" type="button" onclick=${buscarTurma} data-ref="continuar">Continuar</button>
        <div class="form-grid" data-ref="etapa2"></div>
        <button class="link" type="button" onclick=${() => handlers.irPara('aluno', 'entrar')}>Já tenho conta</button>
      </form>`;
    const refs = html.refs(form);
    registrarCampos(form);
    const campoDoCodigo = campos.codigo;

    function enviar(evento) {
      evento.preventDefault();
      if (!turma) buscarTurma();
    }

    function buscarTurma() {
      executar(form, () => handlers.buscarTurma(campoDoCodigo.value))
        .then(t => {
          turma = t;
          campoDoCodigo.disabled = true;
          refs.continuar.remove();
          mostrarDadosDoAluno(t);
        })
        .catch(ignorar);
    }

    /* ---------- Etapa 2: dados do aluno ---------- */
    function mostrarDadosDoAluno(t) {
      const componentes = SQ.views.componentes;
      let cor = U.coresAvatar[0];
      let classe = 'frontend';
      let foto = null;
      const professor = [t.escola, t.professorNome && 'Prof. ' + t.professorNome].filter(Boolean).join(' · ');

      // Foto opcional, só quando o professor liberou fotos na turma
      const seletorFoto = t.fotos
        ? componentes.seletorFoto({
            foto: null,
            cor,
            texto: 'A',
            dica: 'Opcional. Use uma imagem que represente você: não precisa ser uma foto do seu rosto.',
            onMudar: async f => (foto = f)
          })
        : null;

      refs.etapa2.replaceChildren(
        html` <div class="turma-ok">
            <strong>${t.nome}</strong>
            <span>${professor}</span>
          </div>
          <div class="field">
            <label for="c-usu">Nome de usuário</label>
            <input
              id="c-usu"
              maxlength="20"
              autocomplete="username"
              autocapitalize="none"
              placeholder="ex.: ana_b"
              data-campo="usuario"
            />
            ${dica('Você vai usar para entrar. Letras sem acento, números ou _.')}
          </div>
          <div class="field">
            <label for="c-ap">Apelido no jogo</label>
            <input id="c-ap" maxlength="16" autocomplete="off" placeholder="Ex.: Coruja Veloz" data-campo="apelido" />
            ${dica('Aparece no ranking da turma. Não use seu nome completo.')}
          </div>
          ${
            t.pesquisa
              ? html` <div class="field">
                  <label for="c-pesq">Código de participante da pesquisa</label>
                  <input
                    id="c-pesq"
                    maxlength="3"
                    autocomplete="off"
                    placeholder="P07"
                    style="text-transform: uppercase"
                    data-campo="codigoPesquisa"
                  />
                  ${dica('O mesmo código usado no pré-teste (ex.: P07).')}
                </div>`
              : null
          }
          ${
            seletorFoto
              ? html` <div class="field">
                  <label>Foto do personagem</label>
                  ${seletorFoto}
                </div>`
              : null
          }
          <div class="field">
            <label>Cor do personagem</label>
            ${componentes.seletorCor(cor, c => (cor = c))}
          </div>
          <div class="field">
            <label>Especialidade</label>
            ${componentes.seletorClasse(classe, c => (classe = c))}
          </div>
          <div class="field">
            <label for="c-s1">Crie uma senha</label>
            <input id="c-s1" type="password" autocomplete="new-password" data-campo="senha" />
            ${dica('Pelo menos 6 caracteres. Anote para não esquecer.')}
          </div>
          <div class="field">
            <label for="c-s2">Repita a senha</label>
            <input id="c-s2" type="password" autocomplete="new-password" data-campo="senha2" />
          </div>
          ${aceiteDosTermos()} ${erro}
          <button class="btn block" type="button" onclick=${criarConta}>Criar conta e jogar</button>`
      );
      registrarCampos(refs.etapa2);

      function criarConta() {
        const dados = {
          turma,
          usuario: campos.usuario.value,
          apelido: campos.apelido.value,
          codigoPesquisa: campos.codigoPesquisa ? campos.codigoPesquisa.value : null,
          senha: campos.senha.value,
          senha2: campos.senha2.value,
          aceite: campos.aceite.checked,
          avatar: { cor, classe, foto }
        };
        executar(form, () => handlers.cadastrarAluno(dados)).catch(() => (campoDoCodigo.disabled = true));
      }

      setTimeout(() => campos.usuario.focus(), 30);
    }

    setTimeout(() => campoDoCodigo.focus(), 30);
    return form;
  }

  /* =================================================================
     Professor: entrar
     ================================================================= */
  function entrarProfessor() {
    const form = html.elemento`
      <form class="form-grid" onsubmit=${enviar}>
        <div class="field">
          <label for="p-em">E-mail</label>
          <input id="p-em" type="email" autocomplete="username" data-campo="email">
        </div>
        <div class="field">
          <label for="p-sen">Senha</label>
          <input id="p-sen" type="password" autocomplete="current-password" data-campo="senha">
        </div>
        ${erro}
        <button class="btn block" type="submit">Entrar no painel</button>
        <button class="link" type="button" onclick=${() => handlers.irPara('professor', 'cadastro')}>Ainda não tem conta? Cadastre-se</button>
        <button class="link" type="button" onclick=${() => handlers.irPara('professor', 'recuperar')}>Esqueci minha senha</button>
      </form>`;
    registrarCampos(form);

    function enviar(evento) {
      evento.preventDefault();
      const dados = { email: campos.email.value, senha: campos.senha.value };
      executar(form, () => handlers.entrarProfessor(dados)).catch(ignorar);
    }

    setTimeout(() => campos.email.focus(), 30);
    return form;
  }

  /* =================================================================
     Professor: cadastro
     ================================================================= */
  function cadastroProfessor() {
    const form = html.elemento`
      <form class="form-grid" onsubmit=${enviar}>
        <div class="field">
          <label for="pc-nome">Seu nome</label>
          <input id="pc-nome" maxlength="80" autocomplete="name" data-campo="nome">
        </div>
        <div class="field">
          <label for="pc-escola">Escola</label>
          <input id="pc-escola" maxlength="80" autocomplete="organization" data-campo="escola">
        </div>
        <div class="field">
          <label for="pc-em">E-mail</label>
          <input id="pc-em" type="email" autocomplete="email" data-campo="email">
          ${dica('Usado para entrar e para recuperar a senha.')}
        </div>
        <div class="field">
          <label for="pc-s1">Crie uma senha</label>
          <input id="pc-s1" type="password" autocomplete="new-password" data-campo="senha">
        </div>
        <div class="field">
          <label for="pc-s2">Repita a senha</label>
          <input id="pc-s2" type="password" autocomplete="new-password" data-campo="senha2">
        </div>
        ${aceiteDosTermos()}
        ${erro}
        <button class="btn block" type="submit">Criar conta de professor</button>
        <button class="link" type="button" onclick=${() => handlers.irPara('professor', 'entrar')}>Já tenho conta</button>
      </form>`;
    registrarCampos(form);

    function enviar(evento) {
      evento.preventDefault();
      const dados = {
        nome: campos.nome.value,
        escola: campos.escola.value,
        email: campos.email.value,
        senha: campos.senha.value,
        senha2: campos.senha2.value,
        aceite: campos.aceite.checked
      };
      executar(form, () => handlers.cadastrarProfessor(dados)).catch(ignorar);
    }

    setTimeout(() => campos.nome.focus(), 30);
    return form;
  }

  /* =================================================================
     Professor: recuperar senha
     ================================================================= */
  function recuperar() {
    const form = html.elemento`
      <form class="form-grid" onsubmit=${enviar}>
        <p class="muted" style="margin: 0">Informe o e-mail da sua conta de professor. Vamos enviar um link para você criar uma nova senha.</p>
        <div class="field">
          <label for="pr-em">E-mail</label>
          <input id="pr-em" type="email" autocomplete="email" data-campo="email">
        </div>
        ${erro}
        ${ok}
        <button class="btn block" type="submit">Enviar link</button>
        <button class="link" type="button" onclick=${() => handlers.irPara('professor', 'entrar')}>Voltar</button>
      </form>`;
    registrarCampos(form);

    function enviar(evento) {
      evento.preventDefault();
      executar(form, () => handlers.recuperarSenha(campos.email.value))
        .then(mensagem => (ok.textContent = mensagem))
        .catch(ignorar);
    }

    setTimeout(() => campos.email.focus(), 30);
    return form;
  }

  /* =================================================================
     Montagem da página: apresentação à esquerda, abas e formulário à direita
     ================================================================= */
  const TELAS = {
    aluno: {
      entrar: ['Entrar', entrarAluno],
      cadastro: ['Primeiro acesso', cadastroAluno]
    },
    professor: {
      entrar: ['Painel do professor', entrarProfessor],
      cadastro: ['Cadastro de professor', cadastroProfessor],
      recuperar: ['Recuperar senha', recuperar]
    }
  };
  const [titulo, montarFormulario] = (TELAS[aba] || TELAS.aluno)[modo] || TELAS[aba].entrar;
  const aba$ = (id, texto) =>
    html` <button
      role="tab"
      aria-selected="${aba === id ? 'true' : 'false'}"
      onclick=${() => handlers.irPara(id, 'entrar')}
    >
      ${texto}
    </button>`;

  raiz.replaceChildren(
    html` <main class="login">
      <section class="login-hero">
        <h1>Software Quest<span>Missão Entrega Contínua</span></h1>
        <p class="lead">
          Entre na DevNova e conduza um projeto de software de verdade, do primeiro pedido da cliente até o sistema no
          ar.
        </p>
        <ul>
          <li>Estude cada etapa na trilha de aprendizagem.</li>
          <li>Ande pelo escritório e cumpra as missões.</li>
          <li>Ganhe XP, itens e suba no ranking da turma.</li>
        </ul>
        <p class="muted" style="margin-top: 1.2rem; font-size: .95rem">
          Professor: crie sua conta, crie uma turma e passe o código para os alunos. É gratuito.
          <button class="link inline" type="button" onclick=${handlers.privacidade}>Política de privacidade</button>
        </p>
      </section>
      <section class="card">
        <div class="tabs" role="tablist">${aba$('aluno', 'Sou aluno')} ${aba$('professor', 'Sou professor')}</div>
        <h2 style="font-size: 1.4rem; margin-bottom: 1rem">${titulo}</h2>
        ${montarFormulario()}
      </section>
    </main>`
  );
};
