/* =================================================================
   Dados em memória e gravação
   Todas as coleções ficam num único objeto (banco.dados). Depois de cada
   mudança, as rotas chamam banco.gravar(), que salva tudo pouco depois.
   ================================================================= */
'use strict';
const { criarArmazenamento } = require('./armazenamento');

const vazio = () => ({ contas: {}, professores: {}, turmas: {}, codigos: {}, users: {}, eventos: [], sessoes: {} });
const armazenamento = criarArmazenamento();

let dados = vazio();
let timer = null,
  gravando = null,
  pendente = false;

async function gravarAgora() {
  clearTimeout(timer);
  timer = null;
  if (gravando) {
    pendente = true;
    return gravando;
  }
  gravando = (async () => {
    try {
      await armazenamento.salvar(dados);
    } catch (e) {
      console.error('Falha ao gravar os dados (nova tentativa em 5 s):', e.message);
      pendente = true;
      await new Promise(r => setTimeout(r, 5000));
    } finally {
      gravando = null;
    }
    if (pendente) {
      pendente = false;
      await gravarAgora();
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
  },
  /** Agenda a gravação (agrupa várias mudanças seguidas numa só gravação). */
  gravar() {
    if (!timer) timer = setTimeout(gravarAgora, 300);
  },
  gravarAgora,
  async substituir(novos) {
    dados = Object.assign(vazio(), novos);
    await gravarAgora();
  },
  async fechar() {
    if (timer || gravando || pendente) await gravarAgora();
    await (gravando || Promise.resolve());
    await armazenamento.fechar();
  }
};
