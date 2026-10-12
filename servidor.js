#!/usr/bin/env node
/* =================================================================
   SERVIDOR DO SOFTWARE QUEST — ponto de partida
   Este arquivo só junta as peças. Cada responsabilidade fica num módulo:

     servidor/config.js          configurações (porta, banco, limites)
     servidor/armazenamento.js   onde os dados ficam: arquivo JSON ou PostgreSQL
     servidor/banco.js           dados em memória e gravação
     servidor/seguranca.js       senhas, sessões, limites e regras de acesso
     servidor/http.js            roteador da API e arquivos do site
     servidor/rotas/*.js         rotas da API, separadas por assunto
     servidor/comandos.js        comandos de terminal (backup, senha)

   Como usar:
     node servidor.js                               inicia em http://localhost:3000
     node servidor.js redefinir-senha <e-mail> <nova-senha>
     node servidor.js exportar <arquivo.json>       copia todos os dados (backup)
     node servidor.js importar <arquivo.json> --substituir

   Sem a variável DATABASE_URL, os dados ficam em dados/banco.json e nada
   precisa ser instalado. Com DATABASE_URL, usa PostgreSQL (rode npm install).
   ================================================================= */
'use strict';
const http = require('http');
const os = require('os');
const cfg = require('./servidor/config');
const banco = require('./servidor/banco');
const { rota, atender } = require('./servidor/http');
const comandos = require('./servidor/comandos');

// Rotas da API, registradas por assunto
['sessao', 'professores', 'turmas', 'alunos', 'painel'].forEach(nome => require('./servidor/rotas/' + nome)(rota));

async function encerrar() {
  try {
    await banco.fechar();
  } catch (e) {
    console.error(e.message);
  }
  console.log('\nServidor encerrado. Dados salvos.');
  process.exit(0);
}

function mostrarEnderecos() {
  console.log('');
  console.log('  Software Quest rodando em http://localhost:' + cfg.PORTA);
  if (cfg.ENDERECO_PUBLICO) console.log('  Endereço público: ' + cfg.ENDERECO_PUBLICO);
  else {
    const ips = Object.values(os.networkInterfaces())
      .flat()
      .filter(i => i && i.family === 'IPv4' && !i.internal)
      .map(i => i.address);
    if (ips.length) {
      console.log('');
      console.log('  Para os alunos na mesma rede (Wi-Fi da escola):');
      ips.forEach(ip => console.log('    http://' + ip + ':' + cfg.PORTA));
    }
  }
  console.log('');
  console.log('  Dados salvos em: ' + banco.descricao);
  if (cfg.ENDERECO_PUBLICO && !cfg.DATABASE_URL) {
    console.log('');
    console.log('  ATENÇÃO: o servidor está publicado sem banco de dados (falta a variável DATABASE_URL).');
    console.log('  Neste modo, contas e progresso são APAGADOS sempre que o serviço reinicia ou dorme.');
    console.log('  No Render, abra Environment, adicione DATABASE_URL com a connection string do Neon e salve.');
  }
  console.log('  Para encerrar, aperte Ctrl+C.');
  console.log('');
}

async function iniciar() {
  try {
    await banco.carregar();
  } catch (e) {
    console.error('Não foi possível carregar os dados de ' + banco.descricao + ':\n  ' + e.message);
    process.exit(1);
  }

  // Com argumentos, executa um comando de terminal e sai
  const args = process.argv.slice(2);
  if (args.length) {
    let codigo = 0;
    try {
      console.log(await comandos.executar(args));
    } catch (e) {
      console.error(e.message);
      codigo = 1;
    }
    await banco.fechar();
    process.exit(codigo);
  }

  ['SIGINT', 'SIGTERM'].forEach(sinal => process.on(sinal, encerrar));
  const servidor = http.createServer(atender);
  servidor.on('error', e => {
    if (e.code === 'EADDRINUSE')
      console.error(
        `A porta ${cfg.PORTA} já está em uso. Feche o outro programa ou use outra porta, por exemplo: PORT=3001 node servidor.js`
      );
    else console.error(e);
    process.exit(1);
  });
  servidor.listen(cfg.PORTA, '0.0.0.0', mostrarEnderecos);
}

iniciar();
