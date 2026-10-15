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

/** Resumo público da turma, usado no índice de códigos (cadastro do aluno pelo código de acesso). */
const resumoCodigo = (id, t) => ({
  turmaId: id,
  nome: t.nome,
  escola: t.escola,
  professorUid: t.professorUid,
  professorNome: t.professorNome,
  pesquisa: !!t.pesquisa,
  fotos: !!t.fotos,
  ativa: t.ativa !== false
});

function gerarCodigoTurma(codigosExistentes) {
  let c;
  do {
    c = Array.from(crypto.randomBytes(6), b => cfg.ALFABETO_CODIGO[b % cfg.ALFABETO_CODIGO.length]).join('');
  } while (codigosExistentes[c]);
  return c;
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
  resumoCodigo,
  validarFoto
};
