/* =================================================================
   MODEL / MUNDO — estado e regras do escritório da DevNova
   Posição do jogador, personagens e objetos, colisões, portas trancadas
   e cálculo de caminhos (busca em largura). Não desenha nada.
   ================================================================= */
window.SQ = window.SQ || {};
SQ.models = SQ.models || {};

SQ.models.Mundo = function (perfil, regras) {
  const M = SQ.dados.mapa,
    D = SQ.dados;
  const W = M.linhas[0].length,
    H = M.linhas.length;
  const DIRS = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0]
  ];

  const charEm = (x, y) => (M.linhas[y] || '')[x] || '#';
  const portaNum = c => (/[1-8]/.test(c) ? Number(c) : 0);

  const pos = perfil.posicao && charEm(perfil.posicao.x, perfil.posicao.y) === '.' ? perfil.posicao : M.inicio;
  const jogador = { x: pos.x, y: pos.y, dx: 0, dy: -1 };

  let entidades = [];
  function montarEntidades() {
    entidades = D.missoes
      .map((m, i) => ({
        id: 'npc-' + m.id,
        tipo: 'npc',
        acao: 'missao',
        missao: i,
        x: M.posicoesMissao[i][0],
        y: M.posicoesMissao[i][1],
        nome: m.npc,
        papel: m.papel,
        cor: m.cor
      }))
      .concat(M.extras.map(e => ({ ...e })));
  }
  montarEntidades();

  const entEm = (x, y) => entidades.find(e => e.x === x && e.y === y);
  const portaFechada = n => n && n !== 8 && !regras.portaAberta(n);

  function andavel(x, y) {
    if (entEm(x, y)) return false;
    const c = charEm(x, y);
    if (c === '.') return true;
    const n = portaNum(c);
    return n ? !portaFechada(n) : false;
  }

  function rota(destino) {
    const k = (x, y) => x + ',' + y;
    const vindo = new Map([[k(jogador.x, jogador.y), null]]);
    const fila = [[jogador.x, jogador.y]];
    while (fila.length) {
      const [x, y] = fila.shift();
      if (destino(x, y)) {
        const passos = [];
        let c = k(x, y);
        while (vindo.get(c)) {
          passos.unshift(c.split(',').map(Number));
          c = vindo.get(c);
        }
        return passos;
      }
      for (const [dx, dy] of DIRS) {
        const nx = x + dx,
          ny = y + dy,
          c2 = k(nx, ny);
        if (!vindo.has(c2) && andavel(nx, ny)) {
          vindo.set(c2, k(x, y));
          fila.push([nx, ny]);
        }
      }
    }
    return null;
  }
  const vizinhoDe = (tx, ty) => (x, y) => Math.abs(x - tx) + Math.abs(y - ty) === 1;

  return {
    largura: W,
    altura: H,
    jogador,
    get entidades() {
      return entidades;
    },
    charEm,
    portaNum,
    portaFechada,
    pisoDe(x, y) {
      const s = M.salas.find(r => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
      return s ? s.piso : null;
    },
    statusMissao: i => regras.statusMissao(i),
    atualizar: montarEntidades,

    /* Tenta dar um passo. Sempre vira o jogador para a direção pedida. */
    mover(dx, dy) {
      jogador.dx = dx;
      jogador.dy = dy;
      const nx = jogador.x + dx,
        ny = jogador.y + dy;
      if (!andavel(nx, ny)) {
        const n = portaNum(charEm(nx, ny));
        return { ok: false, portaTrancada: portaFechada(n) ? n : 0 };
      }
      const de = { x: jogador.x, y: jogador.y };
      jogador.x = nx;
      jogador.y = ny;
      return { ok: true, de, para: { x: nx, y: ny } };
    },

    alvoProximo() {
      const frente = entEm(jogador.x + jogador.dx, jogador.y + jogador.dy);
      if (frente) return frente;
      return DIRS.map(([dx, dy]) => entEm(jogador.x + dx, jogador.y + dy)).find(Boolean) || null;
    },
    virarPara(e) {
      jogador.dx = Math.sign(e.x - jogador.x);
      jogador.dy = Math.sign(e.y - jogador.y);
    },

    /* Planeja o caminho até um quadrado tocado: um lugar livre, uma pessoa/objeto ou uma porta trancada. */
    planejarToque(x, y) {
      if (x < 0 || y < 0 || x >= W || y >= H) return null;
      const ent = entEm(x, y);
      if (ent) {
        if (vizinhoDe(x, y)(jogador.x, jogador.y)) return { passos: [], alvo: { ent } };
        const r = rota(vizinhoDe(x, y));
        return r ? { passos: r, alvo: { ent } } : null;
      }
      const n = portaNum(charEm(x, y));
      if (portaFechada(n)) {
        const r = rota(vizinhoDe(x, y));
        return { passos: r || [], alvo: { porta: n } };
      }
      if (!andavel(x, y)) return null;
      const r = rota((px, py) => px === x && py === y);
      return r ? { passos: r, alvo: null } : null;
    },
    planejarAte(entId) {
      const e = entidades.find(x => x.id === entId);
      if (!e) return null;
      const r = rota(vizinhoDe(e.x, e.y));
      return r ? { passos: r, alvo: { ent: e } } : null;
    }
  };
};
