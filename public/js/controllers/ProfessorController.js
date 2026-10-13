/* =================================================================
   CONTROLLER / PROFESSOR — turmas e acompanhamento da turma
   Busca turmas, alunos e eventos no repositório, pede as estatísticas
   ao PainelModel e entrega tudo pronto para a PainelView.
   ================================================================= */
window.SQ = window.SQ || {};
SQ.controllers = SQ.controllers || {};

SQ.controllers.Professor = {
  iniciar(raiz, sessao) {
    const R = SQ.models.Repositorio,
      Painel = SQ.models.Painel,
      D = SQ.dados,
      U = SQ.util,
      toast = SQ.dom.toast;
    const prof = {
      uid: sessao.uid,
      nome: sessao.nome,
      escola: sessao.escola || '',
      email: sessao.email,
      foto: sessao.foto || null
    };
    let turmas = [],
      alunos = [],
      eventos = [],
      turmaSel = null,
      ordem = { campo: 'usuario', asc: true };
    const falha = (message, campo) => {
      throw Object.assign(new Error(message), { campo });
    };
    const turmaAtual = () => turmas.find(t => t.id === turmaSel);

    const view = SQ.views.Painel(raiz, {
      prof,
      handlers: {
        selecionarTurma: id => {
          turmaSel = id;
          carregar();
        },
        atualizar: () => carregar(),
        ordenar: campo => {
          ordem = { campo, asc: ordem.campo === campo ? !ordem.asc : true };
          render();
        },

        async criarTurma({ nome, escola, pesquisa }) {
          nome = String(nome || '').trim();
          if (nome.length < 2) falha('Dê um nome à turma.', 'nome');
          try {
            const t = await R.criarTurma(prof, { nome, escola: String(escola || '').trim(), pesquisa });
            turmaSel = t.id;
            await carregar();
            toast(`Turma criada. Código: ${U.formatarCodigo(t.codigo)}`, 4000);
          } catch (x) {
            falha(R.mensagemErro(x));
          }
        },

        async alterarTurma(turma, mudancas) {
          try {
            await R.atualizarTurma(turma, mudancas);
            if ('ativa' in mudancas)
              toast(
                mudancas.ativa
                  ? 'Cadastros abertos.'
                  : 'Cadastros fechados: novos alunos não conseguem entrar nesta turma.'
              );
            carregar();
          } catch (x) {
            toast(R.mensagemErro(x));
            throw x;
          }
        },

        async copiarInstrucao(turma) {
          const msg = `Entre no Software Quest, clique em "Primeiro acesso" e use o código da turma: ${U.formatarCodigo(turma.codigo)}`;
          try {
            await navigator.clipboard.writeText(msg);
            toast('Instrução copiada. Cole no grupo da turma.');
          } catch (e) {
            toast(msg, 6000);
          }
        },

        redefinirSenha: R.podeRedefinirSenhaAluno
          ? async aluno => {
              const senha = window.prompt(
                `Nova senha para ${aluno.usuario} (${aluno.apelido}). Mínimo de 6 caracteres:`
              );
              if (senha == null) return;
              if (senha.length < 6) {
                toast('A senha precisa ter pelo menos 6 caracteres.');
                return;
              }
              try {
                await R.redefinirSenhaAluno(aluno.uid, senha);
                toast(`Senha de ${aluno.usuario} redefinida. Passe a nova senha para o aluno.`, 4500);
              } catch (x) {
                toast(R.mensagemErro(x));
              }
            }
          : null,

        async removerFoto(aluno) {
          if (!confirm(`Remover a foto de ${aluno.usuario} (${aluno.apelido})?`)) return;
          try {
            await R.removerFotoAluno(aluno.uid);
            toast('Foto removida.');
            carregar();
          } catch (x) {
            toast(R.mensagemErro(x));
          }
        },

        minhaConta: () => abrirConta(),

        exportarEventos: () => exportar('eventos', Painel.csvEventos(eventos)),
        exportarResumo: () => exportar('resumo', Painel.csvResumo(alunos)),
        sair: () => R.sair(),
        privacidade: () => SQ.controllers.App.abrirPrivacidade()
      }
    });

    async function carregar() {
      view.aviso('');
      try {
        turmas = await R.listarTurmas(prof.uid);
        if (turmaSel && !turmaAtual()) turmaSel = null;
        if (!turmaSel && turmas.length) turmaSel = turmas[0].id;
        view.turmas({ turmas, turmaSel });
        if (!turmaSel) return;
        view.carregando();
        [alunos, eventos] = await Promise.all([
          R.listarAlunos(prof.uid, turmaSel),
          R.listarEventos(prof.uid, turmaSel)
        ]);
        alunos = alunos.filter(a => a && a.papel === 'aluno');
        render();
      } catch (e) {
        view.erro('Não foi possível carregar os dados: ' + R.mensagemErro(e));
      }
    }

    function render() {
      const stats = Painel.calcular(alunos, eventos);
      view.dados({
        stats,
        ordem,
        ordenados: Painel.ordenar(stats.resumos, ordem),
        totalLicoes: Painel.totalLicoes(),
        totalMissoes: D.missoes.length,
        temEventos: eventos.length > 0
      });
    }

    /* "Minha conta": a foto é salva na hora; nome e escola, no botão Salvar */
    function abrirConta() {
      const overlay = SQ.dom.overlay;
      const janela = overlay.abrir('Minha conta');
      const aplicar = s => {
        Object.assign(prof, { nome: s.nome, escola: s.escola || '', foto: s.foto || null });
        view.cabecalho(prof);
      };
      SQ.views.Conta(
        janela.corpo,
        { prof },
        {
          async mudarFoto(foto) {
            try {
              aplicar(await R.atualizarProfessor(prof, { foto }));
              toast(foto ? 'Foto atualizada.' : 'Foto removida.');
            } catch (e) {
              throw new Error(R.mensagemErro(e), { cause: e });
            }
          },
          async salvar({ nome, escola }) {
            nome = String(nome || '').trim();
            if (nome.length < 3) throw new Error('Informe seu nome.');
            try {
              aplicar(await R.atualizarProfessor(prof, { nome, escola: String(escola || '').trim() }));
            } catch (e) {
              throw new Error(R.mensagemErro(e), { cause: e });
            }
            toast('Dados salvos.');
            overlay.fechar();
            carregar();
          },
          fechar: () => overlay.fechar()
        }
      );
    }

    async function exportar(tipo, conteudo) {
      const nome = `softwarequest_${tipo}_${U.nomeArquivo(turmaAtual() ? turmaAtual().nome : 'turma')}_${new Date().toISOString().slice(0, 10)}.csv`;
      const r = await U.baixarArquivo(nome, conteudo);
      view.aviso(r === 'salvo' ? `CSV de ${tipo} baixado.` : 'Download cancelado.');
    }

    carregar();
    return { destruir() {} };
  }
};
