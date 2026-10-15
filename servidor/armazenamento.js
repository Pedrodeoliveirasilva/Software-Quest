/* =================================================================
   Onde os dados ficam guardados
   - Arquivo JSON no computador (padrão, sem configuração): servidor/armazenamento.js
   - PostgreSQL com tabelas de verdade (Neon), quando existe a variável DATABASE_URL:
     servidor/postgres.js
   As duas opções têm a mesma interface:
     carregar()              -> todos os dados, ou null se ainda não houver nada
     salvar(dados, lote)     -> grava as mudanças (lote diz quais registros mudaram)
     substituir(dados)       -> troca tudo (comando importar)
     fechar()
   ================================================================= */
'use strict';
const fs = require('fs');
const cfg = require('./config');

function armazenamentoArquivo() {
  // No arquivo, gravar tudo de uma vez é simples e rápido o bastante: o lote é ignorado
  function gravar(dados) {
    fs.mkdirSync(cfg.PASTA_DADOS, { recursive: true });
    const tmp = cfg.ARQUIVO_DADOS + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(dados));
    fs.renameSync(tmp, cfg.ARQUIVO_DADOS); // troca atômica: o arquivo nunca fica pela metade
  }
  return {
    tipo: 'arquivo',
    descricao: cfg.ARQUIVO_DADOS,
    async diagnostico() {
      return null;
    },
    async carregar() {
      try {
        return JSON.parse(fs.readFileSync(cfg.ARQUIVO_DADOS, 'utf8'));
      } catch (e) {
        if (e.code === 'ENOENT') return null;
        throw new Error('Não foi possível ler ' + cfg.ARQUIVO_DADOS + ': ' + e.message, { cause: e });
      }
    },
    async salvar(dados) {
      gravar(dados);
    },
    async substituir(dados) {
      gravar(dados);
    },
    async fechar() {}
  };
}

module.exports = {
  criarArmazenamento() {
    if (!cfg.DATABASE_URL) return armazenamentoArquivo();
    return require('./postgres').armazenamentoPostgres(cfg.DATABASE_URL);
  }
};
