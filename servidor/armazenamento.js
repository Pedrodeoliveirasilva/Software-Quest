/* =================================================================
   Onde os dados ficam guardados
   - Arquivo JSON no computador (padrão, sem configuração).
   - PostgreSQL online, quando existe a variável DATABASE_URL.
   As duas opções têm a mesma interface: carregar(), salvar(dados), fechar().
   ================================================================= */
'use strict';
const fs = require('fs');
const cfg = require('./config');

function armazenamentoArquivo() {
  return {
    descricao: cfg.ARQUIVO_DADOS,
    async carregar() {
      try {
        return JSON.parse(fs.readFileSync(cfg.ARQUIVO_DADOS, 'utf8'));
      } catch (e) {
        if (e.code === 'ENOENT') return null;
        throw new Error('Não foi possível ler ' + cfg.ARQUIVO_DADOS + ': ' + e.message, { cause: e });
      }
    },
    async salvar(dados) {
      fs.mkdirSync(cfg.PASTA_DADOS, { recursive: true });
      const tmp = cfg.ARQUIVO_DADOS + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(dados));
      fs.renameSync(tmp, cfg.ARQUIVO_DADOS); // troca atômica: o arquivo nunca fica pela metade
    },
    async fechar() {}
  };
}

function armazenamentoPostgres(url) {
  let Pool;
  try {
    ({ Pool } = require('pg'));
  } catch (e) {
    console.error('A variável DATABASE_URL foi definida, mas o pacote "pg" não está instalado. Rode: npm install');
    process.exit(1);
  }
  const pool = new Pool({ connectionString: url, max: 3, idleTimeoutMillis: 30000, connectionTimeoutMillis: 20000 });
  pool.on('error', e => console.error('Conexão com o banco encerrada (será reaberta quando preciso):', e.message));
  return {
    descricao: 'banco PostgreSQL (DATABASE_URL)',
    async carregar() {
      await pool.query(
        'CREATE TABLE IF NOT EXISTS softwarequest_dados (id text PRIMARY KEY, dados jsonb NOT NULL, atualizado_em timestamptz NOT NULL DEFAULT now())'
      );
      const r = await pool.query("SELECT dados FROM softwarequest_dados WHERE id = 'principal'");
      return r.rows[0] ? r.rows[0].dados : null;
    },
    async salvar(dados) {
      await pool.query(
        "INSERT INTO softwarequest_dados (id, dados, atualizado_em) VALUES ('principal', $1::jsonb, now()) " +
          'ON CONFLICT (id) DO UPDATE SET dados = EXCLUDED.dados, atualizado_em = now()',
        [JSON.stringify(dados)]
      );
    },
    fechar: () => pool.end()
  };
}

module.exports = {
  criarArmazenamento: () => (cfg.DATABASE_URL ? armazenamentoPostgres(cfg.DATABASE_URL) : armazenamentoArquivo())
};
