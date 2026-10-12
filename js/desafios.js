/* =================================================================
   MOTOR DOS DESAFIOS
   Executa a sequência de desafios de uma missão dentro de um container.
   Uso:
     SQ.executarMissao(container, missao, perfil, {
       onErro(),                 // cada tentativa errada (reduz a qualidade)
       onEvento(registro),       // cada desafio concluído
       onFim(resultado),         // missão concluída
       onPontos(pontosDaMissao)  // atualização do placar durante a missão
     });
   ================================================================= */
window.SQ = window.SQ || {};

SQ.executarMissao = function (container, missao, perfil, cb) {
  const el = SQ.el, cfg = SQ.config;
  const desafios = missao.desafios.slice();

  // Consequência: requisitos classificados errado na 1ª missão voltam como defeito na manutenção.
  if (missao.id === 'manutencao' && perfil.requisitosErrados && perfil.requisitosErrados.length) {
    const req = perfil.requisitosErrados[0];
    desafios.splice(1, 0, {
      id: 'man-consequencia', tipo: 'escolha', consequencia: true,
      enunciado: `Lembra do pedido "${req}"? Na Sala de Reuniões ele foi classificado errado, e o sistema foi construído sem atendê-lo direito. Agora a diretora reclamou. Que tipo de manutenção é essa?`,
      opcoes: [
        { texto: 'Corretiva', correta: true, porque: 'O sistema não faz o que deveria: é um defeito a corrigir. Erros nos requisitos custam caro quando só aparecem depois da entrega!' },
        { texto: 'Perfectiva', porque: 'Não é uma melhoria nova: o sistema deveria ter atendido a esse pedido desde o início.' },
        { texto: 'Preventiva', porque: 'O problema já aconteceu, então não é mais prevenção.' },
        { texto: 'Adaptativa', porque: 'Nada mudou no ambiente; o erro veio do próprio projeto.' }
      ]
    });
  }

  const r = { atual: 0, inicio: Date.now(), pontos: 0, primeira: 0, registros: [], errosReq: null };
  let d, tentativas, inicioDesafio, concluido, areaFeedback, areaAcoes;

  function pontosPara(t) { return cfg.pontosPorTentativa[t - 1] || 0; }
  function tituloAcerto(t) { return ['Isso mesmo!', 'Acertou na segunda!', 'Acertou na terceira!'][t] || 'Acertou!'; }
  function restantes() { const n = cfg.maxTentativas - tentativas; return n === 1 ? 'Você tem mais 1 tentativa.' : `Você tem mais ${n} tentativas.`; }
  function feedback(tipo, titulo, ...textos) {
    areaFeedback.replaceChildren(el('div', { class: 'feedback ' + tipo }, el('h3', { text: titulo }), textos.filter(Boolean).map(t => el('p', { text: t }))));
  }
  function errou() {
    tentativas++;
    cb.onErro && cb.onErro();
    return tentativas >= cfg.maxTentativas;
  }

  function concluir(acertou) {
    if (concluido) return;
    concluido = true;
    const usadas = acertou ? tentativas + 1 : tentativas;
    const pontos = acertou ? pontosPara(usadas) : 0;
    const primeira = acertou && usadas === 1;
    r.pontos += pontos; if (primeira) r.primeira++;
    const reg = {
      tipo: 'desafio', faseId: missao.id, fase: missao.nome, desafioId: d.id, tipoDesafio: d.tipo,
      tentativas: usadas, acertou, acertouPrimeira: primeira, pontos,
      tempoSegundos: Math.round((Date.now() - inicioDesafio) / 1000), dataHora: new Date().toISOString()
    };
    r.registros.push(reg);
    cb.onEvento && cb.onEvento(reg);
    cb.onPontos && cb.onPontos(r.pontos);
    const ultimo = r.atual === desafios.length - 1;
    areaAcoes.replaceChildren(
      pontos ? el('span', { class: 'points-pop', text: `+${pontos} XP` }) : null,
      el('button', { class: 'btn', onclick: () => { if (ultimo) finalizar(); else { r.atual++; mostrar(); } }, text: ultimo ? 'Concluir missão' : 'Próximo desafio' })
    );
    const b = areaAcoes.querySelector('.btn'); if (b) b.focus({ preventScroll: true });
  }

  function finalizar() {
    const total = desafios.length;
    const taxa = r.primeira / total;
    const resultado = {
      pontos: r.pontos, acertosPrimeira: r.primeira, total,
      estrelas: taxa >= 0.9 ? 3 : taxa >= 0.6 ? 2 : 1,
      tempoSegundos: Math.round((Date.now() - r.inicio) / 1000),
      requisitosErrados: r.errosReq
    };
    cb.onFim && cb.onFim(resultado);
  }

  function mostrar() {
    d = desafios[r.atual]; tentativas = 0; inicioDesafio = Date.now(); concluido = false;
    areaFeedback = el('div', { 'aria-live': 'polite' });
    areaAcoes = el('div', { class: 'actions' });
    const extras = [];
    if (d.consequencia) extras.push(el('div', { class: 'context' }, el('p', {}, el('strong', { text: 'Consequência de uma decisão anterior. ' }), 'Erros nos requisitos não somem: eles aparecem depois, quando custam mais caro.')));
    if (d.trecho) extras.push(el('pre', { class: 'code' }, d.trecho));
    if (d.log) extras.push(el('pre', { class: 'code', 'aria-label': 'Registro do pipeline' }, d.log.map((l, i) => [el('span', { class: 'log-line ' + (l.ok ? 'ok' : 'bad'), text: l.t }), i < d.log.length - 1 ? '\n' : ''])));
    const corpo = { escolha: montarEscolha, classificar: montarClassificar, selecionar: montarSelecionar, ordenar: montarOrdenar }[d.tipo](d);
    container.replaceChildren(
      el('div', { class: 'challenge-top' },
        el('span', { class: 'muted', text: `${missao.sala} · Desafio ${r.atual + 1} de ${desafios.length}` }),
        el('div', { class: 'dots', 'aria-hidden': 'true' }, desafios.map((_, i) => el('span', { class: i < r.atual ? 'done' : i === r.atual ? 'now' : '' })))),
      el('p', { class: 'prompt', text: d.enunciado }),
      extras, corpo, areaFeedback, areaAcoes
    );
    const topo = container.closest('.overlay'); if (topo) topo.scrollTop = 0;
  }

  /* ---------- escolha ---------- */
  function montarEscolha(d) {
    const letras = ['A', 'B', 'C', 'D', 'E'];
    const opcoes = SQ.embaralhar(d.opcoes);
    const botoes = opcoes.map((o, i) => el('button', { class: 'option', type: 'button', onclick: () => escolher(o, i) },
      el('span', { class: 'key', 'aria-hidden': 'true', text: letras[i] }),
      d.codigo ? el('code', { text: o.texto }) : el('span', { text: o.texto })));
    function escolher(o, i) {
      const b = botoes[i];
      if (concluido || b.disabled) return;
      if (o.correta) { b.classList.add('right'); botoes.forEach(x => x.disabled = true); feedback('ok', tituloAcerto(tentativas), o.porque); concluir(true); return; }
      b.classList.add('wrong'); b.disabled = true;
      if (errou()) {
        const c = opcoes.findIndex(x => x.correta);
        botoes[c].classList.add('right'); botoes.forEach(x => x.disabled = true);
        feedback('reveal', 'Vamos ver a resposta', o.porque, `A resposta certa é: "${opcoes[c].texto}". ${opcoes[c].porque}`);
        concluir(false);
      } else feedback('bad', 'Ainda não', o.porque, restantes());
    }
    return el('div', { class: 'options', role: 'group', 'aria-label': 'Alternativas' }, botoes);
  }

  /* ---------- classificar ---------- */
  function montarClassificar(d) {
    const itens = SQ.embaralhar(d.itens);
    const escolhas = new Array(itens.length).fill(null);
    const verificar = el('button', { class: 'btn', type: 'button', disabled: true, text: 'Verificar' });
    const linhas = itens.map((item, i) => {
      const porque = el('p', { class: 'why' });
      const chips = el('div', { class: 'chips' });
      const linha = el('div', { class: 'c-item', role: 'group', 'aria-label': item.texto }, el('div', { class: 'text', text: item.texto }), chips, porque);
      d.categorias.forEach(cat => chips.append(el('button', { class: 'chip', type: 'button', 'aria-pressed': 'false', text: cat, onclick: () => {
        if (concluido) return;
        escolhas[i] = cat;
        chips.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', c.textContent === cat ? 'true' : 'false'));
        linha.classList.remove('wrong'); porque.textContent = '';
        verificar.disabled = escolhas.some(x => x === null);
      } })));
      return { linha, porque, item };
    });
    verificar.addEventListener('click', () => {
      if (concluido) return;
      let erros = 0;
      linhas.forEach(({ linha, porque, item }, i) => {
        const ok = escolhas[i] === item.correta;
        linha.classList.toggle('right', ok); linha.classList.toggle('wrong', !ok);
        porque.textContent = ok ? '' : 'Reveja este item.';
        if (!ok) erros++;
      });
      if (erros === 0) {
        linhas.forEach(({ linha }) => linha.querySelectorAll('.chip').forEach(c => c.disabled = true));
        verificar.remove(); feedback('ok', tituloAcerto(tentativas), d.explicacao); concluir(true); return;
      }
      if (d.rastrearErros && tentativas === 0) r.errosReq = linhas.filter((l, i) => escolhas[i] !== l.item.correta).map(l => l.item.texto);
      if (errou()) {
        linhas.forEach(({ linha, porque, item }) => {
          linha.classList.remove('wrong'); linha.classList.add('right');
          linha.querySelectorAll('.chip').forEach(c => { c.disabled = true; c.setAttribute('aria-pressed', c.textContent === item.correta ? 'true' : 'false'); });
          porque.textContent = `${item.correta}: ${item.porque}`;
        });
        verificar.remove(); feedback('reveal', 'Vamos ver a resposta', d.explicacao); concluir(false);
      } else {
        feedback('bad', erros === 1 ? '1 item ainda está errado' : `${erros} itens ainda estão errados`, 'Os itens marcados em vermelho precisam de outra classificação.', d.explicacao, restantes());
      }
    });
    return el('div', {}, el('div', { class: 'classify' }, linhas.map(l => l.linha)), el('div', { class: 'actions' }, verificar));
  }

  /* ---------- selecionar (backlog) ---------- */
  function montarSelecionar(d) {
    const sel = new Set();
    const barra = el('span', { style: 'width:0%' });
    const capBar = el('div', { class: 'cap-bar', 'aria-hidden': 'true' }, barra);
    const total = el('span', { text: `0 de ${d.capacidade} pontos` });
    const verificar = el('button', { class: 'btn', type: 'button', disabled: true, text: 'Confirmar a Sprint' });
    const soma = () => d.itens.filter(i => sel.has(i.id)).reduce((s, i) => s + i.pontos, 0);
    const atualizar = () => {
      const s = soma(); total.textContent = `${s} de ${d.capacidade} pontos`;
      barra.style.width = Math.min(100, s / d.capacidade * 100) + '%'; capBar.classList.toggle('over', s > d.capacidade);
      verificar.disabled = sel.size === 0;
    };
    const cartoes = d.itens.map((item, i) => el('button', { class: 'pbi', type: 'button', 'aria-pressed': 'false', onclick: (e) => {
      if (concluido) return;
      sel.has(item.id) ? sel.delete(item.id) : sel.add(item.id);
      e.currentTarget.setAttribute('aria-pressed', sel.has(item.id) ? 'true' : 'false');
      areaFeedback.replaceChildren(); atualizar();
    } }, el('span', { class: 'prio', text: `#${i + 1}` }), el('span', { text: item.texto }), el('span', { class: 'pts', text: `${item.pontos} pts` })));
    verificar.addEventListener('click', () => {
      if (concluido) return;
      const esp = new Set(d.esperado);
      if (esp.size === sel.size && [...esp].every(x => sel.has(x))) {
        cartoes.forEach(c => c.disabled = true); verificar.remove(); feedback('ok', tituloAcerto(tentativas), d.explicacao); concluir(true); return;
      }
      const s = soma(), ordem = d.itens.map(i => i.id);
      const primeiroFora = ordem.findIndex(id => !sel.has(id));
      const pulou = primeiroFora >= 0 && [...sel].some(id => ordem.indexOf(id) > primeiroFora);
      const motivo = s > d.capacidade ? `A seleção soma ${s} pontos, mais do que a equipe consegue entregar (${d.capacidade}). Prometer demais faz a Sprint fracassar.`
        : pulou ? 'Você deixou de fora um item mais prioritário para pegar outro de menor prioridade. Siga a ordem definida pelo Product Owner.'
        : `A seleção soma ${s} pontos. Ainda cabe mais trabalho na Sprint seguindo a ordem de prioridade.`;
      if (errou()) {
        cartoes.forEach((c, i) => { c.disabled = true; c.setAttribute('aria-pressed', esp.has(d.itens[i].id) ? 'true' : 'false'); });
        sel.clear(); d.esperado.forEach(x => sel.add(x)); atualizar(); verificar.remove();
        feedback('reveal', 'Vamos ver a resposta', motivo, d.explicacao); concluir(false);
      } else feedback('bad', 'Essa Sprint ainda não está boa', motivo, restantes());
    });
    return el('div', {}, el('div', { class: 'capacity' }, el('span', { text: 'Capacidade da equipe' }), capBar, total),
      el('div', { class: 'backlog', role: 'group', 'aria-label': 'Product Backlog' }, cartoes), el('div', { class: 'actions' }, verificar));
  }

  /* ---------- ordenar ---------- */
  function montarOrdenar(d) {
    let resto = SQ.embaralhar(d.itens);
    if (resto.every((x, i) => x === d.itens[i])) resto.reverse();
    let seq = [], marcas = null;
    const origem = el('ul', { class: 'order-list', 'aria-label': 'Etapas disponíveis' });
    const destino = el('ol', { class: 'order-list target', 'aria-label': 'Sua ordem' });
    const verificar = el('button', { class: 'btn', type: 'button', disabled: true, text: 'Verificar a ordem' });
    const limpar = el('button', { class: 'btn ghost small', type: 'button', text: 'Recomeçar' });
    function render() {
      origem.replaceChildren(...(resto.length ? resto.map(t => el('li', {}, el('button', { class: 'o-item', type: 'button', 'aria-label': 'Adicionar: ' + t,
        onclick: () => { if (concluido) return; marcas = null; resto = resto.filter(x => x !== t); seq.push(t); render(); } }, t)))
        : [el('li', { class: 'empty-slot', text: 'Todas as etapas foram posicionadas.' })]));
      destino.replaceChildren(...(seq.length ? seq.map((t, i) => el('li', {}, el('button', { class: 'o-item' + (marcas ? (marcas[i] ? ' right' : ' wrong') : ''), type: 'button', 'aria-label': 'Remover: ' + t,
        onclick: () => { if (concluido) return; marcas = null; seq = seq.filter(x => x !== t); resto.push(t); render(); } }, t)))
        : [el('li', { class: 'empty-slot', text: 'Clique nas etapas, na ordem certa.' })]));
      verificar.disabled = resto.length > 0 || concluido;
    }
    limpar.addEventListener('click', () => { if (concluido) return; resto = SQ.embaralhar(d.itens); seq = []; marcas = null; areaFeedback.replaceChildren(); render(); });
    verificar.addEventListener('click', () => {
      if (concluido) return;
      marcas = seq.map((t, i) => t === d.itens[i]);
      const certos = marcas.filter(Boolean).length;
      if (certos === d.itens.length) { verificar.remove(); limpar.remove(); feedback('ok', tituloAcerto(tentativas), d.explicacao); concluir(true); render(); return; }
      if (errou()) {
        seq = d.itens.slice(); resto = []; marcas = seq.map(() => true); verificar.remove(); limpar.remove();
        feedback('reveal', 'Vamos ver a resposta', d.explicacao); concluir(false); render();
      } else { render(); feedback('bad', `${certos} de ${d.itens.length} etapas na posição certa`, 'As etapas em vermelho estão fora do lugar. Clique nelas para devolvê-las e tente de novo.', restantes()); }
    });
    render();
    return el('div', {}, el('div', { class: 'order-zone' },
      el('div', { class: 'order-col' }, el('h3', { text: 'Etapas' }), origem),
      el('div', { class: 'order-col' }, el('h3', { text: 'Sua ordem' }), destino)),
      el('div', { class: 'actions' }, verificar, limpar));
  }

  mostrar();
};
