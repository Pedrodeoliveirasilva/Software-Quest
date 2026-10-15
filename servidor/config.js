/* Configurações do servidor. Valores que podem mudar por variável de ambiente ficam aqui. */
'use strict';
const path = require('path');

const RAIZ = path.join(__dirname, '..');
// Pasta dos dados no modo local. DADOS_DIR permite usar outra pasta (por exemplo, nos testes).
const PASTA_DADOS = process.env.DADOS_DIR ? path.resolve(process.env.DADOS_DIR) : path.join(RAIZ, 'dados');

module.exports = {
  RAIZ,
  // Pasta do site (HTML, CSS e JavaScript do navegador): só o que está aqui é entregue aos visitantes
  PUBLICO: path.join(RAIZ, 'public'),
  PASTA_DADOS,
  ARQUIVO_DADOS: path.join(PASTA_DADOS, 'banco.json'),
  PORTA: Number(process.env.PORT) || 3000,
  DATABASE_URL: process.env.DATABASE_URL || null,
  // No Render (e em outros serviços com proxy) o IP real do visitante vem no cabeçalho X-Forwarded-For.
  ATRAS_DE_PROXY: !!(process.env.RENDER || process.env.TRUST_PROXY),
  ENDERECO_PUBLICO: process.env.RENDER_EXTERNAL_URL || null,

  DOMINIO_ALUNOS: 'alunos.softwarequest.app', // e-mail interno dos alunos (nunca exibido)
  VALIDADE_SESSAO_MS: 30 * 24 * 3600 * 1000, // 30 dias
  // Tamanho máximo do corpo de cada requisição. O padrão é pequeno; só as rotas que recebem
  // foto aceitam mais. Junto com a validação dos campos, isso impede que alguém encha o banco.
  LIMITE_CORPO_BYTES: 8 * 1024, // 8 KB (login, turmas, eventos...)
  // 300 KB nas rotas que podem trazer foto (inclusive o PUT do perfil, que o navegador envia
  // com o avatar). Nessas rotas o tamanho não enche o banco: só os campos conhecidos são guardados.
  LIMITE_CORPO_FOTO: 300 * 1024,
  TAMANHO_MAX_FOTO: 200 * 1024, // fotos já chegam reduzidas pelo navegador (~15 KB)
  // Eventos de pesquisa por aluno. Uma passagem completa pelo jogo gera ~50; o limite deixa
  // margem para muitas repetições e impede que um único aluno encha o banco.
  MAX_EVENTOS_POR_ALUNO: 2000,
  LIMITES: {
    janelaLoginMs: 15 * 60 * 1000, // 15 minutos
    falhasPorConta: 10, // senhas erradas numa mesma conta na janela
    falhasPorIp: 300, // senhas erradas a partir da mesma rede na janela (a escola inteira divide o IP)
    cadastrosPorIp: 300, // cadastros por hora a partir da mesma rede
    eventosPorMinuto: 60 // eventos por aluno por minuto
  },
  ALFABETO_CODIGO: 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
};
