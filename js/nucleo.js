/* =================================================================
   NÚCLEO: funções usadas por todas as partes do sistema
   ================================================================= */
window.SQ = window.SQ || {};

/* Permite passar null/false para replaceChildren e append (elementos opcionais),
   sem que o navegador escreva o texto "null" na tela. */
(function () {
  const limpa = a => a.flat(3).filter(x => x != null && x !== false);
  const rc = Element.prototype.replaceChildren, ap = Element.prototype.append;
  Element.prototype.replaceChildren = function (...a) { return rc.apply(this, limpa(a)); };
  Element.prototype.append = function (...a) { return ap.apply(this, limpa(a)); };
})();

/* Cria elementos: el('div', {class:'x', onclick: fn}, filho1, filho2) */
SQ.el = function (tag, attrs, ...filhos) {
  const n = document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v == null) continue;
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(n.style, v);
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v === true ? '' : v);
  }
  for (const f of filhos.flat(3)) if (f != null && f !== false) n.append(f.nodeType ? f : document.createTextNode(String(f)));
  return n;
};

SQ.embaralhar = function (lista) {
  const a = lista.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

SQ.formatarTempo = function (ms) {
  const s = Math.max(0, Math.round(ms / 1000)); const m = Math.floor(s / 60);
  return m > 0 ? `${m}min ${String(s % 60).padStart(2, '0')}s` : `${s}s`;
};

SQ.nivelDe = function (xp) {
  const niveis = SQ.config.niveis;
  let atual = niveis[0], proximo = null;
  for (let i = 0; i < niveis.length; i++) {
    if (xp >= niveis[i].xp) { atual = niveis[i]; proximo = niveis[i + 1] || null; }
  }
  const idx = niveis.indexOf(atual);
  const pct = proximo ? (xp - atual.xp) / (proximo.xp - atual.xp) : 1;
  return { nome: atual.nome, indice: idx + 1, proximo, pct: Math.max(0, Math.min(1, pct)) };
};

SQ.novoPerfil = function ({ uid, usuario, apelido, turma, avatar, codigoPesquisa }) {
  return {
    uid, papel: 'aluno', usuario, apelido, avatar,
    turmaId: turma.turmaId, turma: turma.nome, codigoTurma: turma.codigo, professorUid: turma.professorUid,
    codigoPesquisa: codigoPesquisa || null,   // código de participante (só em turmas de pesquisa)
    xp: 0, qualidade: 100,
    licoes: {},            // { idLicao: { concluidaEm, acertouPrimeira } }
    missoes: {},           // { idMissao: { pontos, estrelas, acertosPrimeira, total, tempoSegundos, concluidaEm } }
    itens: [],             // ids das missões cujos itens foram ganhos
    requisitosErrados: [], // consequência usada na missão de manutenção
    posicao: null,
    criadoEm: new Date().toISOString(), ultimoAcesso: null
  };
};

/* ---------- Códigos de turma: 6 caracteres sem letras/números ambíguos (0/O, 1/I/L) ---------- */
SQ.ALFABETO_CODIGO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
SQ.gerarCodigoTurma = function () {
  let c = '';
  const rnd = new Uint32Array(6);
  (window.crypto || window.msCrypto).getRandomValues(rnd);
  for (let i = 0; i < 6; i++) c += SQ.ALFABETO_CODIGO[rnd[i] % SQ.ALFABETO_CODIGO.length];
  return c;
};
SQ.normalizarCodigo = t => String(t || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
SQ.formatarCodigo = c => { const n = SQ.normalizarCodigo(c); return n.length === 6 ? n.slice(0, 3) + '-' + n.slice(3) : n; };

/* ---------- Nome de usuário ---------- */
SQ.normalizarUsuario = t => String(t || '').trim().toLowerCase();
SQ.usuarioValido = t => /^[a-z0-9_]{3,20}$/.test(SQ.normalizarUsuario(t));

/* ---------- Filtro simples de palavras impróprias (apelidos e usuários) ----------
   Lista curta e propositalmente conservadora; amplie conforme a necessidade. */
SQ.termosBloqueados = ['porra', 'caralho', 'merda', 'bosta', 'puta', 'puto', 'fdp', 'buceta', 'cacete', 'viado', 'arrombad',
  'otario', 'idiota', 'imbecil', 'babaca', 'vagabund', 'piroca', 'rola', 'pinto', 'cu', 'xota', 'nazi', 'nazista', 'hitler', 'retardad'];
SQ.textoImproprio = function (texto) {
  const t = String(texto || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[0@]/g, 'o').replace(/[1!]/g, 'i').replace(/3/g, 'e').replace(/4/g, 'a').replace(/5|\$/g, 's');
  const palavras = t.split(/[^a-z]+/).filter(Boolean);
  const junto = palavras.join('');
  return SQ.termosBloqueados.some(b => b.length <= 5 ? palavras.includes(b) : junto.includes(b));
};

SQ.classes = {
  frontend: { nome: 'Front-end', desc: 'Cuida das telas' },
  backend: { nome: 'Back-end', desc: 'Cuida dos dados' },
  qa: { nome: 'QA', desc: 'Caça os bugs' },
  devops: { nome: 'DevOps', desc: 'Cuida do pipeline' }
};
SQ.coresAvatar = ['#6B3FD6', '#2C6FD1', '#0C8F7C', '#D9486B', '#C77A12', '#4E6E81', '#8A4FBF', '#1F9D55'];

SQ.toast = function (texto, ms = 2800) {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const t = SQ.el('div', { class: 'toast', role: 'status', text: texto });
  document.body.append(t);
  setTimeout(() => t.remove(), ms);
};

SQ.estrelas = function (qtd, total = 3) { return '★'.repeat(qtd) + '☆'.repeat(total - qtd); };

SQ.baixarArquivo = async function (nome, conteudo) {
  const dados = '\ufeff' + conteudo;
  try {
    if (window.claude && typeof window.claude.use === 'function') {
      const downloads = await window.claude.use('downloads');
      if (downloads) { await downloads.save({ filename: nome, data: dados }); return 'salvo'; }
    }
  } catch (e) { if (e && e.code === 'declined') return 'cancelado'; }
  const blob = new Blob([dados], { type: 'text/csv;charset=utf-8' });
  const a = SQ.el('a', { href: URL.createObjectURL(blob), download: nome });
  document.body.append(a); a.click(); a.remove();
  return 'salvo';
};

SQ.csv = function (linhas) {
  const esc = v => { const s = String(v ?? ''); return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  return linhas.map(l => l.map(esc).join(',')).join('\n');
};
