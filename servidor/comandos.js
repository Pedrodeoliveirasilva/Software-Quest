/* Comandos de terminal: verificar o banco, redefinir senha de professor, exportar e importar dados. */
'use strict';
const fs = require('fs');
const banco = require('./banco');
const seg = require('./seguranca');

const resumo = d =>
  `${Object.keys(d.professores).length} professor(es), ${Object.keys(d.turmas).length} turma(s), ${Object.keys(d.users).length} aluno(s), ${d.eventos.length} evento(s)`;

const comandos = {
  /**
   * Conecta ao banco da DATABASE_URL, cria as tabelas se ainda não existirem (isso já
   * acontece ao carregar) e mostra onde está conectado e quantas linhas há em cada tabela.
   */
  async 'verificar-banco'() {
    const d = await banco.diagnostico();
    if (!d)
      return [
        'Sem DATABASE_URL: os dados ficam no arquivo ' + banco.descricao + '.',
        'Para verificar o Neon, rode com a variável definida, por exemplo:',
        '  DATABASE_URL="cole-a-connection-string" node servidor.js verificar-banco'
      ].join('\n');
    const linhas = [
      'Conectado ao PostgreSQL ' + d.versao,
      '  banco:    ' + d.banco,
      '  endpoint: ' + d.endpoint + '  (no Neon, confira em Branches > o branch > Computes)',
      '  usuário:  ' + d.usuario + ', esquema: ' + d.esquema,
      '',
      'Tabelas:'
    ];
    for (const [t, n] of Object.entries(d.contagens))
      linhas.push('  ' + t.padEnd(16) + (n === null ? 'NÃO EXISTE' : n + ' linha(s)'));
    if (d.backup) linhas.push('', 'Dados da versão antiga guardados em softwarequest_dados_backup.');
    if (d.antiga) linhas.push('', 'ATENÇÃO: a tabela antiga softwarequest_dados ainda existe e não foi copiada.');
    const faltando = Object.values(d.contagens).some(n => n === null);
    linhas.push(
      '',
      faltando
        ? 'Algumas tabelas não existem. Confira se a DATABASE_URL está completa e se o usuário pode criar tabelas.'
        : 'Tudo certo. No SQL Editor do Neon, escolha o banco "' +
            d.banco +
            '" e o branch do endpoint ' +
            d.endpoint +
            ' para ver estes dados.'
    );
    return linhas.join('\n');
  },

  async 'redefinir-senha'([email, senha]) {
    email = String(email || '').toLowerCase();
    senha = String(senha || '');
    const conta = banco.dados.contas[email];
    if (!conta || conta.papel !== 'professor') throw new Error('Professor não encontrado: ' + email);
    if (senha.length < 6) throw new Error('A nova senha precisa ter pelo menos 6 caracteres.');
    Object.assign(conta, seg.protegerSenha(senha));
    seg.encerrarSessoesDe(conta.uid);
    banco.alterar('contas', email);
    await banco.gravarAgora();
    return 'Senha redefinida para ' + email + '.';
  },

  async exportar([arquivo]) {
    if (!arquivo) throw new Error('Informe o arquivo: node servidor.js exportar backup.json');
    fs.writeFileSync(arquivo, JSON.stringify(banco.dados, null, 1));
    return `Dados exportados para ${arquivo}: ${resumo(banco.dados)}.`;
  },

  async importar([arquivo, confirmacao]) {
    if (!arquivo) throw new Error('Informe o arquivo: node servidor.js importar backup.json --substituir');
    const novos = Object.assign(banco.vazio(), JSON.parse(fs.readFileSync(arquivo, 'utf8')));
    if (confirmacao !== '--substituir')
      throw new Error(
        `Isto vai SUBSTITUIR todos os dados atuais (${resumo(banco.dados)}) pelos do arquivo. Para confirmar, repita o comando com --substituir no final.`
      );
    await banco.substituir(novos);
    return `Dados importados de ${arquivo}: ${resumo(banco.dados)}.`;
  }
};

/** Executa um comando e devolve a mensagem de sucesso; lança erro se falhar ou não existir. */
async function executar([nome, ...args]) {
  if (!comandos[nome])
    throw new Error('Comando desconhecido: ' + nome + '. Use: verificar-banco, redefinir-senha, exportar ou importar.');
  return comandos[nome](args);
}

module.exports = { executar };
