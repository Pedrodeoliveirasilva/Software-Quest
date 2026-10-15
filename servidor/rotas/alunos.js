/* Rotas do aluno: cadastro, login, perfil, foto, eventos de pesquisa e ranking da turma. */
'use strict';
const banco = require('../banco');
const { falha } = require('../erros');
const {
  agora,
  novoId,
  texto,
  normalizarCodigo,
  normalizarUsuario,
  usuarioValido,
  emailAluno,
  validarFoto
} = require('../util');
const seg = require('../seguranca');
const jogo = require('../jogo');
const cfg = require('../config');

// Campos do perfil que o aluno não pode alterar pelo PUT /api/perfil
const CAMPOS_FIXOS = [
  'uid',
  'papel',
  'usuario',
  'apelido',
  'turmaId',
  'turma',
  'codigoTurma',
  'professorUid',
  'codigoPesquisa',
  'criadoEm'
];

const fotosPermitidas = aluno => !!(banco.dados.turmas[aluno.turmaId] || {}).fotos;

/* ---------- índice dos eventos por aluno ----------
   Para cada aluno: quantos eventos já enviou, quais desafios/lições/missões já registrou
   (para marcar repetições) e quais missões já concluiu. Montado uma vez a partir dos
   eventos guardados e atualizado a cada evento novo. Se os dados forem substituídos
   (comando importar), o índice é refeito. */
let indice = null,
  eventosIndexados = null;
function indiceDoAluno(uid) {
  if (eventosIndexados !== banco.dados.eventos) {
    indice = new Map();
    eventosIndexados = banco.dados.eventos;
    eventosIndexados.forEach(registrarNoIndice);
  }
  if (!indice.has(uid)) indice.set(uid, { total: 0, chaves: new Set(), missoes: new Set() });
  return indice.get(uid);
}
function registrarNoIndice(e) {
  if (!e || !e.uid) return;
  const i = indiceDoAluno(e.uid);
  i.total++;
  if (e.tipo && (e.desafioId || e.licaoId || e.faseId)) i.chaves.add(jogo.chaveDoEvento(e));
  if (e.tipo === 'missao' && e.faseId) i.missoes.add(e.faseId);
}

