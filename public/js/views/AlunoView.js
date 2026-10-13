/* =================================================================
   VIEW / ALUNO — estrutura da tela do aluno
   Barra superior (HUD), área do mapa, controles de toque, painel lateral,
   barra de interação e caixas de diálogo com personagens.
   ================================================================= */
window.SQ = window.SQ || {};
SQ.views = SQ.views || {};

SQ.views.Aluno = function (raiz, { handlers }) {
  const html = SQ.html;
  const U = SQ.util;
  const P = SQ.models.Perfil;
  const MENU = [
    ['trilha', 'Trilha'],
    ['missoes', 'Missões'],
    ['mochila', 'Mochila'],
    ['ranking', 'Ranking'],
    ['perfil', 'Personagem'],
    ['sair', 'Sair']
  ];
  let dialogoAberto = null;

  /* =================================================================
     Montagem
     ================================================================= */
  const tela = html` <header class="hud" data-ref="hud"></header>
    <main class="wrap">
      <div class="world">
        <div>
          <div class="canvas-wrap" data-ref="moldura">
            <div class="canvas-scroll" data-ref="rolagem">
              <canvas tabindex="0" data-ref="canvas"></canvas>
            </div>
            <div class="prompt-bar" aria-live="polite" data-ref="prompt"></div>
          </div>
          <div class="dpad" aria-label="Controles de movimento">
            <button class="up" aria-label="Andar para cima" onclick=${() => handlers.onDirecao(0, -1)}>▲</button>
            <button class="left" aria-label="Andar para a esquerda" onclick=${() => handlers.onDirecao(-1, 0)}>
              ◀
            </button>
            <button class="act" onclick=${() => handlers.onInteragir()}>Falar</button>
            <button class="right" aria-label="Andar para a direita" onclick=${() => handlers.onDirecao(1, 0)}>▶</button>
            <button class="down" aria-label="Andar para baixo" onclick=${() => handlers.onDirecao(0, 1)}>▼</button>
          </div>
        </div>
        <aside class="side">
          <div class="card objective" data-ref="objetivo"></div>
          <div class="card reco" data-ref="recomendacao"></div>
          <div class="card">
            <h3>Como jogar</h3>
            <p class="muted" style="margin: 0; font-size: .95rem">
              Ande com as setas (ou W, A, S, D) e aperte E para conversar. No celular ou com o mouse, toque no lugar
              para onde quer ir ou em uma pessoa para falar com ela. A Biblioteca abre a trilha de aprendizagem e o
              Mural mostra o ranking.
            </p>
          </div>
        </aside>
      </div>
    </main>`;
  const refs = html.refs(tela);
  raiz.replaceChildren(tela);

  /* =================================================================
     Partes que mudam durante o jogo
     ================================================================= */

  /** Barra superior: avatar, nível, XP, qualidade e menu. */
  function hud(perfil) {
    const nivel = P.nivelDe(perfil.xp);
    const qualidade = Math.round(perfil.qualidade);
    const faltam = nivel.proximo ? `${nivel.proximo.xp - perfil.xp} XP para ${nivel.proximo.nome}` : 'Nível máximo';
    const corDoMedidor = qualidade < 50 ? 'meter low' : qualidade < 75 ? 'meter warn' : 'meter';
    const avatar = SQ.dom.avatar({ foto: perfil.avatar.foto, cor: perfil.avatar.cor, texto: perfil.apelido });

    refs.hud.replaceChildren(
      html` <div class="hud-inner">
        <div class="who">
          ${avatar}
          <div>
            <div class="nick">${perfil.apelido}</div>
            <div class="lvl">${nivel.nome} · ${U.classes[perfil.avatar.classe].nome} · ${perfil.turma}</div>
          </div>
        </div>
        <div class="xpbar">
          <div class="stat"><strong>${perfil.xp}</strong>XP</div>
          <div
            class="bar"
            role="progressbar"
            aria-valuenow="${Math.round(nivel.pct * 100)}"
            aria-valuemin="0"
            aria-valuemax="100"
            aria-label="${faltam}"
          >
            <span style="width: ${nivel.pct * 100}%"></span>
          </div>
          <small>${faltam}</small>
        </div>
        <span class="stat" title="Cada erro reduz a qualidade do projeto"
          >Qualidade<span class="${corDoMedidor}"><span style="width: ${qualidade}%"></span></span
          ><strong>${qualidade}%</strong></span
        >
        <nav class="nav" aria-label="Menu">
          ${MENU.map(([id, texto]) => html`<button onclick=${() => handlers.onMenu(id)}>${texto}</button>`)}
        </nav>
      </div>`
    );
  }

  /** Painel lateral: objetivo atual e recomendação de estudo. */
  function lateral({ objetivo, recomendacao }) {
    refs.objetivo.replaceChildren(
      html` <h3>Objetivo atual</h3>
        <p style="margin: 0">${objetivo}</p>`
    );
    refs.recomendacao.replaceChildren(
      html` <h3>Recomendado para você</h3>
        <p>${recomendacao.texto}</p>
        ${recomendacao.modulo ? html`<button class="btn small" onclick=${() => handlers.onRecomendacao(recomendacao.modulo)}>Abrir na trilha</button>` : null}`
    );
  }

  /** Barra abaixo do mapa: quem está por perto ou o objetivo atual. */
  function prompt(alvo, objetivo) {
    if (!alvo) {
      refs.prompt.replaceChildren(html`<span class="muted">${objetivo}</span>`);
      return;
    }
    refs.prompt.replaceChildren(
      html` <span><strong>${alvo.nome}</strong> · ${alvo.papel}</span>
        <button class="btn small" onclick=${() => handlers.onInteragir()}>
          ${alvo.tipo === 'npc' ? 'Conversar (E)' : 'Abrir (E)'}
        </button>`
    );
  }

  /** Diálogo com várias falas; as escolhas aparecem na última fala. */
  function dialogo(quem, falas, escolhas) {
    fecharDialogo();
    let indice = 0;
    const caixa = html.elemento`<div class="dialog-box" role="dialog" aria-label="Conversa com ${quem.nome}"></div>`;

    const botoesDaFala = () => {
      if (indice < falas.length - 1) {
        return html`<button class="btn small" onclick=${proximaFala}>Continuar</button>`;
      }
      return escolhas.map(
        (c, k) =>
          html`<button class="${k ? 'btn small ghost' : 'btn small'}" onclick=${() => escolher(c)}>${c.texto}</button>`
      );
    };

    function mostrarFala() {
      caixa.replaceChildren(
        html` <div class="speaker">
            <span class="dot-avatar" style="background: ${quem.cor || '#6B3FD6'}" aria-hidden="true"
              >${quem.nome.slice(0, 1)}</span
            >
            <div><strong>${quem.nome}</strong><span> · ${quem.papel}</span></div>
          </div>
          <p>${falas[indice]}</p>
          <div class="choices">${botoesDaFala()}</div>`
      );
      const primeiroBotao = caixa.querySelector('button');
      if (primeiroBotao) setTimeout(() => primeiroBotao.focus({ preventScroll: true }), 20);
    }
    function proximaFala() {
      indice++;
      mostrarFala();
    }
    function escolher(escolha) {
      fecharDialogo();
      escolha.acao();
    }

    mostrarFala();
    refs.moldura.append(caixa);
    dialogoAberto = caixa;
  }

  function fecharDialogo() {
    if (dialogoAberto) {
      dialogoAberto.remove();
      dialogoAberto = null;
    }
  }

  /* =================================================================
     Interface usada pelos controllers
     ================================================================= */
  return {
    canvas: refs.canvas,
    hud,
    lateral,
    prompt,
    dialogo,
    fecharDialogo,
    centralizar(pos) {
      const larguraDoQuadrado = refs.canvas.clientWidth / SQ.dados.mapa.linhas[0].length;
      refs.rolagem.scrollLeft = (pos.x + 0.5) * larguraDoQuadrado - refs.rolagem.clientWidth / 2;
    },
    focarMapa() {
      refs.canvas.focus({ preventScroll: true });
    }
  };
};
