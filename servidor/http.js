/* =================================================================
   HTTP: roteador da API, leitura do corpo, respostas e arquivos do site
   ================================================================= */
'use strict';
const fs = require('fs');
const path = require('path');
const cfg = require('./config');
const { Falha, falha } = require('./erros');
const seguranca = require('./seguranca');

/* ---------- roteador ---------- */
const rotas = [];
/** Registra uma rota. Parâmetros no caminho usam ":nome", por exemplo /api/turmas/:id */
function rota(metodo, padrao, fn) {
  rotas.push({ metodo, re: new RegExp('^' + padrao.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$'), fn });
}

function lerCorpo(req) {
  return new Promise((ok, erro) => {
    let tamanho = 0;
    const partes = [];
    req.on('data', c => {
      tamanho += c.length;
      if (tamanho > cfg.LIMITE_CORPO_BYTES) {
        erro(new Falha(413, 'invalid-argument', 'Dados grandes demais.'));
        req.destroy();
      } else partes.push(c);
    });
    req.on('end', () => {
      if (!partes.length) return ok({});
      try {
        ok(JSON.parse(Buffer.concat(partes).toString('utf8')));
      } catch (e) {
        erro(new Falha(400, 'invalid-argument', 'JSON inválido.'));
      }
    });
    req.on('error', erro);
  });
}

function responder(res, status, dados) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(dados));
}

/** Executa a rota da API correspondente. Cada rota recebe { s, corpo, params, query, ip }. */
async function atenderApi(req, res, url) {
  try {
    const r = rotas.find(x => x.metodo === req.method && x.re.test(url.pathname));
    if (!r) falha(404, 'not-found', 'Rota não encontrada.');
    const params = r.re.exec(url.pathname).groups || {};
    const corpo = ['POST', 'PUT', 'PATCH'].includes(req.method) ? await lerCorpo(req) : {};
    responder(
      res,
      200,
      await r.fn({ s: seguranca.sessaoDe(req), corpo, params, query: url.searchParams, ip: seguranca.ipDe(req) })
    );
  } catch (e) {
    if (!(e instanceof Falha)) console.error(e);
    responder(res, e.status || 500, {
      erro: { code: e.code || 'internal', message: e instanceof Falha ? e.message : 'Erro interno no servidor.' }
    });
  }
}

/* ---------- arquivos do site: somente index.html, css/ e js/ ---------- */
const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};
function servirArquivo(res, caminho) {
  if (caminho === '/') caminho = '/index.html';
  const permitido = caminho === '/index.html' || caminho.startsWith('/css/') || caminho.startsWith('/js/');
  const arquivo = path.normalize(path.join(cfg.RAIZ, caminho));
  const naoEncontrado = () => {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Não encontrado');
  };
  if (!permitido || !arquivo.startsWith(cfg.RAIZ + path.sep)) return naoEncontrado();
  fs.readFile(arquivo, (err, conteudo) => {
    if (err) return naoEncontrado();
    res.writeHead(200, {
      'Content-Type': TIPOS[path.extname(arquivo)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'same-origin'
    });
    res.end(conteudo);
  });
}

/** Função principal de atendimento: API em /api/*, arquivos do site no resto. */
function atender(req, res) {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname.startsWith('/api/')) return atenderApi(req, res, url);
  if (req.method !== 'GET' && req.method !== 'HEAD')
    return responder(res, 405, { erro: { code: 'method-not-allowed', message: 'Método não permitido.' } });
  let caminho;
  try {
    caminho = decodeURIComponent(url.pathname);
  } catch (e) {
    return responder(res, 400, { erro: { code: 'invalid-argument', message: 'Endereço inválido.' } });
  }
  servirArquivo(res, caminho);
}

module.exports = { rota, atender };
