/* Testes da estrutura do projeto: arquivos do site e regras do .gitignore. */
'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { RAIZ } = require('./ajudantes');

// Todos os arquivos CSS e JS que o public/index.html carrega (caminhos a partir da raiz do projeto)
const html = fs.readFileSync(path.join(RAIZ, 'public', 'index.html'), 'utf8');
const arquivosDoSite = [...html.matchAll(/(?:src|href)="((?:js|css)\/[^"]+)"/g)].map(m => 'public/' + m[1]);

/** Devolve os arquivos que o Git ignoraria, ou null se o Git não estiver disponível. */
function ignoradosPeloGit(arquivos) {
  try {
    const saida = execFileSync('git', ['check-ignore', '--no-index', '--stdin'], {
      cwd: RAIZ,
      input: arquivos.join('\n'),
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore']
    });
    return saida.split('\n').filter(Boolean);
  } catch (e) {
    if (e.status === 1) return []; // código 1: nenhum arquivo ignorado
    return null; // Git ausente ou pasta fora de um repositório
  }
}

describe('Estrutura do projeto', () => {
  it('todos os arquivos carregados pelo public/index.html existem', () => {
    assert.ok(arquivosDoSite.length > 30, 'o public/index.html deveria carregar os arquivos do site');
    const faltando = arquivosDoSite.filter(a => !fs.existsSync(path.join(RAIZ, a)));
    assert.deepEqual(faltando, []);
  });

  it('nenhum arquivo do site é ignorado pelo Git (todos vão para o GitHub e para o Render)', t => {
    const ignorados = ignoradosPeloGit([...arquivosDoSite, 'servidor.js', 'package.json', 'render.yaml']);
    if (ignorados === null) return t.skip('Git não disponível nesta pasta');
    assert.deepEqual(ignorados, [], 'estes arquivos não seriam enviados ao GitHub: ' + ignorados.join(', '));
  });

  it('os dados dos alunos continuam fora do GitHub', t => {
    const ignorados = ignoradosPeloGit(['dados/banco.json', 'node_modules/pg/package.json']);
    if (ignorados === null) return t.skip('Git não disponível nesta pasta');
    assert.deepEqual(ignorados.sort(), ['dados/banco.json', 'node_modules/pg/package.json']);
  });
});
