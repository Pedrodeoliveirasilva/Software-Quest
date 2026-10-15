/* =================================================================
   CORE / DOM — peças de interface usadas por várias telas
   - avatar:  círculo com a foto ou a inicial
   - toast:   aviso rápido na parte de baixo da tela
   - overlay: janela sobreposta (missões, trilha, ranking, conta...)
   ================================================================= */
window.SQ = window.SQ || {};

SQ.dom = {};

/**
 * Avatar redondo: mostra a foto, se houver, ou a inicial sobre a cor escolhida.
 * tamanho: '' (34 px), 'medio' (48 px) ou 'grande' (96 px).
 * Com rotulo, é anunciado por leitores de tela; sem rotulo, é decorativo.
 */
SQ.dom.avatar = function ({ foto, cor, texto, tamanho = '', rotulo } = {}) {
  const html = SQ.html;
  const classe = 'dot-avatar' + (tamanho ? ' avatar-' + tamanho : '') + (foto ? ' com-foto' : '');
  const acessibilidade = rotulo ? { role: 'img', 'aria-label': rotulo } : { 'aria-hidden': 'true' };
  const inicial = String(texto || '?')
    .slice(0, 1)
    .toUpperCase();
  // Só aceita cor no formato #RRGGBB: o valor vai para um atributo style e vem de outros alunos
  const corSegura = /^#[0-9a-fA-F]{6}$/.test(cor || '') ? cor : '#6B3FD6';
  return html.elemento`
    <span class="${classe}" style="background: ${corSegura}" ${html.atributos(acessibilidade)}>${foto ? html`<img src="${foto}" alt="" />` : inicial}</span>`;
};

/** Aviso rápido que some sozinho depois de alguns segundos. */
SQ.dom.toast = function (texto, ms = 2800) {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const aviso = SQ.html.elemento`<div class="toast" role="status">${texto}</div>`;
  document.body.append(aviso);
  setTimeout(() => aviso.remove(), ms);
};

/**
 * Janela sobreposta (modal). abrir() devolve { ov, corpo, titulo$ }: coloque o conteúdo em corpo.
 * Os controllers podem registrar aoAbrir/aoFechar para, por exemplo, pausar o mapa enquanto
 * a janela está aberta. antesDeFechar pode devolver false para impedir o fechamento.
 */
SQ.dom.overlay = (function () {
  let atual = null;

  const api = {
    aoAbrir: null,
    aoFechar: null,
    get atual() {
      return atual;
    },

    abrir(titulo, { antesDeFechar } = {}) {
      const html = SQ.html;
      api.fechar(true);
      if (api.aoAbrir) api.aoAbrir();

      async function pedirFechamento() {
        if (antesDeFechar && !(await antesDeFechar())) return;
        api.fechar();
      }
      function teclas(evento) {
        if (evento.key === 'Escape') pedirFechamento();
      }

      const janela = html.elemento`
        <div class="overlay" role="dialog" aria-modal="true" aria-labelledby="ov-titulo" onkeydown=${teclas}>
          <div class="modal">
            <div class="modal-head">
              <h2 id="ov-titulo" data-ref="titulo">${titulo}</h2>
              <button class="close" aria-label="Fechar" onclick=${pedirFechamento}>✕</button>
            </div>
            <div data-ref="corpo"></div>
          </div>
        </div>`;
      const refs = html.refs(janela);
      document.body.append(janela);
      document.body.style.overflow = 'hidden';
      atual = { ov: janela, corpo: refs.corpo, titulo$: refs.titulo };
      setTimeout(() => janela.querySelector('.close').focus(), 20);
      return atual;
    },

    fechar(silencioso) {
      if (!atual) return;
      atual.ov.remove();
      atual = null;
      document.body.style.overflow = '';
      if (api.aoFechar) api.aoFechar(silencioso);
    },

    rolarTopo() {
      if (atual) atual.ov.scrollTop = 0;
    }
  };

  return api;
})();