module.exports = function registrar(rota) {
  rota(
    'POST',
    '/api/alunos',
    ({ corpo, ip }) => {
      seg.cadastros.verificar(ip);
      seg.cadastros.somar(ip);
      const d = banco.dados;
      const codigo = normalizarCodigo(corpo.codigoTurma),
        usuario = normalizarUsuario(corpo.usuario),
        senha = String(corpo.senha || '');
      const cod = d.codigos[codigo];
      if (!cod) falha(404, 'not-found', 'Turma não encontrada. Confira o código com seu professor.');
      if (!cod.ativa)
        falha(403, 'permission-denied', 'Esta turma não está aceitando novos cadastros. Fale com seu professor.');
      if (!usuarioValido(usuario))
        falha(400, 'invalid-argument', 'O usuário deve ter de 3 a 20 caracteres: letras sem acento, números ou _.');
      if (senha.length < 6) falha(400, 'auth/weak-password', 'A senha precisa ter pelo menos 6 caracteres.');
      const email = emailAluno(codigo, usuario);
      if (d.contas[email])
        falha(409, 'auth/email-already-in-use', 'Este nome de usuário já existe nesta turma. Escolha outro.');
      const p = corpo.perfil && typeof corpo.perfil === 'object' ? corpo.perfil : {};
      const apelido = texto(p.apelido, 16);
      if (apelido.length < 3) falha(400, 'invalid-argument', 'O apelido precisa ter pelo menos 3 letras.');
      const codigoPesquisa = cod.pesquisa ? texto(p.codigoPesquisa, 3).toUpperCase() : null;
      if (cod.pesquisa && !/^P[0-9]{2}$/.test(codigoPesquisa))
        falha(400, 'invalid-argument', 'Digite o código de participante no formato P07.');
      const foto = cod.fotos ? validarFoto(p.avatar && p.avatar.foto) : null;
      const uid = novoId('aluno');
      d.contas[email] = { uid, papel: 'aluno', ...seg.protegerSenha(senha) };
      // O perfil começa do zero, montado aqui: XP, missões e lições enviados no cadastro são ignorados
      const inicial = jogo.progressoSeguro({ aceiteTermosEm: p.aceiteTermosEm });
      d.users[uid] = {
        ...inicial,
        uid,
        papel: 'aluno',
        usuario,
        apelido,
        codigoPesquisa,
        avatar: jogo.avatarSeguro(p.avatar, foto),
        turmaId: cod.turmaId,
        turma: cod.nome,
        codigoTurma: codigo,
        professorUid: cod.professorUid,
        criadoEm: agora(),
        ultimoAcesso: null
      };
      banco.alterar('contas', email);
      banco.alterar('users', uid);
      return { token: seg.criarSessao(uid), sessao: seg.infoSessao(uid) };
    },
    { limite: cfg.LIMITE_CORPO_FOTO }
  );

  rota('POST', '/api/login/aluno', ({ corpo, ip }) => {
    const email = emailAluno(corpo.codigoTurma, corpo.usuario);
    seg.verificarLogin(ip, email);
    const conta = banco.dados.contas[email];
    if (!conta || conta.papel !== 'aluno' || !seg.senhaConfere(conta, corpo.senha)) {
      seg.falhaDeLogin(ip, email);
      falha(401, 'auth/invalid-credential', 'Código da turma, usuário ou senha incorretos.');
    }
    seg.loginCerto(email);
    return { token: seg.criarSessao(conta.uid), sessao: seg.infoSessao(conta.uid) };
  });

  rota('GET', '/api/perfil', ({ s }) => {
    const a = seg.exigirAluno(s);
    return { perfil: { ...a, fotosPermitidas: fotosPermitidas(a) } };
  });

  // Salva o progresso. Só passam os campos do jogo, com valores coerentes (o XP é recalculado);
  // os campos fixos e a foto são preservados do que já está guardado.
  rota(
    'PUT',
    '/api/perfil',
    ({ s, corpo }) => {
      const atual = seg.exigirAluno(s);
      if (!corpo.perfil || typeof corpo.perfil !== 'object') falha(400, 'invalid-argument', 'Perfil inválido.');
      const novo = jogo.progressoSeguro(corpo.perfil);
      CAMPOS_FIXOS.forEach(k => {
        novo[k] = atual[k];
      });
      novo.avatar = jogo.avatarSeguro(corpo.perfil.avatar, atual.avatar && atual.avatar.foto);
      novo.ultimoAcesso = agora();
      banco.dados.users[s.uid] = novo;
      banco.alterar('users', s.uid);
      return { ok: true, xp: novo.xp };
    },
    { limite: cfg.LIMITE_CORPO_FOTO }
  );

  // Foto do personagem: só quando o professor permite fotos na turma (remover é sempre permitido)
  rota(
    'PUT',
    '/api/perfil/foto',
    ({ s, corpo }) => {
      const a = seg.exigirAluno(s);
      const foto = validarFoto(corpo.foto);
      if (foto && !fotosPermitidas(a)) falha(403, 'permission-denied', 'Seu professor não liberou fotos nesta turma.');
      a.avatar = { ...(a.avatar || {}), foto };
      banco.alterar('users', s.uid);
      return { foto };
    },
    { limite: cfg.LIMITE_CORPO_FOTO }
  );

  // Evento de pesquisa: validado e recalculado em servidor/jogo.js. A repetição é decidida aqui,
  // pelos eventos já guardados, e não pelo navegador.
  rota('POST', '/api/eventos', ({ s, corpo }) => {
    const a = seg.exigirAluno(s);
    seg.eventosPorMinuto.verificar(s.uid);
    seg.eventosPorMinuto.somar(s.uid);
    const i = indiceDoAluno(s.uid);
    if (i.total >= cfg.MAX_EVENTOS_POR_ALUNO)
      falha(429, 'resource-exhausted', 'Limite de registros atingido para este aluno. Fale com seu professor.');
    const e = jogo.eventoSeguro(corpo.evento, a, i.missoes);
    const registro = {
      ...e,
      repeticao: i.chaves.has(jogo.chaveDoEvento(e)),
      uid: s.uid,
      usuario: a.usuario,
      codigoPesquisa: a.codigoPesquisa || null,
      turmaId: a.turmaId,
      turma: a.turma,
      professorUid: a.professorUid,
      recebidoEm: agora()
    };
    banco.novoEvento(registro);
    registrarNoIndice(registro);
    return { ok: true, repeticao: registro.repeticao };
  });

  rota('GET', '/api/ranking', ({ s }) => {
    const a = seg.exigirAluno(s);
    const lista = Object.values(banco.dados.users)
      .filter(u => u.turmaId === a.turmaId)
      .map(u => {
        const xp = Number.isFinite(u.xp) ? u.xp : 0;
        return {
          uid: u.uid,
          apelido: u.apelido,
          xp,
          nivel: jogo.nivelDe(xp),
          avatar: jogo.avatarSeguro(u.avatar, u.avatar && u.avatar.foto),
          missoes: Object.keys(u.missoes || {}).length
        };
      });
    return { ranking: lista.sort((x, y) => y.xp - x.xp) };
  });
};
