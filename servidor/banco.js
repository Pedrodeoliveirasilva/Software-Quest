/* =================================================================
   Dados em memória e gravação
   Todas as coleções ficam num único objeto (banco.dados), lido do armazenamento ao iniciar.
   Depois de mudar um registro, a rota avisa qual foi:

     banco.alterar('users', uid)        criou, mudou ou apagou o aluno uid
     banco.alterar('sessoes', token)    (vale para professores, turmas, users, contas, sessoes)
     banco.novoEvento(evento)           acrescenta um evento de pesquisa

   A gravação acontece pouco depois e junta várias mudanças seguidas. No PostgreSQL, só os
   registros avisados são enviados ao banco; no arquivo JSON, o arquivo é regravado inteiro.
   O índice "codigos" (código de acesso -> turma) é montado a partir das turmas e não é gravado.
   ================================================================= */
'use strict';
const { criarArmazenamento } = require('./armazenamento');
const cfg = require('./config');
const { resumoCodigo } = require('./util');

const COLECOES = ['professores', 'turmas', 'users', 'contas', 'sessoes'];
const vazio = () => ({ contas: {}, professores: {}, turmas: {}, codigos: {}, users: {}, eventos: [], sessoes: {} });
const armazenamento = criarArmazenamento();

let dados = vazio();
let timer = null,
  gravando = null,
  pendente = false;

// Mudanças ainda não gravadas
const loteVazio = () => ({ colecoes: Object.fromEntries(COLECOES.map(c => [c, new Set()])), eventos: [] });
let lote = loteVazio();
const loteTemAlgo = l => l.eventos.length > 0 || COLECOES.some(c => l.colecoes[c].size > 0);

/** Monta o índice de códigos a partir das turmas (a fonte da verdade). */
function montarCodigos() {
  dados.codigos = {};
  for (const [id, t] of Object.entries(dados.turmas)) dados.codigos[t.codigo] = resumoCodigo(id, t);
}

function agendar() {
  if (!timer) timer = setTimeout(gravarAgora, 300);
}

async function gravarAgora() {
  clearTimeout(timer);
  timer = null;
  if (gravando) {
    pendente = true;
    return gravando;
  }
  gravando = (async () => {
    const enviando = lote;
    lote = loteVazio();
    try {
      if (loteTemAlgo(enviando)) await armazenamento.salvar(dados, enviando);
    } catch (e) {
      console.error('Falha ao gravar os dados (nova tentativa em 5 s):', e.message);
      // Devolve o que não foi gravado para o próximo lote
      COLECOES.forEach(c => enviando.colecoes[c].forEach(k => lote.colecoes[c].add(k)));
      lote.eventos = enviando.eventos.concat(lote.eventos);
      pendente = true;
      await new Promise(r => setTimeout(r, 5000));
    } finally {
      gravando = null;
    }
    if (pendente || loteTemAlgo(lote)) {
      pendente = false;
      if (loteTemAlgo(lote)) await gravarAgora();
    }
  })();
  return gravando;
}

module.exports = {
  /** O objeto com todas as coleções: contas, professores, turmas, codigos, users, eventos, sessoes. */
  get dados() {
    return dados;
  },
  descricao: armazenamento.descricao,
  vazio,

  async carregar() {
    dados = Object.assign(vazio(), (await armazenamento.carregar()) || {});
    montarCodigos();
    // Descarta sessões vencidas, que de outro modo ficariam guardadas para sempre
    const agora = Date.now();
    for (const [token, s] of Object.entries(dados.sessoes))
      if (!s || agora - s.criadaEm > cfg.VALIDADE_SESSAO_MS) {
        delete dados.sessoes[token];
        lote.colecoes.sessoes.add(token);
      }
    if (loteTemAlgo(lote)) agendar();
  },

  /** Avisa que o registro chave da coleção foi criado, alterado ou apagado, e agenda a gravação. */
  alterar(colecao, ...chaves) {
    if (!lote.colecoes[colecao]) throw new Error('Coleção desconhecida: ' + colecao);
    chaves.forEach(k => lote.colecoes[colecao].add(k));
    agendar();
  },

  /** Acrescenta um evento de pesquisa (os eventos nunca são alterados depois). */
  novoEvento(evento) {
    dados.eventos.push(evento);
    lote.eventos.push(evento);
    agendar();
  },

  /** Reconstrói o índice de códigos depois de mudar uma turma. */
  montarCodigos,

  gravarAgora,

  async substituir(novos) {
    await (gravando || Promise.resolve());
    dados = Object.assign(vazio(), novos);
    montarCodigos();
    lote = loteVazio();
    await armazenamento.substituir(dados);
  },

  async fechar() {
    clearTimeout(timer);
    timer = null;
    await (gravando || Promise.resolve());
    if (loteTemAlgo(lote)) await gravarAgora();
    await armazenamento.fechar();
  }
};
