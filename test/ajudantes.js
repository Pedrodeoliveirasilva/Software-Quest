/* Ajudantes dos testes: inicia um servidor isolado e carrega os scripts do site no Node. */
'use strict';
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');

const RAIZ = path.join(__dirname, '..');

/**
 * Inicia o servidor numa porta livre, com uma pasta de dados temporária.
 * Devolve { url, pasta, api(metodo, caminho, corpo, token), parar() }.
 */
async function iniciarServidor(pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'sq-teste-'))) {
  const porta = 20000 + Math.floor(Math.random() * 20000);
  const env = { ...process.env, PORT: String(porta), DADOS_DIR: pasta };
  delete env.DATABASE_URL;
  const processo = spawn(process.execPath, ['servidor.js'], { cwd: RAIZ, env, stdio: ['ignore', 'pipe', 'pipe'] });
  let saida = '';
  processo.stdout.on('data', d => (saida += d));
  processo.stderr.on('data', d => (saida += d));
  const url = `http://localhost:${porta}`;

  for (let i = 0; i < 100; i++) {
    try {
      const r = await fetch(url + '/api/saude');
      if (r.ok) break;
    } catch {
      await new Promise(r => setTimeout(r, 50));
    }
    if (i === 99) throw new Error('O servidor não iniciou:\n' + saida);
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

module.exports = { iniciarServidor, carregarSite, FOTO_TESTE, RAIZ };
