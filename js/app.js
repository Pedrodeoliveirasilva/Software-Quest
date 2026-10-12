/* =================================================================
   APLICAÇÃO PRINCIPAL
   ================================================================= */
window.SQ = window.SQ || {};

(function () {
  const el = SQ.el, cfg = SQ.config, B = SQ.backend;
  const raiz = document.getElementById('app');
  let perfil = null, sessao = null, mundo = null, overlayAtual = null, salvarTimer = null;

  /* ---------------------------------------------------------------
     Utilidades de progresso
     --------------------------------------------------------------- */
  const moduloDe = id => SQ.trilha.find(t => t.fase === id);
  const basicasFeitas = mod => mod.licoes.filter(l => !l.aprofundamento).every(l => perfil.licoes[l.id]);
  const proximaMissao = () => SQ.missoes.findIndex(m => !perfil.missoes[m.id]);
  const portaAberta = n => n === 1 || !!perfil.missoes[SQ.missoes[n - 2].id];
  function statusMissao(i) {
    if (perfil.missoes[SQ.missoes[i].id]) return 'concluida';
    return portaAberta(i + 1) ? 'disponivel' : 'bloqueada';
  }

  function recomendacao() {
    for (const m of SQ.missoes) {
      const r = perfil.missoes[m.id];
      if (r && r.estrelas === 1) {
        const mod = moduloDe(m.id);
        const pend = mod.licoes.find(l => !perfil.licoes[l.id]);
        if (pend) return { texto: `Você teve dificuldade na missão de ${m.nome}. Revise o módulo "${mod.titulo}" na trilha.`, modulo: m.id };
      }
    }
    const n = proximaMissao();
    if (n >= 0) {
      const mod = moduloDe(SQ.missoes[n].id);
      if (!basicasFeitas(mod)) return { texto: `Prepare-se para a próxima missão: estude "${mod.titulo}" na Biblioteca.`, modulo: mod.fase };
    }
    for (const m of SQ.missoes) {
      if (!perfil.missoes[m.id]) continue;
      const ap = moduloDe(m.id).licoes.find(l => l.aprofundamento && !perfil.licoes[l.id]);
      if (ap) { const t = ap.titulo.replace('Aprofundamento: ', ''); return { texto: `Aprofunde seus conhecimentos: "${t.charAt(0).toUpperCase() + t.slice(1)}".`, modulo: m.id }; }
    }
    if (n < 0) return { texto: 'Você concluiu tudo! Rejogue as missões em que ganhou menos estrelas para melhorar sua pontuação.', modulo: null };
    return { texto: `Tudo pronto! Vá até a ${SQ.missoes[n].sala} e fale com ${SQ.missoes[n].npc}.`, modulo: null };
  }

  function objetivo() {
    const n = proximaMissao();
    if (n < 0) return 'Projeto concluído! Veja suas medalhas na mochila e sua posição no ranking.';
    const m = SQ.missoes[n];
    return `Fale com ${m.npc} (${m.papel}) na ${m.sala}. Procure o sinal "!" sobre a cabeça.`;
  }

  /* ---------------------------------------------------------------
     Salvamento
     --------------------------------------------------------------- */
  // Progresso é salvo logo; a posição no mapa é salva com atraso maior para
  // economizar gravações no banco de dados (limite do plano gratuito do Firebase).
  async function salvar(imediato, atraso = 900) {
    clearTimeout(salvarTimer);
    const exec = async () => {
      try { await B.salvarPerfil(perfil); }
      catch (e) { SQ.toast('Não foi possível salvar seu progresso. Verifique a internet.'); }
    };
    if (imediato) return exec();
    salvarTimer = setTimeout(exec, atraso);
  }
  function evento(dados) {
    B.registrarEvento({ uid: perfil.uid, usuario: perfil.usuario, codigoPesquisa: perfil.codigoPesquisa || null, turmaId: perfil.turmaId, turma: perfil.turma, professorUid: perfil.professorUid, ...dados }).catch(() => {});
  }
  function ganharXp(qtd) {
    const antes = SQ.nivelDe(perfil.xp).nome;
    perfil.xp += qtd;
    const depois = SQ.nivelDe(perfil.xp).nome;
    if (depois !== antes) setTimeout(() => SQ.toast(`Você subiu de nível: ${depois}!`, 3500), 400);
  }

  /* ---------------------------------------------------------------
     Inicialização e sessão
     --------------------------------------------------------------- */
  async function iniciar() {
    raiz.replaceChildren(el('p', { class: 'empty', text: 'Carregando…' }));
    try { await B.init(); }
    catch (e) {
      raiz.replaceChildren(el('main', { class: 'wrap' }, el('div', { class: 'card' },
        el('h2', { text: 'Não foi possível conectar' }), el('p', { text: 'Verifique a conexão com a internet e recarregue a página.' }), el('p', { class: 'muted', text: e.message }))));
      return;
    }
    B.onAuth(aoMudarSessao);
  }

  async function aoMudarSessao(s) {
    fecharOverlay(true);
    if (mundo) { mundo.destruir(); mundo = null; }
    sessao = s;
    if (!s) return telaLogin();
    if (s.papel === 'erro') return telaErro(s.erro);
    if (s.papel === 'incompleto') {
      // O cadastro acabou de ser criado e os dados ainda estão sendo gravados.
      for (let i = 0; i < 8 && s.papel === 'incompleto'; i++) {
        await new Promise(r => setTimeout(r, 600));
        const p = await B.papelDe(s.uid).catch(() => null);
        if (p) s = { ...s, ...p };
      }
      if (s.papel === 'incompleto') return telaErro('Seu cadastro não foi concluído. Saia e tente criar a conta de novo.');
    }
    if (s.papel === 'professor') return SQ.telaProfessor(raiz, s, { onSair: () => B.sair() });
    // Aluno (ou cadastro ainda sendo gravado)
    for (let i = 0; i < 6; i++) {
      perfil = await B.carregarPerfil(s.uid).catch(() => null);
      if (perfil) break;
      await new Promise(r => setTimeout(r, 600));
    }
    if (!perfil) return telaErro('Seu cadastro não foi concluído. Saia e faça o primeiro acesso de novo.');
    telaAluno();
  }

  function telaErro(msg) {
    raiz.replaceChildren(el('main', { class: 'wrap' }, el('div', { class: 'card' },
      el('h2', { text: 'Algo deu errado' }), el('p', { text: msg }),
      el('button', { class: 'btn', onclick: () => B.sair(), text: 'Sair' }))));
  }

  /* ---------------------------------------------------------------
     Login e cadastro
     --------------------------------------------------------------- */
  function telaLogin(aba = 'aluno', modo = 'entrar') {
    const erro = el('p', { class: 'error-msg', role: 'alert' });
    const ok = el('p', { class: 'ok-msg', role: 'status' });
    const enviando = (form, v) => form.querySelectorAll('button, input, select').forEach(x => x.disabled = v);
    const termos = () => {
      const cb = el('input', { type: 'checkbox', id: 'aceite' });
      return { cb, linha: el('label', { class: 'check-line', for: 'aceite' }, cb,
        el('span', {}, 'Li e aceito a ', el('button', { type: 'button', class: 'link inline', onclick: () => SQ.abrirPrivacidade(), text: 'política de privacidade e os termos de uso' }), '.')) };
    };
    const campoCodigo = (id, valor = '') => el('input', { id, maxlength: 7, autocomplete: 'off', placeholder: 'QX7-42B', value: valor, class: 'input-codigo',
      oninput: e => { const v = SQ.normalizarCodigo(e.target.value).slice(0, 6); e.target.value = v.length > 3 ? v.slice(0, 3) + '-' + v.slice(3) : v; } });

    /* ----- aluno: entrar ----- */
    function formEntrarAluno() {
      const cod = campoCodigo('l-cod', B.modo === 'demo' ? SQ.formatarCodigo(cfg.demo.codigoTurma) : '');
      const usu = el('input', { id: 'l-usu', maxlength: 20, autocomplete: 'username', autocapitalize: 'none' });
      const sen = el('input', { id: 'l-sen', type: 'password', autocomplete: 'current-password' });
      const f = el('form', { class: 'form-grid', onsubmit: async e => {
        e.preventDefault(); erro.textContent = '';
        if (SQ.normalizarCodigo(cod.value).length !== 6) { erro.textContent = 'O código da turma tem 6 caracteres, como QX7-42B.'; cod.focus(); return; }
        if (!SQ.usuarioValido(usu.value)) { erro.textContent = 'Digite seu nome de usuário.'; usu.focus(); return; }
        enviando(f, true);
        try { await B.entrarAluno(cod.value, usu.value, sen.value); } catch (x) { erro.textContent = x.message; enviando(f, false); }
      } },
        el('div', { class: 'field' }, el('label', { for: 'l-cod', text: 'Código da turma' }), cod),
        el('div', { class: 'field' }, el('label', { for: 'l-usu', text: 'Nome de usuário' }), usu),
        el('div', { class: 'field' }, el('label', { for: 'l-sen', text: 'Senha' }), sen),
        erro,
        el('button', { class: 'btn block', type: 'submit', text: 'Entrar' }),
        el('button', { class: 'link', type: 'button', onclick: () => telaLogin('aluno', 'cadastro'), text: 'Primeiro acesso? Crie sua conta' }),
        el('p', { class: 'muted', style: { fontSize: '.88rem', margin: 0 }, text: 'Esqueceu a senha? Fale com seu professor.' }));
      setTimeout(() => (cod.value ? usu : cod).focus(), 30);
      return f;
    }

    /* ----- aluno: cadastro (em duas etapas: código da turma e depois os dados) ----- */
    function formCadastroAluno() {
      const cod = campoCodigo('c-cod', B.modo === 'demo' ? SQ.formatarCodigo(cfg.demo.codigoTurma) : '');
      const etapa2 = el('div', { class: 'form-grid' });
      let turma = null;
      const verificar = el('button', { class: 'btn block', type: 'button', text: 'Continuar' });
      const f = el('form', { class: 'form-grid', onsubmit: e => { e.preventDefault(); if (!turma) verificar.click(); } },
        el('div', { class: 'field' }, el('label', { for: 'c-cod', text: 'Código da turma' }), cod, el('span', { class: 'hint', text: 'Seu professor passa esse código.' })),
        erro, verificar, etapa2,
        el('button', { class: 'link', type: 'button', onclick: () => telaLogin('aluno', 'entrar'), text: 'Já tenho conta' }));
      verificar.addEventListener('click', async () => {
        erro.textContent = '';
        if (SQ.normalizarCodigo(cod.value).length !== 6) { erro.textContent = 'O código da turma tem 6 caracteres, como QX7-42B.'; cod.focus(); return; }
        verificar.disabled = true;
        try {
          const t = await B.buscarTurma(cod.value);
          if (!t) { erro.textContent = 'Turma não encontrada. Confira o código com seu professor.'; verificar.disabled = false; return; }
          if (!t.ativa) { erro.textContent = 'Esta turma não está aceitando novos cadastros. Fale com seu professor.'; verificar.disabled = false; return; }
          turma = t; cod.disabled = true; verificar.remove(); montarEtapa2();
        } catch (x) { erro.textContent = B.mensagemErro(x); verificar.disabled = false; }
      });

      function montarEtapa2() {
        let cor = SQ.coresAvatar[0], classe = 'frontend';
        const usu = el('input', { id: 'c-usu', maxlength: 20, autocomplete: 'username', autocapitalize: 'none', placeholder: 'ex.: ana_b' });
        const ap = el('input', { id: 'c-ap', maxlength: 16, autocomplete: 'off', placeholder: 'Ex.: Coruja Veloz' });
        const pesq = turma.pesquisa ? el('input', { id: 'c-pesq', maxlength: 3, autocomplete: 'off', placeholder: 'P07', style: { textTransform: 'uppercase' } }) : null;
        const s1 = el('input', { id: 'c-s1', type: 'password', autocomplete: 'new-password' });
        const s2 = el('input', { id: 'c-s2', type: 'password', autocomplete: 'new-password' });
        const t = termos();
        const cores = el('div', { class: 'avatar-pick', role: 'group', 'aria-label': 'Cor do personagem' },
          SQ.coresAvatar.map(c => el('button', { type: 'button', style: { background: c }, 'aria-label': 'Cor ' + c, 'aria-pressed': c === cor ? 'true' : 'false', onclick: e => {
            cor = c; cores.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b === e.currentTarget ? 'true' : 'false'));
          } })));
        const classes = el('div', { class: 'class-pick', role: 'group', 'aria-label': 'Especialidade' },
          Object.entries(SQ.classes).map(([id, c]) => el('button', { type: 'button', 'aria-pressed': id === classe ? 'true' : 'false', onclick: e => {
            classe = id; classes.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b === e.currentTarget ? 'true' : 'false'));
          } }, el('strong', { text: c.nome }), c.desc)));
        const criar = el('button', { class: 'btn block', type: 'button', text: 'Criar conta e jogar' });
        criar.addEventListener('click', async () => {
          erro.textContent = '';
          const usuario = SQ.normalizarUsuario(usu.value), apelido = ap.value.trim();
          if (!SQ.usuarioValido(usuario)) { erro.textContent = 'O usuário deve ter de 3 a 20 caracteres: letras sem acento, números ou _.'; usu.focus(); return; }
          if (apelido.length < 3) { erro.textContent = 'O apelido precisa ter pelo menos 3 letras.'; ap.focus(); return; }
          if (SQ.textoImproprio(usuario) || SQ.textoImproprio(apelido)) { erro.textContent = 'Escolha um usuário e um apelido sem palavras ofensivas.'; ap.focus(); return; }
          if (pesq && !cfg.padraoCodigoPesquisa.test(pesq.value.trim())) { erro.textContent = 'Digite o código de participante no formato P07.'; pesq.focus(); return; }
          if (s1.value.length < 6) { erro.textContent = 'A senha precisa ter pelo menos 6 caracteres.'; s1.focus(); return; }
          if (s1.value !== s2.value) { erro.textContent = 'As duas senhas não são iguais.'; s2.focus(); return; }
          if (!t.cb.checked) { erro.textContent = 'Para continuar, aceite a política de privacidade e os termos de uso.'; t.cb.focus(); return; }
          enviando(f, true);
          try {
            const perfil = SQ.novoPerfil({ uid: null, usuario, apelido, turma, avatar: { cor, classe }, codigoPesquisa: pesq ? pesq.value.trim().toUpperCase() : null });
            perfil.aceiteTermosEm = new Date().toISOString();
            await B.cadastrarAluno({ turma, usuario, senha: s1.value, perfil });
          } catch (x) { erro.textContent = x.message; enviando(f, false); cod.disabled = true; }
        });
        etapa2.replaceChildren(
          el('div', { class: 'turma-ok' }, el('strong', { text: turma.nome }), el('span', { text: [turma.escola, turma.professorNome && 'Prof. ' + turma.professorNome].filter(Boolean).join(' · ') })),
          el('div', { class: 'field' }, el('label', { for: 'c-usu', text: 'Nome de usuário' }), usu, el('span', { class: 'hint', text: 'Você vai usar para entrar. Letras sem acento, números ou _.' })),
          el('div', { class: 'field' }, el('label', { for: 'c-ap', text: 'Apelido no jogo' }), ap, el('span', { class: 'hint', text: 'Aparece no ranking da turma. Não use seu nome completo.' })),
          pesq ? el('div', { class: 'field' }, el('label', { for: 'c-pesq', text: 'Código de participante da pesquisa' }), pesq, el('span', { class: 'hint', text: 'O mesmo código usado no pré-teste (ex.: P07).' })) : null,
          el('div', { class: 'field' }, el('label', { text: 'Cor do personagem' }), cores),
          el('div', { class: 'field' }, el('label', { text: 'Especialidade' }), classes),
          el('div', { class: 'field' }, el('label', { for: 'c-s1', text: 'Crie uma senha' }), s1, el('span', { class: 'hint', text: 'Pelo menos 6 caracteres. Anote para não esquecer.' })),
          el('div', { class: 'field' }, el('label', { for: 'c-s2', text: 'Repita a senha' }), s2),
          t.linha, erro, criar);
        setTimeout(() => usu.focus(), 30);
      }
      setTimeout(() => cod.focus(), 30);
      return f;
    }

    /* ----- professor ----- */
    function formEntrarProfessor() {
      const em = el('input', { id: 'p-em', type: 'email', autocomplete: 'username', value: B.modo === 'demo' ? cfg.demo.professorEmail : '' });
      const sen = el('input', { id: 'p-sen', type: 'password', autocomplete: 'current-password' });
      const f = el('form', { class: 'form-grid', onsubmit: async e => {
        e.preventDefault(); erro.textContent = ''; enviando(f, true);
        try { await B.entrarProfessor(em.value, sen.value); } catch (x) { erro.textContent = x.message; enviando(f, false); }
      } },
        el('div', { class: 'field' }, el('label', { for: 'p-em', text: 'E-mail' }), em),
        el('div', { class: 'field' }, el('label', { for: 'p-sen', text: 'Senha' }), sen,
          B.modo === 'demo' ? el('span', { class: 'hint', text: `Na demonstração, a senha é ${cfg.demo.professorSenha}.` }) : null),
        erro,
        el('button', { class: 'btn block', type: 'submit', text: 'Entrar no painel' }),
        el('button', { class: 'link', type: 'button', onclick: () => telaLogin('professor', 'cadastro'), text: 'Ainda não tem conta? Cadastre-se' }),
        el('button', { class: 'link', type: 'button', onclick: () => telaLogin('professor', 'recuperar'), text: 'Esqueci minha senha' }));
      setTimeout(() => (em.value ? sen : em).focus(), 30);
      return f;
    }

    function formCadastroProfessor() {
      const nome = el('input', { id: 'pc-nome', maxlength: 80, autocomplete: 'name' });
      const escola = el('input', { id: 'pc-escola', maxlength: 80, autocomplete: 'organization' });
      const em = el('input', { id: 'pc-em', type: 'email', autocomplete: 'email' });
      const s1 = el('input', { id: 'pc-s1', type: 'password', autocomplete: 'new-password' });
      const s2 = el('input', { id: 'pc-s2', type: 'password', autocomplete: 'new-password' });
      const t = termos();
      const f = el('form', { class: 'form-grid', onsubmit: async e => {
        e.preventDefault(); erro.textContent = '';
        if (nome.value.trim().length < 3) { erro.textContent = 'Informe seu nome.'; nome.focus(); return; }
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em.value.trim())) { erro.textContent = 'Informe um e-mail válido.'; em.focus(); return; }
        if (s1.value.length < 6) { erro.textContent = 'A senha precisa ter pelo menos 6 caracteres.'; s1.focus(); return; }
        if (s1.value !== s2.value) { erro.textContent = 'As duas senhas não são iguais.'; s2.focus(); return; }
        if (!t.cb.checked) { erro.textContent = 'Para continuar, aceite a política de privacidade e os termos de uso.'; t.cb.focus(); return; }
        enviando(f, true);
        try { await B.cadastrarProfessor({ nome: nome.value.trim(), escola: escola.value.trim(), email: em.value.trim(), senha: s1.value }); }
        catch (x) { erro.textContent = x.code === 'auth/email-already-in-use' ? 'Já existe uma conta com este e-mail. Use "Entrar" ou "Esqueci minha senha".' : x.message; enviando(f, false); }
      } },
        el('div', { class: 'field' }, el('label', { for: 'pc-nome', text: 'Seu nome' }), nome),
        el('div', { class: 'field' }, el('label', { for: 'pc-escola', text: 'Escola' }), escola),
        el('div', { class: 'field' }, el('label', { for: 'pc-em', text: 'E-mail' }), em, el('span', { class: 'hint', text: 'Usado para entrar e para recuperar a senha.' })),
        el('div', { class: 'field' }, el('label', { for: 'pc-s1', text: 'Crie uma senha' }), s1),
        el('div', { class: 'field' }, el('label', { for: 'pc-s2', text: 'Repita a senha' }), s2),
        t.linha, erro,
        el('button', { class: 'btn block', type: 'submit', text: 'Criar conta de professor' }),
        el('button', { class: 'link', type: 'button', onclick: () => telaLogin('professor', 'entrar'), text: 'Já tenho conta' }));
      setTimeout(() => nome.focus(), 30);
      return f;
    }

    function formRecuperar() {
      const em = el('input', { id: 'pr-em', type: 'email', autocomplete: 'email' });
      const f = el('form', { class: 'form-grid', onsubmit: async e => {
        e.preventDefault(); erro.textContent = ''; ok.textContent = '';
        if (!em.value.trim()) { erro.textContent = 'Informe o e-mail da sua conta.'; em.focus(); return; }
        enviando(f, true);
        try { await B.recuperarSenha(em.value); ok.textContent = 'Se houver uma conta com este e-mail, você vai receber um link para criar uma nova senha. Confira também a caixa de spam.'; }
        catch (x) { erro.textContent = x.message; }
        enviando(f, false);
      } },
        el('p', { class: 'muted', style: { margin: 0 }, text: 'Informe o e-mail da sua conta de professor. Vamos enviar um link para você criar uma nova senha.' }),
        el('div', { class: 'field' }, el('label', { for: 'pr-em', text: 'E-mail' }), em),
        erro, ok,
        el('button', { class: 'btn block', type: 'submit', text: 'Enviar link' }),
        el('button', { class: 'link', type: 'button', onclick: () => telaLogin('professor', 'entrar'), text: 'Voltar' }));
      setTimeout(() => em.focus(), 30);
      return f;
    }

    const titulos = { aluno: { entrar: 'Entrar', cadastro: 'Primeiro acesso' }, professor: { entrar: 'Painel do professor', cadastro: 'Cadastro de professor', recuperar: 'Recuperar senha' } };
    const conteudo = aba === 'professor'
      ? (modo === 'cadastro' ? formCadastroProfessor() : modo === 'recuperar' ? formRecuperar() : formEntrarProfessor())
      : (modo === 'cadastro' ? formCadastroAluno() : formEntrarAluno());
    raiz.replaceChildren(
      B.modo === 'demo' ? el('div', { class: 'banner-demo', text: `Modo demonstração: os dados ficam salvos só neste navegador. Turma de teste: ${SQ.formatarCodigo(cfg.demo.codigoTurma)}.` }) : null,
      el('main', { class: 'login' },
        el('section', { class: 'login-hero' },
          el('h1', {}, 'Software Quest', el('span', { text: 'Missão Entrega Contínua' })),
          el('p', { class: 'lead', text: 'Entre na DevNova e conduza um projeto de software de verdade, do primeiro pedido da cliente até o sistema no ar.' }),
          el('ul', {}, el('li', { text: 'Estude cada etapa na trilha de aprendizagem.' }), el('li', { text: 'Ande pelo escritório e cumpra as missões.' }), el('li', { text: 'Ganhe XP, itens e suba no ranking da turma.' })),
          el('p', { class: 'muted', style: { marginTop: '1.2rem', fontSize: '.95rem' } }, 'Professor: crie sua conta, crie uma turma e passe o código para os alunos. É gratuito. ',
            el('button', { class: 'link inline', type: 'button', onclick: () => SQ.abrirPrivacidade(), text: 'Política de privacidade' }))),
        el('section', { class: 'card' },
          el('div', { class: 'tabs', role: 'tablist' },
            el('button', { role: 'tab', 'aria-selected': aba === 'aluno' ? 'true' : 'false', onclick: () => telaLogin('aluno', 'entrar'), text: 'Sou aluno' }),
            el('button', { role: 'tab', 'aria-selected': aba === 'professor' ? 'true' : 'false', onclick: () => telaLogin('professor', 'entrar'), text: 'Sou professor' })),
          el('h2', { style: { fontSize: '1.4rem', marginBottom: '1rem' }, text: titulos[aba][modo] || 'Entrar' }),
          conteudo))
    );
  }

  /* ---------------------------------------------------------------
     Política de privacidade e termos de uso
     --------------------------------------------------------------- */
  SQ.abrirPrivacidade = function () {
    const pv = cfg.privacidade;
    const o = abrirOverlay('Política de privacidade e termos de uso');
    const sec = (t, ...ps) => [el('h3', { text: t }), ps.map(p => Array.isArray(p) ? el('ul', {}, p.map(i => el('li', { text: i }))) : el('p', { text: p }))];
    o.corpo.replaceChildren(el('article', { class: 'lesson' },
      el('p', { class: 'muted', text: `Última atualização: ${pv.atualizadaEm}` }),
      sec('Quem somos', `O Software Quest é uma plataforma educacional gratuita para o ensino de processos de desenvolvimento de software. O responsável pelo tratamento dos dados é ${pv.responsavel}, que pode ser contatado pelo e-mail ${pv.contato}.`),
      sec('Quais dados coletamos',
        ['Professores: nome, escola, e-mail e as turmas que criam.',
         'Alunos: nome de usuário, apelido, turma, cor e especialidade do personagem e, em turmas de pesquisa, o código de participante. Não pedimos nome completo, e-mail, telefone, endereço ou documentos.',
         'Uso da plataforma: lições e missões concluídas, respostas aos desafios (acertos, tentativas e tempo), pontuação e data do último acesso.']),
      sec('Para que usamos os dados',
        ['Fazer o jogo funcionar: salvar o progresso, calcular a pontuação e montar o ranking da turma.',
         'Permitir que o professor acompanhe a aprendizagem da própria turma.',
         'Em turmas marcadas como participantes de pesquisa, e apenas com o consentimento previsto no projeto de pesquisa, analisar os dados de forma agregada e sem identificação dos alunos.']),
      sec('Quem pode ver os dados',
        ['O aluno vê os próprios dados e o ranking da sua turma, que mostra apenas apelidos.',
         'O professor vê os dados dos alunos das turmas que ele criou, e de nenhuma outra.',
         'Os dados não são vendidos nem compartilhados com terceiros para fins comerciais. Eles ficam armazenados nos servidores do Google Firebase.']),
      sec('Crianças e adolescentes', 'A plataforma é usada principalmente por estudantes menores de idade, sempre por meio de uma turma criada por um professor. Seguimos a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), coletando apenas o mínimo necessário e no melhor interesse dos estudantes. Escolas e professores são responsáveis por informar os responsáveis legais sobre o uso da plataforma e, quando necessário, obter o consentimento deles.'),
      sec('Seus direitos', `Você pode pedir acesso, correção ou exclusão dos seus dados pelo e-mail ${pv.contato}. Alunos também podem fazer o pedido por meio do professor da turma.`),
      sec('Termos de uso',
        ['Use apelidos e nomes de usuário respeitosos. Contas com conteúdo ofensivo podem ser removidas.',
         'Não tente acessar dados de outras pessoas nem alterar a pontuação de forma indevida.',
         'A plataforma é oferecida gratuitamente, como está, e pode passar por mudanças e interrupções.']),
      el('div', { class: 'actions' }, el('button', { class: 'btn', onclick: () => fecharOverlay(), text: 'Fechar' }))));
  };

  /* ---------------------------------------------------------------
     Tela do aluno: HUD + mundo + painel lateral
     --------------------------------------------------------------- */
  let $hud, $objetivo, $reco, $prompt, $dialogo;

  function renderHud() {
    if (!$hud) return;
    const n = SQ.nivelDe(perfil.xp), q = Math.round(perfil.qualidade);
    const faltam = n.proximo ? `${n.proximo.xp - perfil.xp} XP para ${n.proximo.nome}` : 'Nível máximo';
    $hud.replaceChildren(el('div', { class: 'hud-inner' },
      el('div', { class: 'who' },
        el('span', { class: 'dot-avatar', style: { background: perfil.avatar.cor }, 'aria-hidden': 'true', text: perfil.apelido.slice(0, 1).toUpperCase() }),
        el('div', {}, el('div', { class: 'nick', text: perfil.apelido }), el('div', { class: 'lvl', text: `${n.nome} · ${SQ.classes[perfil.avatar.classe].nome} · ${perfil.turma}` }))),
      el('div', { class: 'xpbar' }, el('div', { class: 'stat' }, el('strong', { text: perfil.xp }), 'XP'),
        el('div', { class: 'bar', role: 'progressbar', 'aria-valuenow': Math.round(n.pct * 100), 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-label': faltam }, el('span', { style: { width: (n.pct * 100) + '%' } })),
        el('small', { text: faltam })),
      el('span', { class: 'stat', title: 'Cada erro reduz a qualidade do projeto' }, 'Qualidade',
        el('span', { class: 'meter' + (q < 50 ? ' low' : q < 75 ? ' warn' : '') }, el('span', { style: { width: q + '%' } })), el('strong', { text: q + '%' })),
      el('nav', { class: 'nav', 'aria-label': 'Menu' },
        el('button', { onclick: abrirTrilha, text: 'Trilha' }),
        el('button', { onclick: abrirMissoes, text: 'Missões' }),
        el('button', { onclick: abrirMochila, text: 'Mochila' }),
        el('button', { onclick: abrirRanking, text: 'Ranking' }),
        el('button', { onclick: () => { salvar(true).finally(() => B.sair()); }, text: 'Sair' }))
    ));
  }

  function renderLateral() {
    if (!$objetivo) return;
    $objetivo.replaceChildren(el('h3', { text: 'Objetivo atual' }), el('p', { style: { margin: 0 }, text: objetivo() }));
    const r = recomendacao();
    $reco.replaceChildren(el('h3', { text: 'Recomendado para você' }), el('p', { text: r.texto }),
      r.modulo ? el('button', { class: 'btn small', onclick: () => abrirTrilha(r.modulo), text: 'Abrir na trilha' }) : null);
  }

  function atualizarTudo() { renderHud(); renderLateral(); if (mundo) mundo.atualizar(); }

  function telaAluno() {
    $hud = el('header', { class: 'hud' });
    $objetivo = el('div', { class: 'card objective' });
    $reco = el('div', { class: 'card reco' });
    $prompt = el('div', { class: 'prompt-bar', 'aria-live': 'polite' });
    const canvas = el('canvas', { tabindex: '0' });
    const rolagem = el('div', { class: 'canvas-scroll' }, canvas);
    const wrap = el('div', { class: 'canvas-wrap' }, rolagem, $prompt);
    const centralizar = pos => { const t = canvas.clientWidth / SQ.mapa.linhas[0].length; rolagem.scrollLeft = (pos.x + 0.5) * t - rolagem.clientWidth / 2; };
    const dpad = el('div', { class: 'dpad', 'aria-label': 'Controles de movimento' },
      el('button', { class: 'up', 'aria-label': 'Andar para cima', onclick: () => mundo.mover(0, -1), text: '▲' }),
      el('button', { class: 'left', 'aria-label': 'Andar para a esquerda', onclick: () => mundo.mover(-1, 0), text: '◀' }),
      el('button', { class: 'act', onclick: () => mundo.interagir(), text: 'Falar' }),
      el('button', { class: 'right', 'aria-label': 'Andar para a direita', onclick: () => mundo.mover(1, 0), text: '▶' }),
      el('button', { class: 'down', 'aria-label': 'Andar para baixo', onclick: () => mundo.mover(0, 1), text: '▼' }));

    raiz.replaceChildren(
      B.modo === 'demo' ? el('div', { class: 'banner-demo', text: 'Modo demonstração: os dados ficam salvos só neste navegador.' }) : null,
      $hud,
      el('main', { class: 'wrap' },
        el('div', { class: 'world' },
          el('div', {}, wrap, dpad),
          el('aside', { class: 'side' }, $objetivo, $reco,
            el('div', { class: 'card' }, el('h3', { text: 'Como jogar' }),
              el('p', { class: 'muted', style: { margin: 0, fontSize: '.95rem' }, text: 'Ande com as setas (ou W, A, S, D) e aperte E para conversar. No celular ou com o mouse, toque no lugar para onde quer ir ou em uma pessoa para falar com ela. A Biblioteca abre a trilha de aprendizagem e o Mural mostra o ranking.' }))))));

    mundo = SQ.criarMundo(canvas, {
      perfil, portaAberta, statusMissao,
      onInteragir: interagir,
      onBloqueado: n => SQ.toast(`Porta trancada. Conclua a missão de ${SQ.missoes[n - 2].nome} para liberar a ${SQ.missoes[n - 1].sala}.`),
      onMover: pos => { perfil.posicao = pos; salvar(false, 20000); fecharDialogo(); centralizar(pos); },
      onProximo: alvo => {
        $prompt.replaceChildren(alvo
          ? el('span', {}, el('strong', { text: alvo.nome }), ` · ${alvo.papel}`)
          : el('span', { class: 'muted', text: objetivo() }),
          alvo ? el('button', { class: 'btn small', onclick: () => mundo.interagir(), text: alvo.tipo === 'npc' ? 'Conversar (E)' : 'Abrir (E)' }) : null);
      }
    });
    renderHud(); renderLateral();
    requestAnimationFrame(() => centralizar(perfil.posicao || SQ.mapa.inicio));
    perfil.ultimoAcesso = new Date().toISOString(); salvar();
    if (!perfil.boasVindas) {
      perfil.boasVindas = true; salvar();
      setTimeout(() => dialogo({ nome: 'Ana', papel: 'Líder técnica', cor: '#6B3FD6' },
        [SQ.historia, 'Eu sou a Ana, líder técnica da equipe. Antes de cada missão, passe na Biblioteca (a estante à direita do corredor) para estudar o tema. Depois, fale com a pessoa da sala marcada com "!".'],
        [{ texto: 'Abrir a trilha', acao: () => abrirTrilha('requisitos') }, { texto: 'Explorar o escritório', acao: () => {} }]), 300);
    }
  }

  /* ---------------------------------------------------------------
     Diálogos
     --------------------------------------------------------------- */
  function fecharDialogo() { if ($dialogo) { $dialogo.remove(); $dialogo = null; } }
  function dialogo(quem, falas, escolhas) {
    fecharDialogo();
    let i = 0;
    const wrap = document.querySelector('.canvas-wrap');
    const caixa = el('div', { class: 'dialog-box', role: 'dialog', 'aria-label': 'Conversa com ' + quem.nome });
    function passo() {
      const ultima = i === falas.length - 1;
      caixa.replaceChildren(
        el('div', { class: 'speaker' }, el('span', { class: 'dot-avatar', style: { background: quem.cor || '#6B3FD6' }, 'aria-hidden': 'true', text: quem.nome.slice(0, 1) }),
          el('div', {}, el('strong', { text: quem.nome }), el('span', { text: ' · ' + quem.papel }))),
        el('p', { text: falas[i] }),
        el('div', { class: 'choices' }, ultima
          ? escolhas.map((c, k) => el('button', { class: 'btn small' + (k ? ' ghost' : ''), onclick: () => { fecharDialogo(); c.acao(); } , text: c.texto }))
          : el('button', { class: 'btn small', onclick: () => { i++; passo(); }, text: 'Continuar' })));
      const b = caixa.querySelector('button'); if (b) setTimeout(() => b.focus({ preventScroll: true }), 20);
    }
    passo();
    wrap.append(caixa); $dialogo = caixa;
  }

  function interagir(alvo) {
    if (alvo.acao === 'trilha') return abrirTrilha();
    if (alvo.acao === 'ranking') return abrirRanking();
    if (alvo.acao === 'mentora') {
      const r = recomendacao();
      return dialogo(alvo, [objetivo(), r.texto], [
        r.modulo ? { texto: 'Abrir a trilha', acao: () => abrirTrilha(r.modulo) } : { texto: 'Ver missões', acao: abrirMissoes },
        { texto: 'Valeu, Ana!', acao: () => {} }]);
    }
    if (alvo.acao === 'dica') {
      const dicas = ['Sabia que o medidor de qualidade é como a dívida técnica do projeto? Cada erro deixa o sistema mais difícil de manter.',
        'Na dúvida, releia as dicas da trilha antes da missão. Acertar de primeira vale 100 XP!',
        'O Mural no corredor mostra o ranking da turma. Dá para rejogar missões para melhorar as estrelas.'];
      return dialogo(alvo, ['Oi! Eu sou a Duda, estagiária aqui na DevNova.', dicas[Math.floor(Math.random() * dicas.length)]], [{ texto: 'Obrigado(a)!', acao: () => {} }]);
    }
    const i = alvo.missao, m = SQ.missoes[i], feita = perfil.missoes[m.id];
    const mod = moduloDe(m.id);
    if (feita) {
      return dialogo(alvo, [`Você já concluiu esta missão com ${feita.estrelas} de 3 estrelas.`, 'Quer jogar de novo para tentar melhorar? Vale sempre a sua melhor pontuação.'],
        [{ texto: 'Jogar de novo', acao: () => abrirMissao(i) }, { texto: 'Agora não', acao: () => {} }]);
    }
    const falas = m.falaInicio.slice();
    if (!basicasFeitas(mod)) falas.push(`Dica: você ainda não estudou "${mod.titulo}" na trilha. Recomendo estudar antes de começar.`);
    dialogo(alvo, falas, [
      { texto: 'Começar a missão', acao: () => abrirMissao(i) },
      { texto: 'Estudar primeiro', acao: () => abrirTrilha(m.id) },
      { texto: 'Agora não', acao: () => {} }]);
  }

  /* ---------------------------------------------------------------
     Overlays (janelas)
     --------------------------------------------------------------- */
  function abrirOverlay(titulo, { antesDeFechar } = {}) {
    fecharOverlay(true); fecharDialogo();
    if (mundo) mundo.pausar(true);
    const corpo = el('div');
    const fechar = async () => { if (antesDeFechar && !(await antesDeFechar())) return; fecharOverlay(); };
    const titulo$ = el('h2', { id: 'ov-titulo', text: titulo });
    const ov = el('div', { class: 'overlay', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'ov-titulo', onkeydown: e => { if (e.key === 'Escape') fechar(); } },
      el('div', { class: 'modal' }, el('div', { class: 'modal-head' }, titulo$, el('button', { class: 'close', 'aria-label': 'Fechar', onclick: fechar, text: '✕' })), corpo));
    document.body.append(ov);
    document.body.style.overflow = 'hidden';
    overlayAtual = { ov, corpo, titulo$ };
    setTimeout(() => ov.querySelector('.close').focus(), 20);
    return overlayAtual;
  }
  function fecharOverlay(silencioso) {
    if (!overlayAtual) return;
    overlayAtual.ov.remove(); overlayAtual = null;
    document.body.style.overflow = '';
    if (mundo) { mundo.pausar(false); if (!silencioso) { atualizarTudo(); const c = document.querySelector('.canvas-wrap canvas'); if (c) c.focus({ preventScroll: true }); } }
  }

  /* ---------------------------------------------------------------
     Missão
     --------------------------------------------------------------- */
  function abrirMissao(i) {
    const m = SQ.missoes[i];
    const anterior = perfil.missoes[m.id];
    let terminou = false;
    const o = abrirOverlay(`${m.titulo}`, {
      antesDeFechar: async () => terminou || confirm('Sair da missão agora? O progresso desta missão será perdido.')
    });
    const area = el('div');
    o.corpo.replaceChildren(area);
    SQ.executarMissao(area, m, perfil, {
      onErro: () => { perfil.qualidade = Math.max(0, perfil.qualidade - cfg.perdaQualidadePorErro); renderHud(); salvar(); },
      onEvento: reg => evento({ ...reg, repeticao: !!anterior }),
      onFim: res => {
        terminou = true;
        const primeiraVez = !anterior;
        const melhor = primeiraVez || res.pontos > anterior.pontos;
        const xpGanho = primeiraVez ? res.pontos : Math.max(0, res.pontos - anterior.pontos);
        const nivelAntes = SQ.nivelDe(perfil.xp).nome;
        ganharXp(xpGanho);
        if (melhor) perfil.missoes[m.id] = { pontos: res.pontos, estrelas: res.estrelas, acertosPrimeira: res.acertosPrimeira, total: res.total, tempoSegundos: res.tempoSegundos, concluidaEm: new Date().toISOString(), vezes: (anterior?.vezes || 0) + 1 };
        else perfil.missoes[m.id] = { ...anterior, vezes: (anterior.vezes || 1) + 1 };
        if (primeiraVez && !perfil.itens.includes(m.id)) perfil.itens.push(m.id);
        if (primeiraVez && res.requisitosErrados && res.requisitosErrados.length) perfil.requisitosErrados = res.requisitosErrados;
        evento({ tipo: 'missao', faseId: m.id, fase: m.nome, pontos: res.pontos, estrelas: res.estrelas, acertosPrimeira: res.acertosPrimeira, tentativas: null, tempoSegundos: res.tempoSegundos, dataHora: new Date().toISOString(), repeticao: !primeiraVez });
        salvar(true);
        renderHud();
        resumoMissao(o, m, i, res, { primeiraVez, xpGanho, subiu: SQ.nivelDe(perfil.xp).nome !== nivelAntes });
      }
    });
  }

  function resumoMissao(o, m, i, res, { primeiraVez, xpGanho, subiu }) {
    o.titulo$.textContent = 'Missão concluída';
    const mod = moduloDe(m.id);
    const prox = SQ.missoes[i + 1];
    o.corpo.replaceChildren(el('section', { class: 'summary' },
      el('div', { class: 'big-stars', role: 'img', 'aria-label': `${res.estrelas} de 3 estrelas` }, '★'.repeat(res.estrelas), el('span', { class: 'off', text: '★'.repeat(3 - res.estrelas) })),
      el('h2', { text: m.titulo }),
      el('p', { class: 'muted', text: res.estrelas === 3 ? 'Excelente: você dominou esta etapa.' : res.estrelas === 2 ? 'Bom trabalho! Revise a trilha para acertar ainda mais de primeira.' : 'Missão concluída. Vale revisar este tema na trilha antes de seguir.' }),
      primeiraVez ? el('div', { class: 'reward' }, el('span', { class: 'icon', 'aria-hidden': 'true', text: m.item.icone }), `Você ganhou: ${m.item.nome}`) : null,
      el('div', { class: 'facts' },
        el('div', { class: 'fact' }, el('strong', { text: '+' + xpGanho }), el('span', { text: 'XP' })),
        el('div', { class: 'fact' }, el('strong', { text: `${res.acertosPrimeira}/${res.total}` }), el('span', { text: 'de primeira' })),
        el('div', { class: 'fact' }, el('strong', { text: SQ.formatarTempo(res.tempoSegundos * 1000) }), el('span', { text: 'de missão' }))),
      subiu ? el('p', { style: { fontWeight: 700 }, text: `Você subiu de nível: ${SQ.nivelDe(perfil.xp).nome}!` }) : null,
      !primeiraVez ? el('p', { class: 'muted', text: 'Você já tinha concluído esta missão. Vale a sua melhor pontuação.' }) : null,
      el('div', { class: 'context', style: { textAlign: 'left', maxWidth: '36em', margin: '1rem auto' } },
        el('p', {}, el('strong', { text: m.npc + ': ' }), m.falaFim),
        primeiraVez && prox ? el('p', { class: 'muted', text: `A porta da ${prox.sala} foi liberada.` }) : null),
      el('div', { class: 'actions', style: { justifyContent: 'center' } },
        el('button', { class: 'btn', onclick: () => fecharOverlay(), text: 'Voltar ao escritório' }),
        res.estrelas < 3 ? el('button', { class: 'btn ghost', onclick: () => abrirTrilha(m.id), text: `Revisar "${mod.titulo}"` }) : null)
    ));
  }

  /* ---------------------------------------------------------------
     Trilha de aprendizagem
     --------------------------------------------------------------- */
  function abrirTrilha(focoModulo) {
    const o = abrirOverlay('Trilha de aprendizagem');
    const total = SQ.trilha.reduce((s, m) => s + m.licoes.length, 0);
    const feitas = Object.keys(perfil.licoes).length;
    const r = recomendacao();
    let foco = null;
    const lista = el('div', { class: 'trilha' }, SQ.trilha.map((mod, idx) => {
      const miss = SQ.missoes.find(x => x.id === mod.fase);
      const missaoFeita = !!perfil.missoes[mod.fase];
      const n = mod.licoes.filter(l => perfil.licoes[l.id]).length;
      const bloco = el('section', { class: 'modulo', id: 'mod-' + mod.fase },
        el('div', { class: 'modulo-head' },
          el('h3', { text: `${idx + 1}. ${mod.titulo}` }),
          el('span', { class: 'muted', style: { fontSize: '.9rem' }, text: missaoFeita ? `Missão concluída · ${SQ.estrelas(perfil.missoes[mod.fase].estrelas)}` : `Missão na ${miss.sala}` })),
        el('div', { class: 'licoes' }, mod.licoes.map(l => {
          const bloqueada = l.aprofundamento && !missaoFeita;
          const feita = !!perfil.licoes[l.id];
          return el('button', { class: 'licao-btn' + (feita ? ' done' : ''), disabled: bloqueada, onclick: () => abrirLicao(mod, l) },
            el('span', { class: 'mark', 'aria-hidden': 'true', text: feita ? '✓' : '' }),
            el('span', {}, l.titulo, feita ? el('span', { class: 'sr-only', text: ' (concluída)' }) : null),
            el('span', { class: 'tag', text: bloqueada ? 'Libera após a missão' : `${l.minutos} min` }));
        })),
        el('div', { class: 'progress-line', 'aria-hidden': 'true' }, el('span', { style: { width: (n / mod.licoes.length * 100) + '%' } })));
      if (focoModulo === mod.fase) foco = bloco;
      return bloco;
    }));
    o.corpo.replaceChildren(
      el('p', { text: `Você concluiu ${feitas} de ${total} lições. Cada lição vale ${cfg.xpLicao} XP, e acertar a verificação de primeira vale mais ${cfg.xpVerificacao} XP.` }),
      el('div', { class: 'card reco', style: { marginBottom: '1rem', padding: '1rem' } }, el('strong', { text: 'Recomendado para você: ' }), r.texto),
      lista);
    if (foco) setTimeout(() => { foco.scrollIntoView({ block: 'start' }); foco.style.borderColor = 'var(--line)'; }, 50);
  }

  function abrirLicao(mod, l) {
    const o = overlayAtual; if (!o) return;
    const tl = l.titulo.replace('Aprofundamento: ', ''); o.titulo$.textContent = tl.charAt(0).toUpperCase() + tl.slice(1);
    const jaFeita = !!perfil.licoes[l.id];
    const inicio = Date.now();
    let tentativas = 0, respondeu = false;
    const areaFb = el('div', { 'aria-live': 'polite' });
    const concluirBtn = el('button', { class: 'btn', disabled: !jaFeita, text: jaFeita ? 'Voltar à trilha' : 'Concluir lição' });
    const blocos = l.blocos.map(b => {
      if (b.tipo === 'p') return el('p', { text: b.texto });
      if (b.tipo === 'lista') return [b.titulo ? el('h3', { text: b.titulo }) : null, el('ul', {}, b.itens.map(t => el('li', { text: t })))];
      if (b.tipo === 'exemplo') return el('div', { class: 'exemplo' }, el('strong', { text: b.titulo }), b.texto);
      if (b.tipo === 'dica') return el('div', { class: 'dica' }, el('strong', { text: 'Dica: ' }), b.texto);
      if (b.tipo === 'codigo') return el('pre', { class: 'code' }, b.texto);
      return null;
    });
    const v = l.verificacao;
    const opcoes = SQ.embaralhar(v.opcoes);
    const botoes = opcoes.map((op, k) => el('button', { class: 'option', type: 'button', onclick: () => {
      if (respondeu || botoes[k].disabled) return;
      if (op.correta) {
        respondeu = true; botoes[k].classList.add('right'); botoes.forEach(b => b.disabled = true);
        areaFb.replaceChildren(el('div', { class: 'feedback ok' }, el('h3', { text: tentativas === 0 ? 'Isso mesmo!' : 'Agora sim!' }), el('p', { text: op.porque })));
        concluirBtn.disabled = false; concluirBtn.focus({ preventScroll: true });
      } else {
        tentativas++; botoes[k].classList.add('wrong'); botoes[k].disabled = true;
        areaFb.replaceChildren(el('div', { class: 'feedback bad' }, el('h3', { text: 'Ainda não' }), el('p', { text: op.porque }), el('p', { text: 'Releia a lição e tente outra alternativa.' })));
      }
    } }, el('span', { class: 'key', 'aria-hidden': 'true', text: 'ABCD'[k] }), v.codigo ? el('code', { text: op.texto }) : el('span', { text: op.texto })));
    concluirBtn.addEventListener('click', () => {
      if (!jaFeita) {
        const primeira = tentativas === 0;
        perfil.licoes[l.id] = { concluidaEm: new Date().toISOString(), acertouPrimeira: primeira };
        const xp = cfg.xpLicao + (primeira ? cfg.xpVerificacao : 0);
        ganharXp(xp);
        evento({ tipo: 'licao', faseId: mod.fase, fase: SQ.missoes.find(m => m.id === mod.fase).nome, licaoId: l.id, tentativas: tentativas + 1, acertou: true, acertouPrimeira: primeira, pontos: xp, tempoSegundos: Math.round((Date.now() - inicio) / 1000), dataHora: new Date().toISOString() });
        salvar(true); renderHud();
        SQ.toast(`Lição concluída: +${xp} XP`);
      }
      abrirTrilha(mod.fase);
    });
    o.corpo.replaceChildren(el('article', { class: 'lesson' },
      el('p', { class: 'muted', text: `${mod.titulo} · ${l.minutos} min de leitura${l.aprofundamento ? ' · Aprofundamento' : ''}` }),
      blocos,
      el('section', { class: 'check' }, el('h3', { text: 'Verifique o que aprendeu' }), el('p', { style: { fontWeight: 700 }, text: v.pergunta }),
        jaFeita ? el('p', { class: 'muted', text: 'Você já concluiu esta lição. Pode responder de novo para praticar.' }) : null,
        el('div', { class: 'options' }, botoes), areaFb),
      el('div', { class: 'actions' }, concluirBtn, el('button', { class: 'btn ghost small', onclick: () => abrirTrilha(mod.fase), text: 'Voltar sem concluir' }))));
    o.ov.scrollTop = 0;
  }

  /* ---------------------------------------------------------------
     Missões (diário), mochila e ranking
     --------------------------------------------------------------- */
  function abrirMissoes() {
    const o = abrirOverlay('Missões');
    o.corpo.replaceChildren(el('div', { class: 'quests' }, SQ.missoes.map((m, i) => {
      const st = statusMissao(i), r = perfil.missoes[m.id];
      return el('div', { class: 'quest' + (st === 'concluida' ? ' done' : st === 'disponivel' ? ' current' : '') },
        el('span', { class: 'n', text: st === 'concluida' ? '✓' : i + 1 }),
        el('div', {}, el('strong', { text: m.titulo }), el('div', { class: 'muted', style: { fontSize: '.9rem' }, text: `${m.npc} · ${m.sala}` })),
        st === 'concluida' ? el('span', { class: 'stars', 'aria-label': `${r.estrelas} estrelas`, text: SQ.estrelas(r.estrelas) })
          : st === 'disponivel' ? el('button', { class: 'btn small', onclick: () => { fecharOverlay(); mundo.irPara('npc-' + m.id); }, text: 'Ir até lá' })
          : el('span', { class: 'muted', style: { fontSize: '.9rem' }, text: 'Bloqueada' }));
    })));
  }

  function abrirMochila() {
    const o = abrirOverlay('Mochila');
    const n = SQ.nivelDe(perfil.xp);
    const estrelas = Object.values(perfil.missoes).reduce((s, r) => s + r.estrelas, 0);
    o.corpo.replaceChildren(
      el('div', { class: 'facts', style: { maxWidth: 'none', gridTemplateColumns: 'repeat(4, 1fr)' } },
        el('div', { class: 'fact' }, el('strong', { text: n.nome }), el('span', { text: 'nível' })),
        el('div', { class: 'fact' }, el('strong', { text: perfil.xp }), el('span', { text: 'XP' })),
        el('div', { class: 'fact' }, el('strong', { text: `${estrelas}/21` }), el('span', { text: 'estrelas' })),
        el('div', { class: 'fact' }, el('strong', { text: `${Object.keys(perfil.licoes).length}` }), el('span', { text: 'lições' }))),
      el('h3', { style: { margin: '1rem 0 .6rem' }, text: 'Itens conquistados' }),
      el('div', { class: 'inv' }, SQ.missoes.map(m => {
        const tem = perfil.itens.includes(m.id);
        return el('div', { class: 'inv-item' + (tem ? '' : ' off') }, el('div', { class: 'icon', 'aria-hidden': 'true', text: tem ? m.item.icone : '?' }),
          el('strong', { text: tem ? m.item.nome : 'Item bloqueado' }), el('span', { class: 'muted', style: { fontSize: '.85rem' }, text: tem ? m.nome : `Missão: ${m.nome}` }));
      })));
  }

  async function abrirRanking() {
    const o = abrirOverlay('Ranking da turma');
    const lista = el('div', {}, el('p', { class: 'empty', text: 'Carregando ranking…' }));
    o.corpo.replaceChildren(el('p', { class: 'muted', text: `${perfil.turma}. O ranking mostra apenas apelidos e conta a sua melhor pontuação em cada missão.` }), lista);
    try {
      await salvar(true);
      const vis = await B.ranking(perfil.turmaId);
      const pos = vis.findIndex(d => d.uid === perfil.uid);
      const top = vis.slice(0, 30);
      lista.replaceChildren(
        pos >= 0 ? el('p', { text: `Sua posição: ${pos + 1}º de ${vis.length}` }) : null,
        el('ol', { class: 'rank' }, top.map((d, k) => el('li', { class: d.uid === perfil.uid ? 'me' : '' },
          el('span', { class: 'pos', text: k + 1 + 'º' }),
          el('span', { class: 'dot-avatar', style: { background: (d.avatar && d.avatar.cor) || '#6B3FD6' }, 'aria-hidden': 'true', text: (d.apelido || '?').slice(0, 1).toUpperCase() }),
          el('div', {}, el('strong', { text: d.apelido + (d.uid === perfil.uid ? ' (você)' : '') }), el('div', { class: 'sub', text: `${d.nivel} · ${d.missoes || 0}/7 missões` })),
          el('span', { class: 'xp', text: d.xp + ' XP' })))),
        pos >= 30 ? el('p', { class: 'muted', text: `Você está em ${pos + 1}º lugar. Continue jogando para subir!` }) : null);
    } catch (e) { lista.replaceChildren(el('p', { class: 'error-msg', text: 'Não foi possível carregar o ranking: ' + B.mensagemErro(e) })); }
  }

  iniciar();
})();
