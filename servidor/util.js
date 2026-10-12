/* Funções puras de validação e formatação, sem acesso ao banco. */
'use strict';
const crypto = require('crypto');
const cfg = require('./config');
const { falha } = require('./erros');

const agora = () => new Date().toISOString();
const novoId = prefixo => prefixo + '-' + crypto.randomBytes(9).toString('hex');

const normalizarCodigo = t =>
  String(t || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
const normalizarUsuario = t =>
  String(t || '')
    .trim()
    .toLowerCase();
const usuarioValido = t => /^[a-z0-9_]{3,20}$/.test(t);
const emailValido = t => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(t);
const emailAluno = (codigo, usuario) =>
  `${normalizarCodigo(codigo).toLowerCase()}.${normalizarUsuario(usuario)}@${cfg.DOMINIO_ALUNOS}`;

/** Converte para texto, tira espaços das pontas e corta no tamanho máximo. */
const texto = (v, max) =>
  String(v == null ? '' : v)
    .trim()
    .slice(0, max);

function gerarCodigoTurma(codigosExistentes) {
  let c;
  do {
    c = Array.from(crypto.randomBytes(6), b => cfg.ALFABETO_CODIGO[b % cfg.ALFABETO_CODIGO.length]).join('');
  } while (codigosExistentes[c]);
  return c;
}

function nivelDe(xp) {
  let nome = cfg.NIVEIS[0][0];
  for (const [n, min] of cfg.NIVEIS) if (xp >= min) nome = n;
  return nome;
}

/**
 * Valida uma foto enviada pelo navegador (data URL JPEG, PNG ou WebP).
 * Retorna a própria foto, ou null quando a intenção é remover a foto.
 */
function validarFoto(foto) {
  if (foto === null || foto === undefined || foto === '') return null;
  if (typeof foto !== 'string' || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(foto))
    falha(400, 'invalid-argument', 'Imagem inválida. Use uma foto JPG ou PNG.');
  if (foto.length > cfg.TAMANHO_MAX_FOTO)
    falha(400, 'invalid-argument', 'A imagem ficou grande demais. Tente outra foto.');
  return foto;
}

module.exports = {
  agora,
  novoId,
  normalizarCodigo,
  normalizarUsuario,
  usuarioValido,
  emailValido,
  emailAluno,
  texto,
  gerarCodigoTurma,
  nivelDe,
  validarFoto
};
