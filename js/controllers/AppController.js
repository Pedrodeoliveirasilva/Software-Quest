/* =================================================================
   CONTROLLER / APP — inicialização e roteamento por sessão
   Inicia o repositório de dados, observa quem está logado e entrega a
   tela ao controller certo: Auth (ninguém logado), Aluno ou Professor.
   ================================================================= */
window.SQ = window.SQ || {};
SQ.controllers = SQ.controllers || {};

SQ.controllers.App = (function () {
  const R = SQ.models.Repositorio,
    V = SQ.views,
    overlay = SQ.dom.overlay;
  const raiz = () => document.getElementById('app');
  let ativo = null; // controller em uso (tem destruir())

  async function iniciar() {
    V.App.carregando(raiz());
    try {
      await R.init();
    } catch (e) {
      if (e.code === 'servidor-offline') {
        V.App.erro(raiz(), {
          titulo: 'Inicie o servidor do Software Quest',
          mensagem:
            'No VS Code, aperte F5. Ou, no terminal, dentro da pasta do projeto, rode: node servidor.js. Depois acesse http://localhost:3000 no navegador.',
          detalhe:
            'Abrir o index.html direto (com dois cliques ou pelo Live Server) não funciona: é o servidor que guarda as contas e o progresso dos alunos. É preciso ter o Node.js instalado (nodejs.org).'
        });
      } else {
        V.App.erro(raiz(), {
          titulo: 'Não foi possível conectar',
          mensagem: 'Verifique a conexão com a internet e recarregue a página.',
          detalhe: e.message
        });
      }
      return;
    }
    R.onAuth(aoMudarSessao);
  }

  const espera = ms => new Promise(r => setTimeout(r, ms));
  const erroSessao = msg =>
    V.App.erro(raiz(), { titulo: 'Algo deu errado', mensagem: msg, acao: { texto: 'Sair', fn: () => R.sair() } });

  async function aoMudarSessao(s) {
    overlay.fechar(true);
    if (ativo && ativo.destruir) ativo.destruir();
    ativo = null;
    if (!s) return SQ.controllers.Auth.mostrar(raiz());
    if (s.papel === 'erro') return erroSessao(s.erro);
    if (s.papel === 'incompleto') {
      // A conta acabou de ser criada e os dados ainda estão sendo gravados.
      for (let i = 0; i < 8 && s.papel === 'incompleto'; i++) {
        await espera(600);
        const p = await R.papelDe(s.uid).catch(() => null);
        if (p) s = { ...s, ...p };
      }
      if (s.papel === 'incompleto')
        return erroSessao('Seu cadastro não foi concluído. Saia e tente criar a conta de novo.');
    }
    if (s.papel === 'professor') {
      ativo = SQ.controllers.Professor.iniciar(raiz(), s);
      return;
    }
    let perfil = null;
    for (let i = 0; i < 6 && !perfil; i++) {
      perfil = await R.carregarPerfil(s.uid).catch(() => null);
      if (!perfil) await espera(600);
    }
    if (!perfil) return erroSessao('Seu cadastro não foi concluído. Saia e tente criar a conta de novo.');
    ativo = SQ.controllers.Aluno.iniciar(raiz(), perfil);
  }

  function abrirPrivacidade() {
    const o = overlay.abrir('Política de privacidade e termos de uso');
    V.Privacidade(o.corpo, SQ.config.privacidade, { fechar: () => overlay.fechar() });
  }

  return { iniciar, abrirPrivacidade };
})();
