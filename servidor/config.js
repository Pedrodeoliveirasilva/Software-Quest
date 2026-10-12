/* Configurações do servidor. Valores que podem mudar por variável de ambiente ficam aqui. */
'use strict';
const path = require('path');

const RAIZ = path.join(__dirname, '..');
// Pasta dos dados no modo local. DADOS_DIR permite usar outra pasta (por exemplo, nos testes).
const PASTA_DADOS = process.env.DADOS_DIR ? path.resolve(process.env.DADOS_DIR) : path.join(RAIZ, 'dados');

module.exports = {
  RAIZ,
  PASTA_DADOS,
  ARQUIVO_DADOS: path.join(PASTA_DADOS, 'banco.json'),
  PORTA: Number(process.env.PORT) || 3000,
  DATABASE_URL: process.env.DATABASE_URL || null,
  // No Render (e em outros serviços com proxy) o IP real do visitante vem no cabeçalho X-Forwarded-For.
  ATRAS_DE_PROXY: !!(process.env.RENDER || process.env.TRUST_PROXY),
  ENDERECO_PUBLICO: process.env.RENDER_EXTERNAL_URL || null,

  DOMINIO_ALUNOS: 'alunos.softwarequest.app', // e-mail interno dos alunos (nunca exibido)
  VALIDADE_SESSAO_MS: 30 * 24 * 3600 * 1000, // 30 dias
  LIMITE_CORPO_BYTES: 1024 * 1024, // 1 MB por requisição
  TAMANHO_MAX_FOTO: 200 * 1024, // fotos já chegam reduzidas pelo navegador (~15 KB)
  ALFABETO_CODIGO: 'ABCDEFGHJKMNPQRSTUVWXYZ23456789',
  NIVEIS: [
    ['Estagiário(a)', 0],
    ['Júnior', 400],
    ['Pleno', 1000],
    ['Sênior', 1800],
    ['Tech Lead', 2600]
  ]
};
