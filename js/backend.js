/* =================================================================
   CAMADA DE DADOS
   - Modo Firebase: login real e banco de dados online (Firestore).
   - Modo demonstração: mesmas funções, com os dados salvos neste navegador.
   O restante do sistema só conversa com SQ.backend, sem saber qual modo está ativo.

   Coleções no Firestore:
     professores/{uid}  conta do professor (criada pelo próprio professor no cadastro)
     turmas/{id}        turmas de cada professor (nome, código, se participa da pesquisa, se está ativa)
     codigos/{codigo}   índice público código -> turma, usado no cadastro do aluno (só leitura direta)
     users/{uid}        perfil e progresso do aluno (lido pelo aluno e pelo professor da turma)
     ranking/{uid}      apelido, XP e nível (lido pelos colegas da mesma turma e pelo professor)
     eventos/{id}       um registro por desafio, lição e missão (lido só pelo professor da turma)
   ================================================================= */
window.SQ = window.SQ || {};

(function () {
  const cfg = SQ.config;

  const emailAluno = (codigoTurma, usuario) =>
    `${SQ.normalizarCodigo(codigoTurma).toLowerCase()}.${SQ.normalizarUsuario(usuario)}@${cfg.dominioAlunos}`;

  function mensagemErro(e) {
    const c = (e && e.code) || '';
    const mapa = {
      'auth/email-already-in-use': 'Este nome já está em uso. Escolha outro.',
      'auth/invalid-credential': 'Dados de acesso ou senha incorretos.',
      'auth/invalid-login-credentials': 'Dados de acesso ou senha incorretos.',
      'auth/wrong-password': 'Senha incorreta.',
      'auth/user-not-found': 'Conta não encontrada. Se é seu primeiro acesso, crie sua conta.',
      'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.',
      'auth/invalid-email': 'E-mail inválido.',
      'auth/missing-email': 'Informe o e-mail.',
      'auth/too-many-requests': 'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.',
      'auth/network-request-failed': 'Sem conexão com a internet. Verifique a rede e tente de novo.',
      'permission-denied': 'Sem permissão para esta ação.',
      'unavailable': 'Servidor indisponível no momento. Tente de novo em instantes.'
    };
    return mapa[c] || (e && e.message) || 'Algo deu errado. Tente de novo.';
  }
  const erro = (code, message) => Object.assign(new Error(message || mensagemErro({ code })), { code });

  function carregarScript(src) {
    return new Promise((ok, falha) => {
      const s = document.createElement('script');
      s.src = src; s.onload = ok; s.onerror = () => falha(new Error('Não foi possível carregar ' + src));
      document.head.appendChild(s);
    });
  }

  function resumoRanking(p) {
    return {
      apelido: p.apelido, turmaId: p.turmaId, professorUid: p.professorUid, xp: p.xp || 0,
      nivel: SQ.nivelDe(p.xp || 0).nome, avatar: p.avatar, missoes: Object.keys(p.missoes || {}).length
    };
  }
  const resumoCodigo = t => ({ turmaId: t.id, nome: t.nome, escola: t.escola || '', professorUid: t.professorUid, professorNome: t.professorNome || '', pesquisa: !!t.pesquisa, ativa: t.ativa !== false });

  /* -------------------------------------------------------------
     MODO FIREBASE
     ------------------------------------------------------------- */
  const Firebase = {
    modo: 'firebase',
    async init() {
      const base = `https://www.gstatic.com/firebasejs/${cfg.firebaseVersao}/`;
      await carregarScript(base + 'firebase-app-compat.js');
      await carregarScript(base + 'firebase-auth-compat.js');
      await carregarScript(base + 'firebase-firestore-compat.js');
      firebase.initializeApp(cfg.firebase);
      this.auth = firebase.auth();
      this.auth.languageCode = 'pt-BR';
      this.db = firebase.firestore();
    },
    async papelDe(uid) {
      const prof = await this.db.collection('professores').doc(uid).get();
      if (prof.exists) return { papel: 'professor', ...prof.data() };
      const al = await this.db.collection('users').doc(uid).get();
      if (al.exists) return { papel: 'aluno' };
      return null;
    },
    onAuth(cb) {
      this.auth.onAuthStateChanged(async (u) => {
        if (!u) return cb(null);
        try {
          const p = await this.papelDe(u.uid);
          if (!p) return cb({ uid: u.uid, papel: 'incompleto' });
          cb({ uid: u.uid, email: u.email, ...p });
        } catch (e) { cb({ uid: u.uid, papel: 'erro', erro: mensagemErro(e) }); }
      });
    },

    /* ----- professor ----- */
    async cadastrarProfessor({ nome, escola, email, senha }) {
      try {
        const cred = await this.auth.createUserWithEmailAndPassword(email.trim(), senha);
        await this.db.collection('professores').doc(cred.user.uid).set({ nome, escola: escola || '', email: email.trim(), criadoEm: new Date().toISOString() });
      } catch (e) { throw erro(e.code, mensagemErro(e)); }
    },
    async entrarProfessor(email, senha) {
      try {
        const cred = await this.auth.signInWithEmailAndPassword(email.trim(), senha);
        const prof = await this.db.collection('professores').doc(cred.user.uid).get();
        if (!prof.exists) { await this.auth.signOut(); throw erro('nao-professor', 'Esta conta não é de professor. Alunos entram pela aba "Sou aluno".'); }
      } catch (e) { throw erro(e.code, mensagemErro(e)); }
    },
    async recuperarSenha(email) {
      try { await this.auth.sendPasswordResetEmail(email.trim()); }
      catch (e) { throw erro(e.code, mensagemErro(e)); }
    },
    async listarTurmas(profUid) {
      const snap = await this.db.collection('turmas').where('professorUid', '==', profUid).get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => String(a.nome).localeCompare(String(b.nome)));
    },
    async criarTurma(prof, { nome, escola, pesquisa }) {
      for (let tentativa = 0; tentativa < 6; tentativa++) {
        const codigo = SQ.gerarCodigoTurma();
        const existe = await this.db.collection('codigos').doc(codigo).get();
        if (existe.exists) continue;
        const ref = this.db.collection('turmas').doc();
        const turma = { nome, escola: escola || prof.escola || '', codigo, professorUid: prof.uid, professorNome: prof.nome, pesquisa: !!pesquisa, ativa: true, criadaEm: new Date().toISOString() };
        const lote = this.db.batch();
        lote.set(ref, turma);
        lote.set(this.db.collection('codigos').doc(codigo), resumoCodigo({ id: ref.id, ...turma }));
        await lote.commit();
        return { id: ref.id, ...turma };
      }
      throw new Error('Não foi possível gerar um código único. Tente de novo.');
    },
    async atualizarTurma(turma, mudancas) {
      const nova = { ...turma, ...mudancas };
      const { id, ...dados } = nova;
      const lote = this.db.batch();
      lote.set(this.db.collection('turmas').doc(id), dados);
      lote.set(this.db.collection('codigos').doc(nova.codigo), resumoCodigo(nova));
      await lote.commit();
      return nova;
    },
    async listarAlunos(profUid, turmaId) {
      let q = this.db.collection('users').where('professorUid', '==', profUid);
      if (turmaId) q = q.where('turmaId', '==', turmaId);
      return (await q.get()).docs.map(d => d.data());
    },
    async listarEventos(profUid, turmaId) {
      let q = this.db.collection('eventos').where('professorUid', '==', profUid);
      if (turmaId) q = q.where('turmaId', '==', turmaId);
      return (await q.get()).docs.map(d => d.data());
    },

    /* ----- aluno ----- */
    async buscarTurma(codigo) {
      const c = SQ.normalizarCodigo(codigo);
      if (c.length !== 6) return null;
      const d = await this.db.collection('codigos').doc(c).get();
      return d.exists ? { codigo: c, ...d.data() } : null;
    },
    async cadastrarAluno({ turma, usuario, senha, perfil }) {
      try {
        const cred = await this.auth.createUserWithEmailAndPassword(emailAluno(turma.codigo, usuario), senha);
        const doc = { ...perfil, uid: cred.user.uid, criadoEm: new Date().toISOString() };
        const lote = this.db.batch();
        lote.set(this.db.collection('users').doc(doc.uid), doc);
        lote.set(this.db.collection('ranking').doc(doc.uid), resumoRanking(doc));
        await lote.commit();
      } catch (e) {
        if (e.code === 'auth/email-already-in-use') throw erro(e.code, 'Este nome de usuário já existe nesta turma. Escolha outro.');
        throw erro(e.code, mensagemErro(e));
      }
    },
    async entrarAluno(codigoTurma, usuario, senha) {
      try { await this.auth.signInWithEmailAndPassword(emailAluno(codigoTurma, usuario), senha); }
      catch (e) { throw erro(e.code, ['auth/invalid-credential', 'auth/invalid-login-credentials', 'auth/user-not-found', 'auth/wrong-password'].includes(e.code) ? 'Código da turma, usuário ou senha incorretos.' : mensagemErro(e)); }
    },
    sair() { return this.auth.signOut(); },
    async carregarPerfil(uid) { const d = await this.db.collection('users').doc(uid).get(); return d.exists ? d.data() : null; },
    async salvarPerfil(perfil) {
      perfil.ultimoAcesso = new Date().toISOString();
      const lote = this.db.batch();
      lote.set(this.db.collection('users').doc(perfil.uid), perfil);
      lote.set(this.db.collection('ranking').doc(perfil.uid), resumoRanking(perfil));
      await lote.commit();
    },
    async registrarEvento(evt) { await this.db.collection('eventos').add(evt); },
    async ranking(turmaId) {
      const snap = await this.db.collection('ranking').where('turmaId', '==', turmaId).get();
      return snap.docs.map(d => ({ uid: d.id, ...d.data() })).sort((a, b) => b.xp - a.xp);
    }
  };

  /* -------------------------------------------------------------
     MODO DEMONSTRAÇÃO (dados neste navegador)
     ------------------------------------------------------------- */
  const CHAVE = 'softwarequest-demo:v3';
  const Demo = {
    modo: 'demo',
    ouvintes: [],
    ler() {
      try { const d = JSON.parse(localStorage.getItem(CHAVE)); if (d && d.contas) return d; } catch (e) {}
      return { contas: {}, professores: {}, turmas: {}, codigos: {}, users: {}, ranking: {}, eventos: [], sessao: null };
    },
    gravar(d) { try { localStorage.setItem(CHAVE, JSON.stringify(d)); } catch (e) {} },
    async init() {
      const d = this.ler();
      const em = cfg.demo.professorEmail;
      if (!d.contas[em]) {
        d.contas[em] = { uid: 'prof-demo', senha: cfg.demo.professorSenha, papel: 'professor' };
        d.professores['prof-demo'] = { nome: 'Professor(a) de demonstração', escola: 'Escola Estadual Vila Nova', email: em, criadoEm: new Date().toISOString() };
      }
      const cod = cfg.demo.codigoTurma;
      if (!d.codigos[cod]) {
        const t = { nome: '2ª série A (demonstração)', escola: 'Escola Estadual Vila Nova', codigo: cod, professorUid: 'prof-demo', professorNome: 'Professor(a) de demonstração', pesquisa: true, ativa: true, criadaEm: new Date().toISOString() };
        d.turmas['turma-demo'] = t; d.codigos[cod] = resumoCodigo({ id: 'turma-demo', ...t });
      }
      this.gravar(d);
    },
    async papelDe(uid) {
      const d = this.ler();
      if (d.professores[uid]) return { papel: 'professor', ...d.professores[uid] };
      if (d.users[uid]) return { papel: 'aluno' };
      return null;
    },
    sessaoAtual() {
      const d = this.ler(); if (!d.sessao) return null;
      if (d.professores[d.sessao]) return { uid: d.sessao, papel: 'professor', ...d.professores[d.sessao] };
      if (d.users[d.sessao]) return { uid: d.sessao, papel: 'aluno' };
      return null;
    },
    avisar() { const s = this.sessaoAtual(); this.ouvintes.forEach(cb => cb(s)); },
    onAuth(cb) { this.ouvintes.push(cb); setTimeout(() => cb(this.sessaoAtual()), 0); },
    novaConta(d, email, senha, papel) {
      if (d.contas[email]) throw erro('auth/email-already-in-use');
      if (!senha || senha.length < 6) throw erro('auth/weak-password');
      const uid = papel + '-' + Math.random().toString(36).slice(2, 10);
      d.contas[email] = { uid, senha, papel };
      return uid;
    },

    async cadastrarProfessor({ nome, escola, email, senha }) {
      const d = this.ler(); const em = email.trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) throw erro('auth/invalid-email');
      const uid = this.novaConta(d, em, senha, 'professor');
      d.professores[uid] = { nome, escola: escola || '', email: em, criadoEm: new Date().toISOString() };
      d.sessao = uid; this.gravar(d); this.avisar();
    },
    async entrarProfessor(email, senha) {
      const d = this.ler(); const conta = d.contas[email.trim().toLowerCase()];
      if (!conta || conta.senha !== senha) throw erro('auth/invalid-credential', 'E-mail ou senha incorretos.' + (email.trim().toLowerCase() === cfg.demo.professorEmail ? ` Na demonstração, a senha é ${cfg.demo.professorSenha}.` : ''));
      if (conta.papel !== 'professor') throw erro('nao-professor', 'Esta conta não é de professor.');
      d.sessao = conta.uid; this.gravar(d); this.avisar();
    },
    async recuperarSenha() { throw erro('demo', 'Na demonstração não há envio de e-mail. Com o Firebase configurado, o professor recebe um link para criar uma nova senha.'); },
    async listarTurmas(profUid) {
      const d = this.ler();
      return Object.entries(d.turmas).filter(([, t]) => t.professorUid === profUid).map(([id, t]) => ({ id, ...t })).sort((a, b) => a.nome.localeCompare(b.nome));
    },
    async criarTurma(prof, { nome, escola, pesquisa }) {
      const d = this.ler();
      let codigo; do { codigo = SQ.gerarCodigoTurma(); } while (d.codigos[codigo]);
      const id = 'turma-' + Math.random().toString(36).slice(2, 10);
      const t = { nome, escola: escola || prof.escola || '', codigo, professorUid: prof.uid, professorNome: prof.nome, pesquisa: !!pesquisa, ativa: true, criadaEm: new Date().toISOString() };
      d.turmas[id] = t; d.codigos[codigo] = resumoCodigo({ id, ...t });
      this.gravar(d);
      return { id, ...t };
    },
    async atualizarTurma(turma, mudancas) {
      const d = this.ler(); const nova = { ...turma, ...mudancas }; const { id, ...dados } = nova;
      d.turmas[id] = dados; d.codigos[nova.codigo] = resumoCodigo(nova); this.gravar(d);
      return nova;
    },
    async listarAlunos(profUid, turmaId) { return Object.values(this.ler().users).filter(u => u.professorUid === profUid && (!turmaId || u.turmaId === turmaId)); },
    async listarEventos(profUid, turmaId) { return this.ler().eventos.filter(e => e.professorUid === profUid && (!turmaId || e.turmaId === turmaId)); },

    async buscarTurma(codigo) {
      const c = SQ.normalizarCodigo(codigo); const t = this.ler().codigos[c];
      return t ? { codigo: c, ...t } : null;
    },
    async cadastrarAluno({ turma, usuario, senha, perfil }) {
      const d = this.ler();
      const cod = d.codigos[turma.codigo];
      if (!cod || !cod.ativa) throw erro('permission-denied', 'Esta turma não está aceitando novos cadastros.');
      let uid;
      try { uid = this.novaConta(d, emailAluno(turma.codigo, usuario), senha, 'aluno'); }
      catch (e) { if (e.code === 'auth/email-already-in-use') throw erro(e.code, 'Este nome de usuário já existe nesta turma. Escolha outro.'); throw e; }
      const doc = { ...perfil, uid, criadoEm: new Date().toISOString() };
      d.users[uid] = doc; d.ranking[uid] = resumoRanking(doc); d.sessao = uid;
      this.gravar(d); this.avisar();
    },
    async entrarAluno(codigoTurma, usuario, senha) {
      const d = this.ler(); const conta = d.contas[emailAluno(codigoTurma, usuario)];
      if (!conta || conta.papel !== 'aluno' || conta.senha !== senha) throw erro('auth/invalid-credential', 'Código da turma, usuário ou senha incorretos.');
      d.sessao = conta.uid; this.gravar(d); this.avisar();
    },
    async sair() { const d = this.ler(); d.sessao = null; this.gravar(d); this.avisar(); },
    async carregarPerfil(uid) { return this.ler().users[uid] || null; },
    async salvarPerfil(perfil) {
      const d = this.ler(); perfil.ultimoAcesso = new Date().toISOString();
      d.users[perfil.uid] = perfil; d.ranking[perfil.uid] = resumoRanking(perfil); this.gravar(d);
    },
    async registrarEvento(evt) { const d = this.ler(); d.eventos.push(evt); this.gravar(d); },
    async ranking(turmaId) {
      return Object.entries(this.ler().ranking).filter(([, r]) => r.turmaId === turmaId).map(([uid, r]) => ({ uid, ...r })).sort((a, b) => b.xp - a.xp);
    },

    /* Dados de exemplo para experimentar o painel (apenas na demonstração) */
    async gerarDadosExemplo(prof) {
      const d = this.ler();
      let turmaId = Object.keys(d.turmas).find(id => d.turmas[id].professorUid === prof.uid && d.turmas[id].exemplo);
      if (!turmaId) {
        let codigo; do { codigo = SQ.gerarCodigoTurma(); } while (d.codigos[codigo]);
        turmaId = 'exemplo-turma-' + prof.uid;
        const t = { nome: 'Turma de exemplo', escola: prof.escola || '', codigo, professorUid: prof.uid, professorNome: prof.nome, pesquisa: true, ativa: true, exemplo: true, criadaEm: new Date().toISOString() };
        d.turmas[turmaId] = t; d.codigos[codigo] = resumoCodigo({ id: turmaId, ...t });
      }
      const turma = { turmaId, ...d.turmas[turmaId] };
      const apelidos = ['Coruja Veloz', 'Byte Azul', 'Raio Laser', 'Pixel Ninja', 'Lua Nova', 'Cometa', 'Trovão', 'Faísca'];
      const cores = SQ.coresAvatar, classes = Object.keys(SQ.classes);
      apelidos.forEach((ap, k) => {
        const usuario = 'exemplo' + (k + 1);
        const email = emailAluno(turma.codigo, usuario);
        if (d.contas[email]) return;
        const uid = 'exemplo-' + prof.uid + '-' + k;
        d.contas[email] = { uid, senha: '123456', papel: 'aluno' };
        const perfil = SQ.novoPerfil({ uid, usuario, apelido: ap, turma, avatar: { cor: cores[k % cores.length], classe: classes[k % 4] }, codigoPesquisa: 'P' + String(80 + k).padStart(2, '0') });
        perfil.exemplo = true;
        const qtdMissoes = 2 + (k * 3) % 6;
        SQ.missoes.slice(0, qtdMissoes).forEach((m, mi) => {
          let pontosM = 0, prim = 0;
          m.desafios.forEach((ds, di) => {
            const dificil = { requisitos: 0.7, planejamento: 0.65, programacao: 0.55, testes: 0.6, integracao: 0.4, entrega: 0.45, manutencao: 0.6 }[m.id];
            const sorteio = Math.abs((Math.sin((k + 1) * 12.9898 + (mi + 1) * 78.233 + (di + 1) * 37.719) * 43758.5453) % 1);
            const acertouPrimeira = sorteio < dificil;
            const tentativas = acertouPrimeira ? 1 : 2 + ((k + di) % 2);
            const pts = cfg.pontosPorTentativa[tentativas - 1] || 0;
            pontosM += pts; if (acertouPrimeira) prim++;
            d.eventos.push({ uid, usuario, codigoPesquisa: perfil.codigoPesquisa, turmaId, turma: turma.nome, professorUid: prof.uid, tipo: 'desafio', faseId: m.id, fase: m.nome, desafioId: ds.id, tipoDesafio: ds.tipo,
              tentativas, acertou: true, acertouPrimeira, pontos: pts, tempoSegundos: 20 + ((k * 13 + di * 17) % 70), dataHora: new Date(Date.now() - (8 - k) * 86400000).toISOString(), exemplo: true });
          });
          const est = prim / m.desafios.length >= 0.9 ? 3 : prim / m.desafios.length >= 0.6 ? 2 : 1;
          perfil.missoes[m.id] = { pontos: pontosM, estrelas: est, acertosPrimeira: prim, total: m.desafios.length, tempoSegundos: 180 + k * 20, concluidaEm: new Date().toISOString() };
          perfil.itens.push(m.id); perfil.xp += pontosM;
          SQ.trilha.find(t => t.fase === m.id).licoes.filter(l => !l.aprofundamento).forEach(l => { perfil.licoes[l.id] = { concluidaEm: new Date().toISOString(), acertouPrimeira: true }; perfil.xp += cfg.xpLicao + cfg.xpVerificacao; });
        });
        perfil.qualidade = Math.max(40, 100 - k * 6);
        d.users[uid] = perfil; d.ranking[uid] = resumoRanking(perfil);
      });
      this.gravar(d);
      return turmaId;
    },
    async apagarDadosExemplo(prof) {
      const d = this.ler();
      Object.keys(d.contas).forEach(e => { if (d.contas[e].uid.startsWith('exemplo-' + prof.uid)) delete d.contas[e]; });
      Object.keys(d.users).forEach(u => { if (u.startsWith('exemplo-' + prof.uid)) { delete d.users[u]; delete d.ranking[u]; } });
      Object.keys(d.turmas).forEach(id => { if (d.turmas[id].exemplo && d.turmas[id].professorUid === prof.uid) { delete d.codigos[d.turmas[id].codigo]; delete d.turmas[id]; } });
      d.eventos = d.eventos.filter(e => !(e.exemplo && e.professorUid === prof.uid));
      this.gravar(d);
    }
  };

  SQ.backend = cfg.firebase ? Firebase : Demo;
  SQ.backend.mensagemErro = mensagemErro;
})();
