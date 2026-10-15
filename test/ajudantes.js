/* Ajudantes dos testes: inicia um servidor isolado e carrega os scripts do site no Node. */
'use strict';
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');

const RAIZ = path.join(__dirname, '..');

// Com TESTE_DATABASE_URL (por exemplo, postgresql://usuario:senha@localhost/teste), os mesmos
// testes rodam com o PostgreSQL: cada servidor de teste usa um esquema próprio, apagado no fim.
const URL_PG = process.env.TESTE_DATABASE_URL || null;
const usandoPostgres = !!URL_PG;

/** Executa um comando SQL no banco de teste (só com TESTE_DATABASE_URL). */
async function sql(texto, valores, esquema) {
  const { Client } = require('pg');
  const cliente = new Client({ connectionString: URL_PG, options: esquema ? `-c search_path=${esquema}` : undefined });
  await cliente.connect();
  try {
    return await cliente.query(texto, valores);
  } finally {
    await cliente.end();
  }
}

/** Cria um esquema vazio no banco de teste e devolve o nome. */
async function novoEsquema() {
  const nome = 'teste_' + Math.random().toString(36).slice(2, 10);
  await sql(`CREATE SCHEMA ${nome}`);
  return nome;
}
const apagarEsquema = nome => sql(`DROP SCHEMA IF EXISTS ${nome} CASCADE`);

/** Endereço do banco de teste apontando para um esquema (o servidor cria as tabelas nele). */
function urlDoEsquema(esquema) {
  const u = new URL(URL_PG);
  u.searchParams.set('options', `-c search_path=${esquema}`);
  return u.toString();
}

/**
 * Inicia o servidor numa porta livre, com uma pasta de dados temporária (ou, com
 * TESTE_DATABASE_URL, um esquema temporário no PostgreSQL).
 * Passe o "pasta" de um servidor anterior para reabrir os mesmos dados.
 * Devolve { url, pasta, api(metodo, caminho, corpo, token), parar() }.
 */
async function iniciarServidor(pasta) {
  if (!pasta) pasta = usandoPostgres ? await novoEsquema() : fs.mkdtempSync(path.join(os.tmpdir(), 'sq-teste-'));
  const porta = 20000 + Math.floor(Math.random() * 20000);
  const env = { ...process.env, PORT: String(porta), DADOS_DIR: pasta };
  delete env.DATABASE_URL;
  if (usandoPostgres) {
    env.DADOS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'sq-teste-'));
    env.DATABASE_URL = urlDoEsquema(pasta);
  }
  const processo = spawn(process.execPath, ['servidor.js'], { cwd: RAIZ, env, stdio: ['ignore', 'pipe', 'pipe'] });
  let saida = '';
  processo.stdout.on('data', d => (saida += d));
  processo.stderr.on('data', d => (saida += d));
  let encerrado = false;
  processo.on('exit', () => (encerrado = true));
  const url = `http://localhost:${porta}`;

  for (let i = 0; i < 200; i++) {
    try {
      const r = await fetch(url + '/api/saude');
      if (r.ok) break;
    } catch {
      await new Promise(r => setTimeout(r, 50));
    }
    if (i === 199 || encerrado) throw new Error('O servidor não iniciou:\n' + saida);
  }

  async function api(metodo, caminho, corpo, token) {
    const r = await fetch(url + '/api/' + caminho, {
      method: metodo,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      body: corpo === undefined ? undefined : JSON.stringify(corpo)
    });
    return { status: r.status, dados: await r.json() };
  }

  function parar() {
    return new Promise(resolve => {
      if (encerrado) return resolve();
      processo.once('exit', resolve);
      processo.kill('SIGTERM');
    });
  }

  return { url, pasta, api, parar };
}

/**
 * Carrega scripts do site (que usam window.SQ) num contexto isolado do Node.
 * Devolve o objeto SQ montado pelos scripts.
 */
function carregarSite(arquivos) {
  const contexto = { console, crypto: globalThis.crypto };
  contexto.window = contexto;
  vm.createContext(contexto);
  for (const arquivo of arquivos) {
    vm.runInContext(fs.readFileSync(path.join(RAIZ, arquivo), 'utf8'), contexto, { filename: arquivo });
  }
  return contexto.SQ;
}

/** Uma imagem JPEG mínima e válida, em data URL, para testar fotos. */
const FOTO_TESTE =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

module.exports = {
  iniciarServidor,
  carregarSite,
  FOTO_TESTE,
  RAIZ,
  usandoPostgres,
  sql,
  novoEsquema,
  apagarEsquema,
  urlDoEsquema
};
