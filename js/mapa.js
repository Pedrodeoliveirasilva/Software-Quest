/* =================================================================
   MUNDO DO RPG — o escritório da DevNova
   Legenda do mapa:
     #  parede          .  chão            1–7  portas das salas (abrem em sequência)
     8  porta da copa (sempre aberta)     T  mesa   C  mesa com computador
     S  servidor        P  planta          R  mural do ranking   B  biblioteca (trilha)
   ================================================================= */
window.SQ = window.SQ || {};

SQ.mapa = {
  tile: 32,
  linhas: [
    '#########################',
    '#.....#.....#.....#.....#',
    '#.....#.....#.....#.....#',
    '#.....#.....#.....#.....#',
    '#.T.T.#.T.T.#.C.C.#.C.C.#',
    '###1#####2#####3#####4###',
    '#...........R...........#',
    '#......................B#',
    '#.......................#',
    '###5#####6#####7#####8###',
    '#.....#.....#.....#.....#',
    '#.S.S.#.C.C.#.T.T.#.P.P.#',
    '#.....#.....#.....#.....#',
    '#.....#.....#.....#.....#',
    '#########################'
  ],
  inicio: { x: 12, y: 7 },
  // Salas: índice da missão, retângulo interno e cor do piso
  salas: [
    { missao: 0, x: 1, y: 1, w: 5, h: 4, piso: '#F7E6EA', rotuloY: 1 },
    { missao: 1, x: 7, y: 1, w: 5, h: 4, piso: '#E4F3E8', rotuloY: 1 },
    { missao: 2, x: 13, y: 1, w: 5, h: 4, piso: '#E3ECFA', rotuloY: 1 },
    { missao: 3, x: 19, y: 1, w: 5, h: 4, piso: '#F5E6F0', rotuloY: 1 },
    { missao: 4, x: 1, y: 10, w: 5, h: 4, piso: '#FAEEDC', rotuloY: 13 },
    { missao: 5, x: 7, y: 10, w: 5, h: 4, piso: '#ECE5FA', rotuloY: 13 },
    { missao: 6, x: 13, y: 10, w: 5, h: 4, piso: '#E4ECF0', rotuloY: 13 },
    { missao: null, nome: 'Copa', x: 19, y: 10, w: 5, h: 4, piso: '#FBF3DA', rotuloY: 13 }
  ]
};

