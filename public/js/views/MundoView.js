/* =================================================================
   VIEW / MUNDO — desenha o escritório no canvas e captura a entrada
   Não decide nada: lê o estado do MundoModel e repassa teclas e toques
   ao controller pelos handlers onDirecao, onTocar e onInteragir.
   ================================================================= */
window.SQ = window.SQ || {};
SQ.views = SQ.views || {};

SQ.views.Mundo = function (canvas, model, perfil, handlers) {
  const T = SQ.dados.mapa.tile,
    W = model.largura,
    H = model.altura,
    D = SQ.dados;
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = W * T * dpr;
  canvas.height = H * T * dpr;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Mapa do escritório da DevNova. Use as setas para andar e E para conversar.');
  ctx.scale(dpr, dpr);

  const render = { x: model.jogador.x, y: model.jogador.y }; // posição desenhada (anima entre quadrados)
  let animando = false,
    pausado = false;

  /* Foto do jogador: carregada uma vez e desenhada como a cabeça do personagem */
  let fotoImg = null,
    fotoAtual = null;
  function carregarFoto() {
    const foto = perfil.avatar && perfil.avatar.foto;
    if (foto === fotoAtual) return;
    fotoAtual = foto;
    fotoImg = null;
    if (!foto) return desenhar();
    const img = new Image();
    img.onload = () => {
      if (fotoAtual === foto) {
        fotoImg = img;
        desenhar();
      }
    };
    img.src = foto;
  }

  const escuro = () =>
    document.documentElement.dataset.theme === 'dark' ||
    (document.documentElement.dataset.theme !== 'light' &&
      window.matchMedia &&
      matchMedia('(prefers-color-scheme: dark)').matches);
  const PAL = () =>
    escuro()
      ? {
          corredor: '#2A2E4D',
          grade: 'rgba(255,255,255,.04)',
          parede: '#0B0D1C',
          paredeTopo: '#3A3F66',
          trancada: '#50557A',
          texto: '#C9CCE6',
          escurecer: 0.55
        }
      : {
          corredor: '#ECEEF5',
          grade: 'rgba(22,24,43,.05)',
          parede: '#2B2F4A',
          paredeTopo: '#474C73',
          trancada: '#9AA0BC',
          texto: '#3B4060',
          escurecer: 0
        };

  function misturar(hex, frac) {
    if (!frac) return hex;
    const n = parseInt(hex.slice(1), 16),
      r = n >> 16,
      g = (n >> 8) & 255,
      b = n & 255;
    const f = v => Math.round(v * (1 - frac) + 20 * frac);
    return `rgb(${f(r)},${f(g)},${f(b)})`;
  }
  function rr(x, y, w, h, r, cor) {
    ctx.fillStyle = cor;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h);
    ctx.fill();
  }

  function desenharTile(x, y, p) {
    const c = model.charEm(x, y),
      px = x * T,
      py = y * T;
    const piso = model.pisoDe(x, y);
    ctx.fillStyle = piso ? misturar(piso, p.escurecer) : p.corredor;
    ctx.fillRect(px, py, T, T);
    ctx.strokeStyle = p.grade;
    ctx.strokeRect(px + 0.5, py + 0.5, T - 1, T - 1);
    if (c === '#') {
      ctx.fillStyle = p.parede;
      ctx.fillRect(px, py, T, T);
      ctx.fillStyle = p.paredeTopo;
      ctx.fillRect(px, py, T, 5);
      return;
    }
    const n = model.portaNum(c);
    if (n) {
      const aberta = !model.portaFechada(n);
      ctx.fillStyle = aberta ? (p.escurecer ? '#3B3F63' : '#D8DBE8') : p.trancada;
      ctx.fillRect(px + 2, py, T - 4, T);
      if (!aberta) {
        rr(px + 10, py + 14, 12, 10, 2, '#FFD34D');
        ctx.strokeStyle = '#FFD34D';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(px + 16, py + 14, 4, Math.PI, 0);
        ctx.stroke();
        ctx.lineWidth = 1;
      }
      return;
    }
    if (c === 'T') {
      rr(px + 3, py + 8, T - 6, T - 14, 4, '#B98B5E');
      rr(px + 6, py + 11, 9, 6, 1, '#F4F1E8');
    }
    if (c === 'C') {
      rr(px + 3, py + 12, T - 6, T - 16, 4, '#B98B5E');
      rr(px + 8, py + 3, 16, 12, 2, '#232846');
      rr(px + 10, py + 5, 12, 8, 1, '#5FD3C4');
    }
    if (c === 'S') {
      rr(px + 6, py + 2, T - 12, T - 4, 3, '#2D3150');
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = i % 2 ? '#4ADE80' : '#60A5FA';
        ctx.fillRect(px + 10, py + 6 + i * 6, 3, 2);
        ctx.fillStyle = '#474C73';
        ctx.fillRect(px + 15, py + 6 + i * 6, 8, 2);
      }
    }
    if (c === 'P') {
      rr(px + 11, py + 18, 10, 10, 2, '#B5651D');
      ctx.fillStyle = '#2F9E5B';
      ctx.beginPath();
      ctx.arc(px + 16, py + 13, 9, 0, 7);
      ctx.fill();
    }
    if (c === 'R') {
      rr(px + 1, py + 3, T - 2, T - 8, 3, '#8B5E3C');
      rr(px + 3, py + 5, T - 6, T - 12, 2, '#F4F1E8');
      ['#FFD34D', '#7DD3FC', '#F9A8D4', '#86EFAC'].forEach((cor, i) => {
        ctx.fillStyle = cor;
        ctx.fillRect(px + 5 + (i % 2) * 11, py + 7 + Math.floor(i / 2) * 7, 9, 5);
      });
    }
    if (c === 'B') {
      rr(px + 2, py + 1, T - 4, T - 2, 3, '#7A4E2D');
      const cores = ['#D9486B', '#2C6FD1', '#F2B300', '#0C8F7C', '#8A4FBF', '#F97316'];
      for (let prat = 0; prat < 3; prat++)
        for (let l = 0; l < 5; l++) {
          ctx.fillStyle = cores[(prat * 5 + l) % cores.length];
          ctx.fillRect(px + 5 + l * 4.6, py + 4 + prat * 9, 3.4, 7);
        }
    }
  }

  function desenharPessoa(cx, cy, cor, o = {}) {
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 12, 10, 4, 0, 0, 7);
    ctx.fill();
    rr(cx - 9, cy - 2, 18, 15, 7, cor);
    if (o.foto) {
      // cabeça com a foto: recorte redondo e borda branca
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy - 8, 9, 0, 7);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(o.foto, cx - 9, cy - 17, 18, 18);
      ctx.restore();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy - 8, 9, 0, 7);
      ctx.stroke();
      ctx.lineWidth = 1;
      if (o.letra) {
        ctx.fillStyle = '#fff';
        ctx.font = '700 8px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(o.letra, cx, cy + 8);
      }
      return;
    }
    ctx.fillStyle = o.pele || '#F2C9A0';
    ctx.beginPath();
    ctx.arc(cx, cy - 7, 8, 0, 7);
    ctx.fill();
    ctx.fillStyle = o.cabelo || '#3B2A20';
    ctx.beginPath();
    ctx.arc(cx, cy - 9, 8, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#16182B';
    const ox = (o.dx || 0) * 2,
      oy = (o.dy || 0) * 1.5;
    if ((o.dy || 0) >= 0 || o.dx) {
      ctx.fillRect(cx - 4 + ox, cy - 7 + oy, 2, 2);
      ctx.fillRect(cx + 2 + ox, cy - 7 + oy, 2, 2);
    }
    if (o.letra) {
      ctx.fillStyle = '#fff';
      ctx.font = '700 8px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(o.letra, cx, cy + 8);
    }
  }
  const peles = ['#F2C9A0', '#D9A273', '#A86B45', '#7B4A2E', '#F5D5B8'];
  const cabelos = ['#3B2A20', '#16182B', '#8B5A2B', '#C9A227', '#5C3A21'];
  function marcador(cx, cy, txt, cor) {
    rr(cx - 8, cy - 30, 16, 16, 8, cor);
    ctx.fillStyle = '#16182B';
    ctx.font = '800 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(txt, cx, cy - 22);
    ctx.textBaseline = 'alphabetic';
  }

  function desenhar() {
    const p = PAL();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) desenharTile(x, y, p);
    ctx.fillStyle = p.texto;
    ctx.font = '700 10px system-ui, sans-serif';
    ctx.textAlign = 'left';
    SQ.dados.mapa.salas.forEach(s =>
      ctx.fillText(
        s.missao == null ? s.nome : D.missoes[s.missao].sala,
        s.x * T + 4,
        s.rotuloY * T + (s.rotuloY < 5 ? 12 : 26)
      )
    );
    model.entidades.forEach((e, i) => {
      if (e.tipo !== 'npc') return;
      const cx = e.x * T + T / 2,
        cy = e.y * T + T / 2 + 2;
      desenharPessoa(cx, cy, e.cor, { pele: peles[i % peles.length], cabelo: cabelos[(i * 2) % cabelos.length] });
      if (e.acao === 'missao') {
        const st = model.statusMissao(e.missao);
        if (st === 'disponivel') marcador(cx, cy, '!', '#FFD34D');
        else if (st === 'concluida') marcador(cx, cy, '✓', '#86EFAC');
      } else if (e.acao === 'mentora') marcador(cx, cy, '?', '#C4B5FD');
    });
    const a = perfil.avatar || { cor: '#6B3FD6', classe: 'frontend' };
    const j = model.jogador;
    desenharPessoa(render.x * T + T / 2, render.y * T + T / 2 + 2, a.cor, {
      dx: j.dx,
      dy: j.dy,
      letra: (SQ.util.classes[a.classe] || {}).letra,
      pele: '#E8B98F',
      cabelo: '#2B1D16',
      foto: fotoImg
    });
  }

  /* ---------- animação de um passo ---------- */
  function animarPasso(de, para, fim) {
    const t0 = performance.now(),
      dur = 110;
    animando = true;
    const quadro = agora => {
      const k = Math.min(1, (agora - t0) / dur);
      render.x = de.x + (para.x - de.x) * k;
      render.y = de.y + (para.y - de.y) * k;
      desenhar();
      if (k < 1) requestAnimationFrame(quadro);
      else {
        animando = false;
        fim && fim();
      }
    };
    requestAnimationFrame(quadro);
  }

  /* ---------- entrada ---------- */
  function aoTocar(ev) {
    if (pausado) return;
    const box = canvas.getBoundingClientRect();
    handlers.onTocar(
      Math.floor(((ev.clientX - box.left) / box.width) * W),
      Math.floor(((ev.clientY - box.top) / box.height) * H)
    );
  }
  function aoTeclar(ev) {
    if (pausado || ev.altKey || ev.ctrlKey || ev.metaKey) return;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes((ev.target && ev.target.tagName) || '')) return;
    const dirs = {
      ArrowUp: [0, -1],
      w: [0, -1],
      W: [0, -1],
      ArrowDown: [0, 1],
      s: [0, 1],
      S: [0, 1],
      ArrowLeft: [-1, 0],
      a: [-1, 0],
      A: [-1, 0],
      ArrowRight: [1, 0],
      d: [1, 0],
      D: [1, 0]
    };
    if (dirs[ev.key]) {
      ev.preventDefault();
      handlers.onDirecao(...dirs[ev.key]);
      return;
    }
    if (['e', 'E', 'Enter', ' '].includes(ev.key) && (ev.target === document.body || ev.target === canvas)) {
      ev.preventDefault();
      handlers.onInteragir();
    }
  }
  canvas.addEventListener('click', aoTocar);
  window.addEventListener('keydown', aoTeclar);
  desenhar();
  carregarFoto();

  return {
    desenhar,
    animarPasso,
    /** Chame depois de trocar a foto ou a cor do personagem. */
    atualizarAvatar() {
      carregarFoto();
      desenhar();
    },
    get animando() {
      return animando;
    },
    get pausado() {
      return pausado;
    },
    pausar(v) {
      pausado = v;
    },
    destruir() {
      window.removeEventListener('keydown', aoTeclar);
      canvas.removeEventListener('click', aoTocar);
    }
  };
};
