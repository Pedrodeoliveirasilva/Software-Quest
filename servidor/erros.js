/* Erro com status HTTP e código, devolvido ao navegador como { erro: { code, message } }. */
'use strict';

class Falha extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/** Interrompe a rota com um erro que o navegador consegue exibir. */
const falha = (status, code, message) => {
  throw new Falha(status, code, message);
};

const SEM_PERMISSAO = () => falha(403, 'permission-denied', 'Sem permissão para esta ação.');

module.exports = { Falha, falha, SEM_PERMISSAO };