SQ.criarMundo = function (canvas, op) {
  const M = SQ.mapa, T = M.tile, W = M.linhas[0].length, H = M.linhas.length;
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = W * T * dpr; canvas.height = H * T * dpr;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Mapa do escritório da DevNova. Use as setas para andar e E para conversar.');
  ctx.scale(dpr, dpr);

  const escuro = () => document.documentElement.dataset.theme === 'dark' ||
    (document.documentElement.dataset.theme !== 'light' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);

  const inicio = (op.perfil.posicao && M.linhas[op.perfil.posicao.y] && '.'.includes(M.linhas[op.perfil.posicao.y][op.perfil.posicao.x]))
    ? op.perfil.posicao : M.inicio;
  const jog = { x: inicio.x, y: inicio.y, dx: 0, dy: -1, rx: inicio.x, ry: inicio.y };
  let animando = null, caminho = [], passoTimer = null, alvoFinal = null, pausado = false, ultimoProximo = undefined;

  /* ---------- entidades ---------- */
  function entidades() {
    const lista = SQ.missoes.map((m, i) => {
      const topo = i < 4;
      const col = 3 + 6 * (topo ? i : i - 4);
      return { id: 'npc-' + m.id, tipo: 'npc', acao: 'missao', missao: i, x: col, y: topo ? 2 : 12, nome: m.npc, papel: m.papel, cor: m.cor };
    });
    lista.push({ id: 'ana', tipo: 'npc', acao: 'mentora', x: 6, y: 7, nome: 'Ana', papel: 'Líder técnica', cor: '#6B3FD6' });
    lista.push({ id: 'duda', tipo: 'npc', acao: 'dica', x: 21, y: 12, nome: 'Duda', papel: 'Estagiária', cor: '#1F9D55' });
    lista.push({ id: 'biblioteca', tipo: 'objeto', acao: 'trilha', x: 23, y: 7, nome: 'Biblioteca', papel: 'Trilha de aprendizagem' });
    lista.push({ id: 'mural', tipo: 'objeto', acao: 'ranking', x: 12, y: 6, nome: 'Mural', papel: 'Ranking da turma' });
    return lista;
  }
  let ents = entidades();
  const entEm = (x, y) => ents.find(e => e.x === x && e.y === y);

  function charEm(x, y) { return (M.linhas[y] || '')[x] || '#'; }
  function portaNum(c) { return /[1-8]/.test(c) ? Number(c) : 0; }
  function andavel(x, y) {
    const c = charEm(x, y);
    if (entEm(x, y)) return false;
    if (c === '.') return true;
    const n = portaNum(c);
    if (n === 8) return true;
    if (n) return op.portaAberta(n);
    return false;
  }

  /* ---------- desenho ---------- */
  const PAL = () => escuro()
    ? { corredor: '#2A2E4D', grade: 'rgba(255,255,255,.04)', parede: '#0B0D1C', paredeTopo: '#3A3F66', trancada: '#50557A', texto: '#C9CCE6', escurecer: 0.55 }
    : { corredor: '#ECEEF5', grade: 'rgba(22,24,43,.05)', parede: '#2B2F4A', paredeTopo: '#474C73', trancada: '#9AA0BC', texto: '#3B4060', escurecer: 0 };

  function pisoDe(x, y) {
    const s = M.salas.find(r => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
    return s ? s.piso : null;
  }
  function misturar(hex, frac) {
    if (!frac) return hex;
    const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const f = v => Math.round(v * (1 - frac) + 20 * frac);
    return `rgb(${f(r)},${f(g)},${f(b)})`;
  }
  function rr(x, y, w, h, r, cor) { ctx.fillStyle = cor; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); ctx.fill(); }

  function desenharTile(x, y, p) {
    const c = charEm(x, y), px = x * T, py = y * T;
    const piso = pisoDe(x, y);
    ctx.fillStyle = piso ? misturar(piso, p.escurecer) : p.corredor;
    ctx.fillRect(px, py, T, T);
    ctx.strokeStyle = p.grade; ctx.strokeRect(px + .5, py + .5, T - 1, T - 1);
    if (c === '#') {
      ctx.fillStyle = p.parede; ctx.fillRect(px, py, T, T);
      ctx.fillStyle = p.paredeTopo; ctx.fillRect(px, py, T, 5);
      return;
    }
    const n = portaNum(c);
    if (n) {
      const aberta = n === 8 || op.portaAberta(n);
      ctx.fillStyle = aberta ? (p.escurecer ? '#3B3F63' : '#D8DBE8') : p.trancada;
      ctx.fillRect(px + 2, py, T - 4, T);
      if (!aberta) {
        rr(px + 10, py + 14, 12, 10, 2, '#FFD34D');
        ctx.strokeStyle = '#FFD34D'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(px + 16, py + 14, 4, Math.PI, 0); ctx.stroke(); ctx.lineWidth = 1;
      }
      return;
    }
    if (c === 'T') { rr(px + 3, py + 8, T - 6, T - 14, 4, '#B98B5E'); rr(px + 6, py + 11, 9, 6, 1, '#F4F1E8'); }
    if (c === 'C') { rr(px + 3, py + 12, T - 6, T - 16, 4, '#B98B5E'); rr(px + 8, py + 3, 16, 12, 2, '#232846'); rr(px + 10, py + 5, 12, 8, 1, '#5FD3C4'); }
    if (c === 'S') { rr(px + 6, py + 2, T - 12, T - 4, 3, '#2D3150'); for (let i = 0; i < 4; i++) { ctx.fillStyle = i % 2 ? '#4ADE80' : '#60A5FA'; ctx.fillRect(px + 10, py + 6 + i * 6, 3, 2); ctx.fillStyle = '#474C73'; ctx.fillRect(px + 15, py + 6 + i * 6, 8, 2); } }
    if (c === 'P') { rr(px + 11, py + 18, 10, 10, 2, '#B5651D'); ctx.fillStyle = '#2F9E5B'; ctx.beginPath(); ctx.arc(px + 16, py + 13, 9, 0, 7); ctx.fill(); }
    if (c === 'R') {
      rr(px + 1, py + 3, T - 2, T - 8, 3, '#8B5E3C'); rr(px + 3, py + 5, T - 6, T - 12, 2, '#F4F1E8');
      ['#FFD34D', '#7DD3FC', '#F9A8D4', '#86EFAC'].forEach((cor, i) => { ctx.fillStyle = cor; ctx.fillRect(px + 5 + (i % 2) * 11, py + 7 + Math.floor(i / 2) * 7, 9, 5); });
    }
    if (c === 'B') {
      rr(px + 2, py + 1, T - 4, T - 2, 3, '#7A4E2D');
      const cores = ['#D9486B', '#2C6FD1', '#F2B300', '#0C8F7C', '#8A4FBF', '#F97316'];
      for (let prat = 0; prat < 3; prat++) for (let l = 0; l < 5; l++) { ctx.fillStyle = cores[(prat * 5 + l) % cores.length]; ctx.fillRect(px + 5 + l * 4.6, py + 4 + prat * 9, 3.4, 7); }
    }
  }

  function desenharPessoa(cx, cy, cor, opc = {}) {
    ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(cx, cy + 12, 10, 4, 0, 0, 7); ctx.fill();
    rr(cx - 9, cy - 2, 18, 15, 7, cor);
    ctx.fillStyle = opc.pele || '#F2C9A0'; ctx.beginPath(); ctx.arc(cx, cy - 7, 8, 0, 7); ctx.fill();
    ctx.fillStyle = opc.cabelo || '#3B2A20'; ctx.beginPath(); ctx.arc(cx, cy - 9, 8, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#16182B';
    const ox = (opc.dx || 0) * 2, oy = (opc.dy || 0) * 1.5;
    if ((opc.dy || 0) >= 0 || opc.dx) { ctx.fillRect(cx - 4 + ox, cy - 7 + oy, 2, 2); ctx.fillRect(cx + 2 + ox, cy - 7 + oy, 2, 2); }
    if (opc.letra) { ctx.fillStyle = '#fff'; ctx.font = '700 8px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(opc.letra, cx, cy + 8); }
  }

  const peles = ['#F2C9A0', '#D9A273', '#A86B45', '#7B4A2E', '#F5D5B8'];
  const cabelos = ['#3B2A20', '#16182B', '#8B5A2B', '#C9A227', '#5C3A21'];

  function marcador(cx, cy, txt, cor) {
    rr(cx - 8, cy - 30, 16, 16, 8, cor);
    ctx.fillStyle = '#16182B'; ctx.font = '800 12px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(txt, cx, cy - 22); ctx.textBaseline = 'alphabetic';
  }

  function desenhar() {
    const p = PAL();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) desenharTile(x, y, p);
    ctx.fillStyle = p.texto; ctx.font = '700 10px system-ui, sans-serif'; ctx.textAlign = 'left';
    M.salas.forEach(s => {
      const nome = s.missao == null ? s.nome : SQ.missoes[s.missao].sala;
      ctx.fillText(nome, s.x * T + 4, s.rotuloY * T + (s.rotuloY < 5 ? 12 : 26));
    });
    ents.forEach((e, i) => {
      if (e.tipo !== 'npc') return;
      const cx = e.x * T + T / 2, cy = e.y * T + T / 2 + 2;
      desenharPessoa(cx, cy, e.cor, { pele: peles[i % peles.length], cabelo: cabelos[(i * 2) % cabelos.length] });
      if (e.acao === 'missao') {
        const st = op.statusMissao(e.missao);
        if (st === 'disponivel') marcador(cx, cy, '!', '#FFD34D');
        else if (st === 'concluida') marcador(cx, cy, '✓', '#86EFAC');
      } else if (e.acao === 'mentora') marcador(cx, cy, '?', '#C4B5FD');
    });
    const a = op.perfil.avatar || { cor: '#6B3FD6', classe: 'frontend' };
    const letra = { frontend: 'F', backend: 'B', qa: 'Q', devops: 'D' }[a.classe] || '';
    desenharPessoa(jog.rx * T + T / 2, jog.ry * T + T / 2 + 2, a.cor, { dx: jog.dx, dy: jog.dy, letra, pele: '#E8B98F', cabelo: '#2B1D16' });
  }

  /* ---------- movimento ---------- */
  function animar(ax, ay, bx, by, fim) {
    const t0 = performance.now(), dur = 110;
    animando = true;
    const passo = (agora) => {
      const k = Math.min(1, (agora - t0) / dur);
      jog.rx = ax + (bx - ax) * k; jog.ry = ay + (by - ay) * k;
      desenhar();
      if (k < 1) requestAnimationFrame(passo); else { animando = false; fim && fim(); }
    };
    requestAnimationFrame(passo);
  }

  function avisarProximo() {
    const alvo = alvoProximo();
    if (alvo !== ultimoProximo) { ultimoProximo = alvo; op.onProximo && op.onProximo(alvo); }
  }

  function mover(dx, dy, fim) {
    if (pausado || animando) return false;
    jog.dx = dx; jog.dy = dy;
    const nx = jog.x + dx, ny = jog.y + dy;
    if (!andavel(nx, ny)) {
      const n = portaNum(charEm(nx, ny));
      if (n && n !== 8 && !op.portaAberta(n)) op.onBloqueado && op.onBloqueado(n);
      desenhar(); avisarProximo(); fim && fim(false);
      return false;
    }
    const ax = jog.x, ay = jog.y;
    jog.x = nx; jog.y = ny;
    animar(ax, ay, nx, ny, () => { op.onMover && op.onMover({ x: jog.x, y: jog.y }); avisarProximo(); fim && fim(true); });
    return true;
  }

  function alvoProximo() {
    const frente = entEm(jog.x + jog.dx, jog.y + jog.dy);
    if (frente) return frente;
    return [[0, -1], [1, 0], [0, 1], [-1, 0]].map(([dx, dy]) => entEm(jog.x + dx, jog.y + dy)).find(Boolean) || null;
  }

  function interagir() {
    if (pausado || animando) return;
    const alvo = alvoProximo();
    if (!alvo) { SQ.toast('Chegue perto de uma pessoa ou objeto para interagir.'); return; }
    jog.dx = Math.sign(alvo.x - jog.x); jog.dy = Math.sign(alvo.y - jog.y);
    desenhar();
    op.onInteragir(alvo);
  }

  /* ---------- tocar para andar (busca em largura) ---------- */
  function rota(dest) {
    const chave = (x, y) => x + ',' + y;
    const vindo = new Map([[chave(jog.x, jog.y), null]]);
    const fila = [[jog.x, jog.y]];
    while (fila.length) {
      const [x, y] = fila.shift();
      if (dest(x, y)) {
        const passos = []; let k = chave(x, y);
        while (vindo.get(k)) { const [px, py] = k.split(',').map(Number); passos.unshift([px, py]); k = vindo.get(k); }
        return passos;
      }
      for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
        const nx = x + dx, ny = y + dy, k2 = chave(nx, ny);
        if (!vindo.has(k2) && andavel(nx, ny)) { vindo.set(k2, chave(x, y)); fila.push([nx, ny]); }
      }
    }
    return null;
  }

  function seguir() {
    clearTimeout(passoTimer);
    if (!caminho.length) {
      if (alvoFinal) {
        const a = alvoFinal; alvoFinal = null;
        if (a.ent) { jog.dx = Math.sign(a.ent.x - jog.x); jog.dy = Math.sign(a.ent.y - jog.y); desenhar(); avisarProximo(); op.onInteragir(a.ent); }
        else if (a.porta) op.onBloqueado && op.onBloqueado(a.porta);
      }
      return;
    }
    const [nx, ny] = caminho.shift();
    mover(nx - jog.x, ny - jog.y, (ok) => { if (ok) passoTimer = setTimeout(seguir, 10); else { caminho = []; alvoFinal = null; } });
  }

  function aoTocar(ev) {
    if (pausado) return;
    const box = canvas.getBoundingClientRect();
    const x = Math.floor((ev.clientX - box.left) / box.width * W);
    const y = Math.floor((ev.clientY - box.top) / box.height * H);
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    caminho = []; alvoFinal = null;
    const ent = entEm(x, y);
    const adj = (tx, ty) => (px, py) => Math.abs(px - tx) + Math.abs(py - ty) === 1;
    if (ent) {
      if (Math.abs(ent.x - jog.x) + Math.abs(ent.y - jog.y) === 1) { alvoFinal = { ent }; seguir(); return; }
      const r = rota(adj(x, y)); if (!r) return;
      caminho = r; alvoFinal = { ent }; seguir(); return;
    }
    const n = portaNum(charEm(x, y));
    if (n && n !== 8 && !op.portaAberta(n)) {
      const r = rota(adj(x, y)); if (r) { caminho = r; alvoFinal = { porta: n }; seguir(); } else op.onBloqueado && op.onBloqueado(n);
      return;
    }
    if (!andavel(x, y)) return;
    const r = rota((px, py) => px === x && py === y);
    if (r) { caminho = r; seguir(); }
  }

  function aoTeclar(ev) {
    if (pausado || ev.altKey || ev.ctrlKey || ev.metaKey) return;
    const alvoTag = (ev.target && ev.target.tagName) || '';
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(alvoTag)) return;
    const dirs = { ArrowUp: [0, -1], w: [0, -1], W: [0, -1], ArrowDown: [0, 1], s: [0, 1], S: [0, 1], ArrowLeft: [-1, 0], a: [-1, 0], A: [-1, 0], ArrowRight: [1, 0], d: [1, 0], D: [1, 0] };
    if (dirs[ev.key]) { ev.preventDefault(); caminho = []; alvoFinal = null; mover(...dirs[ev.key]); return; }
    if (['e', 'E', 'Enter', ' '].includes(ev.key) && (ev.target === document.body || ev.target === canvas)) { ev.preventDefault(); interagir(); }
  }

  canvas.addEventListener('click', aoTocar);
  window.addEventListener('keydown', aoTeclar);
  desenhar();
  setTimeout(avisarProximo, 0);

  return {
    desenhar,
    mover: (dx, dy) => { caminho = []; alvoFinal = null; mover(dx, dy); },
    interagir,
    pausar(v) { pausado = v; if (v) { caminho = []; alvoFinal = null; clearTimeout(passoTimer); } },
    atualizar() { ents = entidades(); desenhar(); ultimoProximo = undefined; avisarProximo(); },
    destruir() { window.removeEventListener('keydown', aoTeclar); canvas.removeEventListener('click', aoTocar); clearTimeout(passoTimer); },
    irPara(entId) { const e = ents.find(x => x.id === entId); if (!e) return; const r = rota((px, py) => Math.abs(px - e.x) + Math.abs(py - e.y) === 1); if (r) { caminho = r; alvoFinal = { ent: e }; seguir(); } }
  };
};
