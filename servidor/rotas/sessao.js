/* Rotas de sessão: saúde do servidor, quem está logado e saída. */
'use strict';
const banco = require('../banco');
const { infoSessao } = require('../seguranca');

module.exports = function registrar(rota) {
  rota('GET', '/api/saude', () => ({ ok: true, versao: 2 }));

  rota('GET', '/api/sessao', ({ s }) => ({ sessao: s ? infoSessao(s.uid) : null }));

  rota('POST', '/api/sair', ({ s }) => {
    if (s) {
      delete banco.dados.sessoes[s.token];
      banco.alterar('sessoes', s.token);
    }
    return { ok: true };
  });
};
