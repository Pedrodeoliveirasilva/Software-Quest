/* =================================================================
   Segurança: senhas, sessões, limites de tentativas e regras de acesso
   As regras de acesso equivalem às do firestore.rules (modo Firebase).
   ================================================================= */
'use strict';
const crypto = require('crypto');
const cfg = require('./config');
const banco = require('./banco');
const { falha, SEM_PERMISSAO } = require('./erros');

/* ---------- senhas (scrypt com sal) ---------- */
function protegerSenha(senha) {
  const sal = crypto.randomBytes(16).toString('hex');
  return { sal, hash: crypto.scryptSync(senha, sal, 32).toString('hex') };
}
function senhaConfere(conta, senha) {
  const h = crypto.scryptSync(String(senha || ''), conta.sal, 32);
  return crypto.timingSafeEqual(h, Buffer.from(conta.hash, 'hex'));
}

/* ---------- sessões ---------- */
function criarSessao(uid) {
  const token = crypto.randomBytes(24).toString('hex');
  banco.dados.sessoes[token] = { uid, criadaEm: Date.now() };
  banco.gravar();
  return token;
}
/** Lê o token do cabeçalho Authorization e devolve { token, uid } ou null. */
function sessaoDe(req) {
  const m = /^Bearer\s+([a-f0-9]{48})$/i.exec(req.headers.authorization || '');
  const s = m && banco.dados.sessoes[m[1]];
  if (!s) return null;
  if (Date.now() - s.criadaEm > cfg.VALIDADE_SESSAO_MS) {
    delete banco.dados.sessoes[m[1]];
    banco.gravar();
    return null;
  }
  return { token: m[1], uid: s.uid };
}
function encerrarSessoesDe(uid) {
  const sessoes = banco.dados.sessoes;
  Object.keys(sessoes).forEach(t => {
    if (sessoes[t].uid === uid) delete sessoes[t];
  });
}
/** Dados da sessão entregues ao navegador. */
function infoSessao(uid) {
  const p = banco.dados.professores[uid];
  if (p) return { uid, papel: 'professor', nome: p.nome, escola: p.escola, email: p.email, foto: p.foto || null };
  if (banco.dados.users[uid]) return { uid, papel: 'aluno' };
  return null;
}

/* ---------- limites contra abuso ---------- */
const ipDe = req =>
  (cfg.ATRAS_DE_PROXY &&
    String(req.headers['x-forwarded-for'] || '')
      .split(',')[0]
      .trim()) ||
  req.socket.remoteAddress ||
  '';

function contador(limite, janelaMs, mensagem) {
  const mapa = new Map();
  return {
    verificar(ip) {
      const c = mapa.get(ip);
      if (c && c.n >= limite && Date.now() - c.inicio < janelaMs) falha(429, 'auth/too-many-requests', mensagem);
    },
    somar(ip) {
      const c = mapa.get(ip);
      if (!c || Date.now() - c.inicio > janelaMs) mapa.set(ip, { n: 1, inicio: Date.now() });
      else c.n++;
    }
  };
}
const falhasDeLogin = contador(
  15,
  10 * 60 * 1000,
  'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.'
);
const cadastros = contador(60, 3600 * 1000, 'Muitos cadastros seguidos a partir desta rede. Tente de novo mais tarde.');

/* ---------- regras de acesso ---------- */
function exigirProfessor(s) {
  const p = s && banco.dados.professores[s.uid];
  if (!p) SEM_PERMISSAO();
  return p;
}
function exigirAluno(s) {
  const a = s && banco.dados.users[s.uid];
  if (!a) SEM_PERMISSAO();
  return a;
}
function turmaDoProfessor(s, turmaId) {
  const t = banco.dados.turmas[turmaId];
  if (!t || t.professorUid !== s.uid) falha(404, 'not-found', 'Turma não encontrada.');
  return t;
}
function alunoDoProfessor(s, uid) {
  const a = banco.dados.users[uid];
  if (!a || a.professorUid !== s.uid) falha(404, 'not-found', 'Aluno não encontrado.');
  return a;
}

module.exports = {
  protegerSenha,
  senhaConfere,
  criarSessao,
  sessaoDe,
  encerrarSessoesDe,
  infoSessao,
  ipDe,
  falhasDeLogin,
  cadastros,
  exigirProfessor,
  exigirAluno,
  turmaDoProfessor,
  alunoDoProfessor
};
