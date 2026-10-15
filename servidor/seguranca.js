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
  banco.alterar('sessoes', token);
  return token;
}
/** Lê o token do cabeçalho Authorization e devolve { token, uid } ou null. */
function sessaoDe(req) {
  const m = /^Bearer\s+([a-f0-9]{48})$/i.exec(req.headers.authorization || '');
  const s = m && banco.dados.sessoes[m[1]];
  if (!s) return null;
  if (Date.now() - s.criadaEm > cfg.VALIDADE_SESSAO_MS) {
    delete banco.dados.sessoes[m[1]];
    banco.alterar('sessoes', m[1]);
    return null;
  }
  return { token: m[1], uid: s.uid };
}
function encerrarSessoesDe(uid) {
  const sessoes = banco.dados.sessoes;
  Object.keys(sessoes).forEach(t => {
    if (sessoes[t].uid === uid) {
      delete sessoes[t];
      banco.alterar('sessoes', t);
    }
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

/**
 * IP do visitante. Atrás de um proxy (Render), o IP da conexão é o do proxy, então ele vem
 * de um cabeçalho. O X-Forwarded-For pode trazer valores inventados pelo próprio visitante
 * à esquerda, por isso:
 *  1. usa o CF-Connecting-IP, que a Cloudflare (usada pelo Render) sempre sobrescreve;
 *  2. se não houver, usa o último valor do X-Forwarded-For (o acrescentado pelo proxy).
 * Mesmo assim, o IP serve só como proteção extra: o limite principal de senhas erradas é
 * por conta (veja verificarLogin), e esse não depende de IP.
 */
function ipDe(req) {
  if (cfg.ATRAS_DE_PROXY) {
    const cf = String(req.headers['cf-connecting-ip'] || '').trim();
    if (cf) return cf;
    const lista = String(req.headers['x-forwarded-for'] || '')
      .split(',')
      .map(x => x.trim())
      .filter(Boolean);
    if (lista.length) return lista[lista.length - 1];
  }
  return req.socket.remoteAddress || '';
}

/** Conta ocorrências por chave numa janela de tempo. Entradas antigas são descartadas sozinhas. */
function contador(limite, janelaMs, mensagem) {
  const mapa = new Map();
  let ultimaLimpeza = Date.now();
  function limpar() {
    const agora = Date.now();
    if (agora - ultimaLimpeza < janelaMs) return;
    ultimaLimpeza = agora;
    for (const [k, c] of mapa) if (agora - c.inicio > janelaMs) mapa.delete(k);
  }
  return {
    verificar(chave) {
      const c = mapa.get(chave);
      if (c && c.n >= limite && Date.now() - c.inicio < janelaMs) falha(429, 'auth/too-many-requests', mensagem);
    },
    somar(chave) {
      limpar();
      const c = mapa.get(chave);
      if (!c || Date.now() - c.inicio > janelaMs) mapa.set(chave, { n: 1, inicio: Date.now() });
      else c.n++;
    },
    zerar(chave) {
      mapa.delete(chave);
    }
  };
}

const L = cfg.LIMITES;
// Senhas erradas numa mesma conta: o limite principal, que não depende de IP
const falhasPorConta = contador(
  L.falhasPorConta,
  L.janelaLoginMs,
  'Muitas tentativas erradas nesta conta. Espere alguns minutos e tente de novo.'
);
// Senhas erradas a partir de um mesmo IP: bem mais alto, porque uma turma inteira costuma
// sair pela mesma internet da escola
const falhasPorIp = contador(
  L.falhasPorIp,
  L.janelaLoginMs,
  'Muitas tentativas seguidas a partir desta rede. Espere alguns minutos e tente de novo.'
);
const cadastros = contador(
  L.cadastrosPorIp,
  3600 * 1000,
  'Muitos cadastros seguidos a partir desta rede. Tente de novo mais tarde.'
);
const eventosPorMinuto = contador(L.eventosPorMinuto, 60 * 1000, 'Muitos registros em pouco tempo. Espere um pouco.');

/** Antes de conferir a senha: bloqueia se a conta ou a rede passaram do limite de erros. */
function verificarLogin(ip, conta) {
  falhasPorConta.verificar(conta);
  falhasPorIp.verificar(ip);
}
function falhaDeLogin(ip, conta) {
  falhasPorConta.somar(conta);
  falhasPorIp.somar(ip);
}
/** Login certo zera os erros da conta (os da rede continuam contando). */
function loginCerto(conta) {
  falhasPorConta.zerar(conta);
}

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
  verificarLogin,
  falhaDeLogin,
  loginCerto,
  cadastros,
  eventosPorMinuto,
  exigirProfessor,
  exigirAluno,
  turmaDoProfessor,
  alunoDoProfessor
};
