/* =================================================================
   MODEL / REPOSITÓRIO — acesso aos dados
   Duas implementações com a mesma interface:
   - Servidor local (padrão): fala com o servidor.js do projeto, sem configuração.
   - Firebase: usado quando SQ.config.firebase está preenchido (para publicar na internet).
   Os controllers só conversam com SQ.models.Repositorio, sem saber qual está ativo.

   Coleções no Firestore:
     professores/{uid}  conta do professor (criada pelo próprio professor no cadastro)
     turmas/{id}        turmas de cada professor (nome, código, se participa da pesquisa, se está ativa)
     codigos/{codigo}   índice público código -> turma, usado no cadastro do aluno (só leitura direta)
     users/{uid}        perfil e progresso do aluno (lido pelo aluno e pelo professor da turma)
     ranking/{uid}      apelido, XP e nível (lido pelos colegas da mesma turma e pelo professor)
     eventos/{id}       um registro por desafio, lição e missão (lido só pelo professor da turma)
   ================================================================= */
window.SQ = window.SQ || {};
SQ.models = SQ.models || {};

(function () {
  const cfg = SQ.config,
    U = SQ.util,
    P = SQ.models.Perfil;

  const emailAluno = (codigoTurma, usuario) =>
    `${U.normalizarCodigo(codigoTurma).toLowerCase()}.${U.normalizarUsuario(usuario)}@${cfg.dominioAlunos}`;

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
      unavailable: 'Servidor indisponível no momento. Tente de novo em instantes.'
    };
    return mapa[c] || (e && e.message) || 'Algo deu errado. Tente de novo.';
  }
  const erro = (code, message) => Object.assign(new Error(message || mensagemErro({ code })), { code });

  function carregarScript(src) {
    return new Promise((ok, falha) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = ok;
      s.onerror = () => falha(new Error('Não foi possível carregar ' + src));
      document.head.appendChild(s);
    });
  }

  const resumoRanking = p => P.resumoRanking(p);
  const resumoCodigo = t => ({
    turmaId: t.id,
    nome: t.nome,
    escola: t.escola || '',
    professorUid: t.professorUid,
    professorNome: t.professorNome || '',
    pesquisa: !!t.pesquisa,
    fotos: !!t.fotos,
    ativa: t.ativa !== false
  });

  /* -------------------------------------------------------------
     SERVIDOR LOCAL (servidor.js)
     ------------------------------------------------------------- */
  const CHAVE_TOKEN = 'softwarequest:sessao';
  const lerToken = () => {
    try {
      return localStorage.getItem(CHAVE_TOKEN);
    } catch (e) {
      return null;
    }
  };
  const guardarToken = t => {
    try {
      t ? localStorage.setItem(CHAVE_TOKEN, t) : localStorage.removeItem(CHAVE_TOKEN);
    } catch (e) {
      /* navegador sem armazenamento: a sessão dura até fechar a aba */
    }
  };

  async function api(metodo, caminho, corpo) {
    let r;
    try {
      const token = lerToken();
      r = await fetch('api/' + caminho, {
        method: metodo,
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
        body: corpo ? JSON.stringify(corpo) : undefined
      });
    } catch (e) {
      throw erro('auth/network-request-failed');
    }
    let dados = null;
    try {
      dados = await r.json();
    } catch (e) {
      /* resposta sem JSON */
    }
    if (!r.ok || !dados) {
      const e = (dados && dados.erro) || {};
      throw erro(e.code || 'unavailable', e.message || mensagemErro({ code: 'unavailable' }));
    }
    return dados;
  }

  const Servidor = {
    modo: 'servidor',
    ouvintes: [],
    sessao: null,
    podeRedefinirSenhaAluno: true,
    async init() {
      try {
        const r = await fetch('api/saude', { cache: 'no-store' });
        const d = await r.json();
        if (!d || !d.ok) throw new Error('resposta inesperada');
      } catch (e) {
        throw erro('servidor-offline', 'Não foi possível falar com o servidor do Software Quest.');
      }
      if (lerToken()) {
        try {
          this.sessao = (await api('GET', 'sessao')).sessao;
        } catch (e) {
          this.sessao = null;
        }
        if (!this.sessao) guardarToken(null);
      }
    },
    definirSessao(token, sessao) {
      guardarToken(token);
      this.sessao = sessao;
      this.ouvintes.forEach(cb => cb(sessao));
    },
    onAuth(cb) {
      this.ouvintes.push(cb);
      setTimeout(() => cb(this.sessao), 0);
    },
    async papelDe() {
      return this.sessao;
    },

    /* ----- professor ----- */
    async cadastrarProfessor({ nome, escola, email, senha }) {
      const r = await api('POST', 'professores', { nome, escola, email, senha });
      this.definirSessao(r.token, r.sessao);
    },
    async entrarProfessor(email, senha) {
      const r = await api('POST', 'login/professor', { email, senha });
      this.definirSessao(r.token, r.sessao);
    },
    async recuperarSenha(email) {
      throw erro(
        'servidor-sem-email',
        `Este servidor não envia e-mails. Peça a quem administra o servidor para redefinir sua senha com o comando: node servidor.js redefinir-senha ${String(email || 'seu@email').trim()} NOVA-SENHA`
      );
    },
    async listarTurmas() {
      return (await api('GET', 'turmas')).turmas.sort((a, b) => String(a.nome).localeCompare(String(b.nome)));
    },
    async criarTurma(prof, { nome, escola, pesquisa }) {
      return (await api('POST', 'turmas', { nome, escola, pesquisa })).turma;
    },
    async atualizarTurma(turma, mudancas) {
      return (await api('PATCH', 'turmas/' + encodeURIComponent(turma.id), mudancas)).turma;
    },
    async listarAlunos(profUid, turmaId) {
      return (await api('GET', 'professor/alunos' + (turmaId ? '?turmaId=' + encodeURIComponent(turmaId) : ''))).alunos;
    },
    async listarEventos(profUid, turmaId) {
      return (await api('GET', 'professor/eventos' + (turmaId ? '?turmaId=' + encodeURIComponent(turmaId) : '')))
        .eventos;
    },
    async redefinirSenhaAluno(uid, senha) {
      await api('POST', 'professor/alunos/' + encodeURIComponent(uid) + '/senha', { senha });
    },
    async removerFotoAluno(uid) {
      await api('DELETE', 'professor/alunos/' + encodeURIComponent(uid) + '/foto');
    },
    /** Minha conta: { nome?, escola?, foto? } — devolve a sessão atualizada. */
    async atualizarProfessor(prof, mudancas) {
      const r = await api('PATCH', 'professores/eu', mudancas);
      this.sessao = r.sessao;
      return r.sessao;
    },

    /* ----- aluno ----- */
    async buscarTurma(codigo) {
      const c = U.normalizarCodigo(codigo);
      if (c.length !== 6) return null;
      return (await api('GET', 'turmas/codigo/' + c)).turma;
    },
    async cadastrarAluno({ turma, usuario, senha, perfil }) {
      const r = await api('POST', 'alunos', { codigoTurma: turma.codigo, usuario, senha, perfil });
      this.definirSessao(r.token, r.sessao);
    },
    async entrarAluno(codigoTurma, usuario, senha) {
      const r = await api('POST', 'login/aluno', { codigoTurma, usuario, senha });
      this.definirSessao(r.token, r.sessao);
    },
    async sair() {
      try {
        await api('POST', 'sair');
      } catch (e) {
        /* segue saindo */
      }
      this.definirSessao(null, null);
    },
    async carregarPerfil() {
      return (await api('GET', 'perfil')).perfil;
    },
    async salvarPerfil(perfil) {
      perfil.ultimoAcesso = new Date().toISOString();
      await api('PUT', 'perfil', { perfil });
    },
    async registrarEvento(evento) {
      await api('POST', 'eventos', { evento });
    },
    async ranking() {
      return (await api('GET', 'ranking')).ranking;
    },
    /** Troca (ou remove, com null) a foto do personagem do aluno logado. */
    async definirFoto(perfil, foto) {
      return (await api('PUT', 'perfil/foto', { foto })).foto;
    }
  };

  /* -------------------------------------------------------------
     FIREBASE (quando SQ.config.firebase estiver preenchido)
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
      this.auth.onAuthStateChanged(async u => {
        if (!u) return cb(null);
        try {
          const p = await this.papelDe(u.uid);
          if (!p) return cb({ uid: u.uid, papel: 'incompleto' });
          cb({ uid: u.uid, email: u.email, ...p });
        } catch (e) {
          cb({ uid: u.uid, papel: 'erro', erro: mensagemErro(e) });
        }
      });
    },

    /* ----- professor ----- */
    async cadastrarProfessor({ nome, escola, email, senha }) {
      try {
        const cred = await this.auth.createUserWithEmailAndPassword(email.trim(), senha);
        await this.db
          .collection('professores')
          .doc(cred.user.uid)
          .set({ nome, escola: escola || '', email: email.trim(), criadoEm: new Date().toISOString() });
      } catch (e) {
        throw erro(e.code, mensagemErro(e));
      }
    },
    async entrarProfessor(email, senha) {
      try {
        const cred = await this.auth.signInWithEmailAndPassword(email.trim(), senha);
        const prof = await this.db.collection('professores').doc(cred.user.uid).get();
        if (!prof.exists) {
          await this.auth.signOut();
          throw erro('nao-professor', 'Esta conta não é de professor. Alunos entram pela aba "Sou aluno".');
        }
      } catch (e) {
        throw erro(e.code, mensagemErro(e));
      }
    },
    async recuperarSenha(email) {
      try {
        await this.auth.sendPasswordResetEmail(email.trim());
      } catch (e) {
        throw erro(e.code, mensagemErro(e));
      }
    },
    async listarTurmas(profUid) {
      const snap = await this.db.collection('turmas').where('professorUid', '==', profUid).get();
      return snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => String(a.nome).localeCompare(String(b.nome)));
    },
    async criarTurma(prof, { nome, escola, pesquisa }) {
      for (let tentativa = 0; tentativa < 6; tentativa++) {
        const codigo = U.gerarCodigoTurma();
        const existe = await this.db.collection('codigos').doc(codigo).get();
        if (existe.exists) continue;
        const ref = this.db.collection('turmas').doc();
        const turma = {
          nome,
          escola: escola || prof.escola || '',
          codigo,
          professorUid: prof.uid,
          professorNome: prof.nome,
          pesquisa: !!pesquisa,
          fotos: false,
          ativa: true,
          criadaEm: new Date().toISOString()
        };
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
      // ao desativar as fotos, remove as fotos atuais dos alunos da turma
      if (mudancas.fotos === false) {
        const alunos = await this.listarAlunos(turma.professorUid, id);
        await Promise.all(alunos.filter(a => a.avatar && a.avatar.foto).map(a => this.removerFotoAluno(a.uid)));
      }
      return nova;
    },
    async removerFotoAluno(uid) {
      const apagar = firebase.firestore.FieldValue.delete();
      const lote = this.db.batch();
      lote.update(this.db.collection('users').doc(uid), { 'avatar.foto': apagar });
      lote.update(this.db.collection('ranking').doc(uid), { 'avatar.foto': apagar });
      await lote.commit();
    },
    async atualizarProfessor(prof, mudancas) {
      const dados = {};
      ['nome', 'escola', 'foto'].forEach(k => {
        if (k in mudancas) dados[k] = mudancas[k];
      });
      await this.db.collection('professores').doc(prof.uid).update(dados);
      return { ...prof, ...dados, papel: 'professor' };
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
      const c = U.normalizarCodigo(codigo);
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
        if (e.code === 'auth/email-already-in-use')
          throw erro(e.code, 'Este nome de usuário já existe nesta turma. Escolha outro.');
        throw erro(e.code, mensagemErro(e));
      }
    },
    async entrarAluno(codigoTurma, usuario, senha) {
      try {
        await this.auth.signInWithEmailAndPassword(emailAluno(codigoTurma, usuario), senha);
      } catch (e) {
        throw erro(
          e.code,
          [
            'auth/invalid-credential',
            'auth/invalid-login-credentials',
            'auth/user-not-found',
            'auth/wrong-password'
          ].includes(e.code)
            ? 'Código da turma, usuário ou senha incorretos.'
            : mensagemErro(e)
        );
      }
    },
    sair() {
      return this.auth.signOut();
    },
    async carregarPerfil(uid) {
      const d = await this.db.collection('users').doc(uid).get();
      if (!d.exists) return null;
      const perfil = d.data();
      const cod = await this.db.collection('codigos').doc(perfil.codigoTurma).get();
      return { ...perfil, fotosPermitidas: !!(cod.exists && cod.data().fotos) };
    },
    /* A foto não é regravada aqui (só por definirFoto), para não desfazer uma remoção feita pelo professor. */
    async salvarPerfil(perfil) {
      perfil.ultimoAcesso = new Date().toISOString();
      const { fotosPermitidas, ...dados } = perfil;
      const campos = obj =>
        Object.keys(obj)
          .filter(k => k !== 'avatar')
          .concat(['avatar.cor', 'avatar.classe']);
      const ranking = resumoRanking(perfil);
      const lote = this.db.batch();
      lote.set(this.db.collection('users').doc(perfil.uid), dados, { mergeFields: campos(dados) });
      lote.set(this.db.collection('ranking').doc(perfil.uid), ranking, { mergeFields: campos(ranking) });
      await lote.commit();
    },
    async definirFoto(perfil, foto) {
      const valor = foto || firebase.firestore.FieldValue.delete();
      const lote = this.db.batch();
      lote.update(this.db.collection('users').doc(perfil.uid), { 'avatar.foto': valor });
      lote.update(this.db.collection('ranking').doc(perfil.uid), { 'avatar.foto': valor });
      await lote.commit();
      return foto || null;
    },
    async registrarEvento(evt) {
      await this.db.collection('eventos').add(evt);
    },
    async ranking(turmaId) {
      const snap = await this.db.collection('ranking').where('turmaId', '==', turmaId).get();
      return snap.docs.map(d => ({ uid: d.id, ...d.data() })).sort((a, b) => b.xp - a.xp);
    }
  };

  SQ.models.Repositorio = cfg.firebase ? Firebase : Servidor;
  SQ.models.Repositorio.mensagemErro = mensagemErro;
})();
