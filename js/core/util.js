/* =================================================================
   CORE / UTIL — funções puras, sem interface, usadas por todas as camadas
   ================================================================= */
window.SQ = window.SQ || {};

SQ.util = {
  embaralhar(lista) {
    const a = lista.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  },
  formatarTempo(ms) {
    const s = Math.max(0, Math.round(ms / 1000));
    const m = Math.floor(s / 60);
    return m > 0 ? `${m}min ${String(s % 60).padStart(2, '0')}s` : `${s}s`;
  },
  estrelas(qtd, total = 3) {
    return '★'.repeat(qtd) + '☆'.repeat(total - qtd);
  },
  capitalizar(t) {
    return t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
  },

  /* ---------- CSV e download ---------- */
  csv(linhas) {
    const esc = v => {
      const s = String(v ?? '');
      return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    return linhas.map(l => l.map(esc).join(',')).join('\n');
  },
  async baixarArquivo(nome, conteudo) {
    const dados = '\ufeff' + conteudo;
    try {
      if (window.claude && typeof window.claude.use === 'function') {
        const downloads = await window.claude.use('downloads');
        if (downloads) {
          await downloads.save({ filename: nome, data: dados });
          return 'salvo';
        }
      }
    } catch (e) {
      if (e && e.code === 'declined') return 'cancelado';
    }
    const blob = new Blob([dados], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = nome;
    document.body.append(a);
    a.click();
    a.remove();
    return 'salvo';
  },
  nomeArquivo(t) {
    return String(t || 'arquivo')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase();
  },

  /* ---------- Códigos de turma: 6 caracteres sem letras/números ambíguos (0/O, 1/I/L) ---------- */
  ALFABETO_CODIGO: 'ABCDEFGHJKMNPQRSTUVWXYZ23456789',
  gerarCodigoTurma() {
    const rnd = new Uint32Array(6);
    (window.crypto || window.msCrypto).getRandomValues(rnd);
    let c = '';
    for (let i = 0; i < 6; i++) c += SQ.util.ALFABETO_CODIGO[rnd[i] % SQ.util.ALFABETO_CODIGO.length];
    return c;
  },
  normalizarCodigo: t =>
    String(t || '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, ''),
  formatarCodigo(c) {
    const n = SQ.util.normalizarCodigo(c);
    return n.length === 6 ? n.slice(0, 3) + '-' + n.slice(3) : n;
  },

  /* ---------- Nome de usuário ---------- */
  normalizarUsuario: t =>
    String(t || '')
      .trim()
      .toLowerCase(),
  usuarioValido: t => /^[a-z0-9_]{3,20}$/.test(SQ.util.normalizarUsuario(t)),
  emailValido: t => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(t || '').trim()),

  /* ---------- Filtro simples de palavras impróprias (apelidos e usuários) ----------
     Lista curta e conservadora; amplie conforme a necessidade.
     Termos de até 5 letras só são bloqueados como palavra inteira. */
  termosBloqueados: [
    'porra',
    'caralho',
    'merda',
    'bosta',
    'puta',
    'puto',
    'fdp',
    'buceta',
    'cacete',
    'viado',
    'arrombad',
    'otario',
    'idiota',
    'imbecil',
    'babaca',
    'vagabund',
    'piroca',
    'rola',
    'pinto',
    'cu',
    'xota',
    'nazi',
    'nazista',
    'hitler',
    'retardad'
  ],
  textoImproprio(texto) {
    const t = String(texto || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[0@]/g, 'o')
      .replace(/[1!]/g, 'i')
      .replace(/3/g, 'e')
      .replace(/4/g, 'a')
      .replace(/5|\$/g, 's');
    const palavras = t.split(/[^a-z]+/).filter(Boolean);
    const junto = palavras.join('');
    return SQ.util.termosBloqueados.some(b => (b.length <= 5 ? palavras.includes(b) : junto.includes(b)));
  },

  /* ---------- Personagem ---------- */
  classes: {
    frontend: { nome: 'Front-end', desc: 'Cuida das telas', letra: 'F' },
    backend: { nome: 'Back-end', desc: 'Cuida dos dados', letra: 'B' },
    qa: { nome: 'QA', desc: 'Caça os bugs', letra: 'Q' },
    devops: { nome: 'DevOps', desc: 'Cuida do pipeline', letra: 'D' }
  },
  coresAvatar: ['#6B3FD6', '#2C6FD1', '#0C8F7C', '#D9486B', '#C77A12', '#4E6E81', '#8A4FBF', '#1F9D55']
};
