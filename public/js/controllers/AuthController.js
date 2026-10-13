/* =================================================================
   CONTROLLER / AUTH — login e cadastro de alunos e professores
   Valida os dados vindos da LoginView e chama o repositório.
   Em caso de problema, lança um erro { message, campo } que a view exibe.
   Depois do login, o AppController percebe a nova sessão e troca de tela.
   ================================================================= */
window.SQ = window.SQ || {};
SQ.controllers = SQ.controllers || {};

SQ.controllers.Auth = (function () {
  const R = SQ.models.Repositorio,
    P = SQ.models.Perfil,
    U = SQ.util,
    cfg = SQ.config;
  const falha = (message, campo) => {
    throw Object.assign(new Error(message), { campo });
  };
  const MSG_TERMOS = 'Para continuar, aceite a política de privacidade e os termos de uso.';

  function validarSenha(senha, senha2) {
    if (!senha || senha.length < 6) falha('A senha precisa ter pelo menos 6 caracteres.', 'senha');
    if (senha2 !== undefined && senha !== senha2) falha('As duas senhas não são iguais.', 'senha2');
  }
  const validarCodigo = codigo => {
    if (U.normalizarCodigo(codigo).length !== 6) falha('O código da turma tem 6 caracteres, como QX7-42B.', 'codigo');
  };

  function mostrar(raiz, aba = 'aluno', modo = 'entrar') {
    window.scrollTo(0, 0);
    SQ.views.Login(raiz, {
      aba,
      modo,
      handlers: {
        irPara: (a, m) => mostrar(raiz, a, m),
        privacidade: () => SQ.controllers.App.abrirPrivacidade(),

        async entrarAluno({ codigo, usuario, senha }) {
          validarCodigo(codigo);
          if (!U.usuarioValido(usuario)) falha('Digite seu nome de usuário.', 'usuario');
          await R.entrarAluno(codigo, usuario, senha);
        },

        async buscarTurma(codigo) {
          validarCodigo(codigo);
          const t = await R.buscarTurma(codigo);
          if (!t) falha('Turma não encontrada. Confira o código com seu professor.', 'codigo');
          if (!t.ativa) falha('Esta turma não está aceitando novos cadastros. Fale com seu professor.', 'codigo');
          return t;
        },

        async cadastrarAluno({ turma, usuario, apelido, codigoPesquisa, senha, senha2, aceite, avatar }) {
          usuario = U.normalizarUsuario(usuario);
          apelido = String(apelido || '').trim();
          if (!U.usuarioValido(usuario))
            falha('O usuário deve ter de 3 a 20 caracteres: letras sem acento, números ou _.', 'usuario');
          if (apelido.length < 3) falha('O apelido precisa ter pelo menos 3 letras.', 'apelido');
          if (U.textoImproprio(usuario) || U.textoImproprio(apelido))
            falha('Escolha um usuário e um apelido sem palavras ofensivas.', 'apelido');
          if (turma.pesquisa && !cfg.padraoCodigoPesquisa.test(String(codigoPesquisa || '').trim()))
            falha('Digite o código de participante no formato P07.', 'codigoPesquisa');
          validarSenha(senha, senha2);
          if (!aceite) falha(MSG_TERMOS, 'aceite');
          const perfil = P.novo({
            uid: null,
            usuario,
            apelido,
            turma,
            avatar,
            codigoPesquisa: turma.pesquisa ? codigoPesquisa.trim().toUpperCase() : null
          });
          perfil.aceiteTermosEm = new Date().toISOString();
          await R.cadastrarAluno({ turma, usuario, senha, perfil });
        },

        async entrarProfessor({ email, senha }) {
          if (!U.emailValido(email)) falha('Informe um e-mail válido.', 'email');
          await R.entrarProfessor(email, senha);
        },

        async cadastrarProfessor({ nome, escola, email, senha, senha2, aceite }) {
          if (String(nome || '').trim().length < 3) falha('Informe seu nome.', 'nome');
          if (!U.emailValido(email)) falha('Informe um e-mail válido.', 'email');
          validarSenha(senha, senha2);
          if (!aceite) falha(MSG_TERMOS, 'aceite');
          try {
            await R.cadastrarProfessor({
              nome: nome.trim(),
              escola: String(escola || '').trim(),
              email: email.trim(),
              senha
            });
          } catch (x) {
            if (x.code === 'auth/email-already-in-use')
              falha('Já existe uma conta com este e-mail. Use "Entrar" ou "Esqueci minha senha".', 'email');
            throw x;
          }
        },

        async recuperarSenha(email) {
          if (!String(email || '').trim()) falha('Informe o e-mail da sua conta.', 'email');
          await R.recuperarSenha(email);
          return 'Se houver uma conta com este e-mail, você vai receber um link para criar uma nova senha. Confira também a caixa de spam.';
        }
      }
    });
  }

  return { mostrar };
})();
