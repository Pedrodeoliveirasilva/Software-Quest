/* =================================================================
   MODEL / MISSÃO — estado e regras de uma missão em andamento
   Monta a lista de desafios (com a consequência dos requisitos errados),
   corrige as respostas, conta tentativas e calcula pontos e estrelas.
   ================================================================= */
window.SQ = window.SQ || {};
SQ.models = SQ.models || {};

SQ.models.Missao = function (missao, perfil) {
  const cfg = SQ.config;
  const desafios = missao.desafios.slice();

  // Consequência: requisitos classificados errado na 1ª missão voltam como defeito na manutenção.
  if (missao.id === 'manutencao' && perfil.requisitosErrados && perfil.requisitosErrados.length) {
    desafios.splice(1, 0, {
      id: 'man-consequencia',
      tipo: 'escolha',
      consequencia: true,
      enunciado: `Lembra do pedido "${perfil.requisitosErrados[0]}"? Na Sala de Reuniões ele foi classificado errado, e o sistema foi construído sem atendê-lo direito. Agora a diretora reclamou. Que tipo de manutenção é essa?`,
      opcoes: [
        {
          texto: 'Corretiva',
          correta: true,
          porque:
            'O sistema não faz o que deveria: é um defeito a corrigir. Erros nos requisitos custam caro quando só aparecem depois da entrega!'
        },
        {
          texto: 'Perfectiva',
          porque: 'Não é uma melhoria nova: o sistema deveria ter atendido a esse pedido desde o início.'
        },
        { texto: 'Preventiva', porque: 'O problema já aconteceu, então não é mais prevenção.' },
        { texto: 'Adaptativa', porque: 'Nada mudou no ambiente; o erro veio do próprio projeto.' }
      ]
    });
  }

  let atual = 0,
    tentativas = 0,
    inicioDesafio = Date.now(),
    concluido = false;
  const inicio = Date.now();
  let pontos = 0,
    primeira = 0,
    errosReq = null;

  const pontosPara = t => cfg.pontosPorTentativa[t - 1] || 0;

  function concluir(acertou) {
    concluido = true;
    const d = desafios[atual];
    const usadas = acertou ? tentativas + 1 : tentativas;
    const p = acertou ? pontosPara(usadas) : 0;
    const prim = acertou && usadas === 1;
    pontos += p;
    if (prim) primeira++;
    return {
      tipo: 'desafio',
      faseId: missao.id,
      fase: missao.nome,
      desafioId: d.id,
      tipoDesafio: d.tipo,
      tentativas: usadas,
      acertou,
      acertouPrimeira: prim,
      pontos: p,
      tempoSegundos: Math.round((Date.now() - inicioDesafio) / 1000),
      dataHora: new Date().toISOString()
    };
  }

  /* Correção de cada tipo de desafio: devolve { ok, ...detalhes para o feedback } */
  const verificadores = {
    escolha: (d, opcao) => ({ ok: !!opcao.correta }),
    classificar(d, { itens, escolhas }) {
      const erros = itens.map((it, i) => (escolhas[i] === it.correta ? -1 : i)).filter(i => i >= 0);
      return { ok: erros.length === 0, erros, errados: erros.map(i => itens[i].texto) };
    },
    selecionar(d, selecionados) {
      const sel = new Set(selecionados),
        esp = new Set(d.esperado);
      const ok = esp.size === sel.size && [...esp].every(x => sel.has(x));
      if (ok) return { ok };
      const soma = d.itens.filter(i => sel.has(i.id)).reduce((s, i) => s + i.pontos, 0);
      const ordem = d.itens.map(i => i.id);
      const primeiroFora = ordem.findIndex(id => !sel.has(id));
      const pulou = primeiroFora >= 0 && [...sel].some(id => ordem.indexOf(id) > primeiroFora);
      const motivo =
        soma > d.capacidade
          ? `A seleção soma ${soma} pontos, mais do que a equipe consegue entregar (${d.capacidade}). Prometer demais faz a Sprint fracassar.`
          : pulou
            ? 'Você deixou de fora um item mais prioritário para pegar outro de menor prioridade. Siga a ordem definida pelo Product Owner.'
            : `A seleção soma ${soma} pontos. Ainda cabe mais trabalho na Sprint seguindo a ordem de prioridade.`;
      return { ok, motivo };
    },
    ordenar(d, sequencia) {
      const marcas = sequencia.map((t, i) => t === d.itens[i]);
      const certos = marcas.filter(Boolean).length;
      return { ok: certos === d.itens.length, marcas, certos };
    }
  };

  return {
    missao,
    get total() {
      return desafios.length;
    },
    get indice() {
      return atual;
    },
    get desafio() {
      return desafios[atual];
    },
    get ultimo() {
      return atual === desafios.length - 1;
    },
    get tentativas() {
      return tentativas;
    },
    get concluido() {
      return concluido;
    },
    restantes: () => cfg.maxTentativas - tentativas,

    /* Avalia uma resposta. Retorna o resultado da correção e o que aconteceu:
       status 'acerto' | 'erro' | 'esgotou', mais o registro do desafio quando ele termina. */
    avaliar(resposta) {
      if (concluido) return null;
      const d = desafios[atual];
      const v = verificadores[d.tipo](d, resposta);
      const tentativasAntes = tentativas;
      if (v.ok) return { ...v, status: 'acerto', tentativasAntes, registro: concluir(true) };
      if (d.rastrearErros && tentativas === 0 && v.errados) errosReq = v.errados;
      tentativas++;
      if (tentativas >= cfg.maxTentativas)
        return { ...v, status: 'esgotou', tentativasAntes, registro: concluir(false) };
      return { ...v, status: 'erro', tentativasAntes, restantes: cfg.maxTentativas - tentativas };
    },

    avancar() {
      atual++;
      tentativas = 0;
      inicioDesafio = Date.now();
      concluido = false;
    },

    resultado() {
      const taxa = primeira / desafios.length;
      return {
        pontos,
        acertosPrimeira: primeira,
        total: desafios.length,
        estrelas: taxa >= 0.9 ? 3 : taxa >= 0.6 ? 2 : 1,
        tempoSegundos: Math.round((Date.now() - inicio) / 1000),
        requisitosErrados: errosReq
      };
    }
  };
};
