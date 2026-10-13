/* =================================================================
   CORE / HTML — templates HTML seguros para as telas

   Permite escrever cada tela como HTML, legível como a página final:

     const tela = SQ.html`
       <section class="card">
         <h2>${titulo}</h2>
         <button class="btn" onclick=${salvar}>Salvar</button>
         ${listaDeItens}
       </section>`;
     container.replaceChildren(tela);

   Regras:
   - Texto e números são escapados (um apelido com "<script>" aparece como texto).
   - Uma função em on<evento>=${fn} vira um ouvinte de evento (onclick, onchange, oninput, onsubmit...).
   - Um elemento, um fragmento ou uma lista deles é inserido no lugar (componentes, linhas de tabela).
   - null, undefined e false não aparecem (útil para partes opcionais: ${condicao ? html`...` : null}).
   - Quebras de linha e indentação entre duas tags são ignoradas (não criam espaços na tela). Com
     texto de um dos lados ou dentro de uma tag, viram um único espaço, como no HTML comum.
   - Para atributos opcionais, use SQ.html.atributos({ disabled: true, 'aria-sort': valor }).
   - Elementos marcados com data-ref="nome" podem ser recuperados com SQ.html.refs(raiz).
   ================================================================= */
window.SQ = window.SQ || {};

SQ.html = (function () {
  const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const escapar = v => String(v).replace(/[&<>"']/g, c => ESCAPES[c]);
  const ehNo = v => typeof Node !== 'undefined' && v instanceof Node;

  /**
   * Quebra de linha + indentação do template:
   * - dentro de uma tag, vira um espaço (separa atributos);
   * - entre duas tags ou valores inseridos, some (não cria espaços na tela);
   * - com texto de um dos lados, vira um espaço, como no HTML comum.
   * Assim o Prettier pode reformatar os templates sem mudar o que aparece na tela.
   */
  function tratarQuebras(trecho, saidaAteAqui) {
    return trecho.replace(/\n\s*/g, (quebra, posicao, texto) => {
      const contexto = saidaAteAqui + texto.slice(0, posicao);
      if (contexto.lastIndexOf('<') > contexto.lastIndexOf('>')) return ' ';
      const antes = texto[posicao - 1];
      const depois = texto[posicao + quebra.length];
      const tagOuValorAntes = antes === undefined || antes === '>';
      const tagOuValorDepois = depois === undefined || depois === '<';
      const encostada = tagOuValorAntes && tagOuValorDepois;
      return encostada ? '' : ' ';
    });
  }

  /** Trecho de HTML já seguro (gerado por SQ.html.atributos). */
  class Seguro {
    constructor(texto) {
      this.texto = texto;
    }
  }

  function html(partes, ...valores) {
    const insercoes = {}; // índice -> elemento(s) a inserir no lugar do marcador
    const eventos = []; // { indice, evento, funcao }
    let saida = '';
    let aspasPendentes = null;

    partes.forEach((parte, i) => {
      let trecho = tratarQuebras(parte, saida);
      if (aspasPendentes && trecho.startsWith(aspasPendentes)) trecho = trecho.slice(1);
      aspasPendentes = null;
      saida += trecho;
      if (i >= valores.length) return;

      const valor = valores[i];
      const atributoDeEvento = /\son([a-z]+)=(["']?)$/.exec(saida);
      if (atributoDeEvento && typeof valor === 'function') {
        saida = saida.slice(0, atributoDeEvento.index) + ` data-sq-evento${i}="${atributoDeEvento[1]}"`;
        aspasPendentes = atributoDeEvento[2] || null;
        eventos.push({ indice: i, evento: atributoDeEvento[1], funcao: valor });
        return;
      }
      if (valor == null || valor === false) return;
      if (valor instanceof Seguro) {
        saida += valor.texto;
        return;
      }
      const lista = Array.isArray(valor) ? valor.flat(Infinity) : [valor];
      if (lista.some(ehNo)) {
        insercoes[i] = lista;
        saida += `<!--sq${i}-->`;
        return;
      }
      saida += lista
        .filter(v => v != null && v !== false)
        .map(escapar)
        .join('');
    });

    const modelo = document.createElement('template');
    modelo.innerHTML = saida;
    const fragmento = modelo.content;

    // Troca os marcadores pelos elementos inseridos
    const percorrer = document.createTreeWalker(fragmento, NodeFilter.SHOW_COMMENT);
    const marcadores = [];
    while (percorrer.nextNode()) {
      const m = /^sq(\d+)$/.exec(percorrer.currentNode.data);
      if (m) marcadores.push([percorrer.currentNode, Number(m[1])]);
    }
    marcadores.forEach(([marcador, i]) => {
      const nos = insercoes[i]
        .filter(v => v != null && v !== false)
        .map(v => (ehNo(v) ? v : document.createTextNode(String(v))));
      marcador.replaceWith(...nos);
    });

    // Liga os eventos
    eventos.forEach(({ indice, evento, funcao }) => {
      const alvo = fragmento.querySelector(`[data-sq-evento${indice}]`);
      if (!alvo) return;
      alvo.removeAttribute(`data-sq-evento${indice}`);
      alvo.addEventListener(evento, funcao);
    });

    return fragmento;
  }

  /** Como html``, mas devolve o primeiro elemento em vez de um fragmento. */
  html.elemento = (partes, ...valores) => html(partes, ...valores).firstElementChild;

  /** Atributos opcionais: true vira atributo sem valor; false, null e undefined são omitidos. */
  html.atributos = function (mapa) {
    const texto = Object.entries(mapa)
      .filter(([, v]) => v != null && v !== false)
      .map(([nome, v]) => (v === true ? nome : `${nome}="${escapar(v)}"`))
      .join(' ');
    return new Seguro(texto);
  };

  /** Devolve { nome: elemento } para cada data-ref="nome" dentro de raiz (e remove o atributo). */
  html.refs = function (raiz) {
    const refs = {};
    raiz.querySelectorAll('[data-ref]').forEach(el => {
      refs[el.dataset.ref] = el;
      el.removeAttribute('data-ref');
    });
    return refs;
  };

  html.escapar = escapar;
  return html;
})();
