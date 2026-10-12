/* =================================================================
   CORE / DOM — utilitários de interface usados pelas views
   ================================================================= */
window.SQ = window.SQ || {};

/* Permite passar null/false para replaceChildren e append (elementos opcionais),
   sem que o navegador escreva o texto "null" na tela. */
(function () {
  const limpa = a => a.flat(3).filter(x => x != null && x !== false);
  const rc = Element.prototype.replaceChildren,
    ap = Element.prototype.append;
  Element.prototype.replaceChildren = function (...a) {
    return rc.apply(this, limpa(a));
  };
  Element.prototype.append = function (...a) {
    return ap.apply(this, limpa(a));
  };
})();

SQ.dom = {};

/* Cria elementos: el('div', { class: 'x', onclick: fn }, filho1, filho2) */
SQ.dom.el = function (tag, attrs, ...filhos) {
  const n = document.createElement(tag);
  if (attrs)
    for (const [k, v] of Object.entries(attrs)) {
      if (v === false || v == null) continue;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(n.style, v);
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    }
  for (const f of filhos.flat(3))
    if (f != null && f !== false) n.append(f.nodeType ? f : document.createTextNode(String(f)));
  return n;
};

/* Avatar redondo: mostra a foto, se houver, ou a inicial sobre a cor escolhida.
   tamanho: '' (34 px), 'medio' (48 px) ou 'grande' (96 px). */
SQ.dom.avatar = function ({ foto, cor, texto, tamanho = '', rotulo } = {}) {
  const el = SQ.dom.el;
  const classe = 'dot-avatar' + (tamanho ? ' avatar-' + tamanho : '') + (foto ? ' com-foto' : '');
  return el(
    'span',
    {
      class: classe,
      style: { background: cor || '#6B3FD6' },
      role: rotulo ? 'img' : null,
      'aria-label': rotulo || null,
      'aria-hidden': rotulo ? null : 'true'
    },
    foto
      ? el('img', { src: foto, alt: '' })
      : String(texto || '?')
          .slice(0, 1)
          .toUpperCase()
  );
};

SQ.dom.toast = function (texto, ms = 2800) {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const t = SQ.dom.el('div', { class: 'toast', role: 'status', text: texto });
  document.body.append(t);
  setTimeout(() => t.remove(), ms);
};

/* Janela sobreposta (modal). Os controllers podem registrar aoAbrir/aoFechar
   para, por exemplo, pausar o mundo do jogo enquanto a janela está aberta. */
SQ.dom.overlay = (function () {
  const el = SQ.dom.el;
  let atual = null;
  const api = {
    aoAbrir: null,
    aoFechar: null,
    get atual() {
      return atual;
    },
    abrir(titulo, { antesDeFechar } = {}) {
      api.fechar(true);
      api.aoAbrir && api.aoAbrir();
      const corpo = el('div');
      const fechar = async () => {
        if (antesDeFechar && !(await antesDeFechar())) return;
        api.fechar();
      };
      const titulo$ = el('h2', { id: 'ov-titulo', text: titulo });
      const ov = el(
        'div',
        {
          class: 'overlay',
          role: 'dialog',
          'aria-modal': 'true',
          'aria-labelledby': 'ov-titulo',
          onkeydown: e => {
            if (e.key === 'Escape') fechar();
          }
        },
        el(
          'div',
          { class: 'modal' },
          el(
            'div',
            { class: 'modal-head' },
            titulo$,
            el('button', { class: 'close', 'aria-label': 'Fechar', onclick: fechar, text: '✕' })
          ),
          corpo
        )
      );
      document.body.append(ov);
      document.body.style.overflow = 'hidden';
      atual = { ov, corpo, titulo$ };
      setTimeout(() => ov.querySelector('.close').focus(), 20);
      return atual;
    },
    fechar(silencioso) {
      if (!atual) return;
      atual.ov.remove();
      atual = null;
      document.body.style.overflow = '';
      api.aoFechar && api.aoFechar(silencioso);
    },
    rolarTopo() {
      if (atual) atual.ov.scrollTop = 0;
    }
  };
  return api;
})();
