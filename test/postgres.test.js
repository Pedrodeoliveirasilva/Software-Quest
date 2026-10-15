/* Testes específicos do PostgreSQL (tabelas, migração e importação).
   Só rodam com TESTE_DATABASE_URL definida, por exemplo:
     TESTE_DATABASE_URL=postgresql://usuario:senha@localhost/teste npm test
   No GitHub Actions eles rodam sempre, com um PostgreSQL temporário (veja .github/workflows/ci.yml). */
'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { iniciarServidor, usandoPostgres, sql, novoEsquema, urlDoEsquema, RAIZ } = require('./ajudantes');

const opcoes = { skip: usandoPostgres ? false : 'defina TESTE_DATABASE_URL para testar com o PostgreSQL' };

async function prepararTurma(api) {
  const prof = await api('POST', 'professores', { nome: 'Profa. Lia', email: 'lia@escola.com', senha: 'prof123' });
  const turma = (await api('POST', 'turmas', { nome: '2º A', pesquisa: true }, prof.dados.token)).dados.turma;
  const aluno = await api('POST', 'alunos', {
    codigoTurma: turma.codigo,
    usuario: 'ana',
    senha: 'senha123',
    perfil: { apelido: 'Coruja', codigoPesquisa: 'P07', avatar: { cor: '#0C8F7C', classe: 'qa' } }
  });
  return { tokenProf: prof.dados.token, turma, tokenAluno: aluno.dados.token, uidAluno: aluno.dados.sessao.uid };
}
const desafio = {
  tipo: 'desafio',
  faseId: 'requisitos',
  desafioId: 'req-pergunta',
  tentativas: 2,
  acertou: true,
  tempoSegundos: 15
};

describe('PostgreSQL', opcoes, () => {
  it('guarda cada coleção na sua tabela, com colunas próprias', async () => {
    const s = await iniciarServidor();
    const t = await prepararTurma(s.api);
    await s.api('POST', 'eventos', { evento: desafio }, t.tokenAluno);
    await s.parar(); // ao encerrar, tudo o que estava pendente é gravado

    const esquema = s.pasta;
    const aluno = (await sql('SELECT * FROM sq_alunos', [], esquema)).rows[0];
    assert.equal(aluno.usuario, 'ana');
    assert.equal(aluno.codigo_pesquisa, 'P07');
    assert.equal(aluno.cor, '#0C8F7C');
    assert.equal(aluno.turma_id, t.turma.id);
    const evento = (await sql('SELECT * FROM sq_eventos', [], esquema)).rows[0];
    assert.equal(evento.desafio_id, 'req-pergunta');
    assert.equal(evento.acertou_primeira, false);
    assert.equal(evento.pontos, 50);
    assert.equal(evento.codigo_pesquisa, 'P07');
    const turma = (await sql('SELECT * FROM sq_turmas', [], esquema)).rows[0];
    assert.equal(turma.codigo, t.turma.codigo);
    assert.equal(turma.pesquisa, true);
    const conta = (await sql("SELECT * FROM sq_contas WHERE papel = 'aluno'", [], esquema)).rows[0];
    assert.notEqual(conta.hash, 'senha123', 'a senha nunca é guardada em texto');
  });

  it('o perfil completo volta igual depois de reiniciar', async () => {
    const s = await iniciarServidor();
    const t = await prepararTurma(s.api);
    const { perfil } = (await s.api('GET', 'perfil', undefined, t.tokenAluno)).dados;
    const progresso = {
      ...perfil,
      qualidade: 92,
      missoes: { requisitos: { pontos: 250, acertosPrimeira: 2, total: 3, tempoSegundos: 80, vezes: 2 } },
      licoes: { 'req-1': { acertouPrimeira: true, concluidaEm: '2026-10-01T12:00:00.000Z' }, 'req-3': {} },
      itens: ['requisitos'],
      posicao: { x: 3, y: 2 },
      boasVindas: true
    };
    await s.api('PUT', 'perfil', { perfil: progresso }, t.tokenAluno);
    const antes = (await s.api('GET', 'perfil', undefined, t.tokenAluno)).dados.perfil;
    await s.parar();
    const s2 = await iniciarServidor(s.pasta);
    const depois = (await s2.api('GET', 'perfil', undefined, t.tokenAluno)).dados.perfil;
    await s2.parar();
    assert.deepEqual(depois, antes);
    assert.equal(depois.xp, 250 + 30 + 20);
  });

  it('apaga do banco as sessões encerradas', async () => {
    const s = await iniciarServidor();
    const t = await prepararTurma(s.api);
    await s.api('POST', `professor/alunos/${t.uidAluno}/senha`, { senha: 'nova456' }, t.tokenProf);
    await s.api('POST', 'sair', {}, t.tokenProf);
    await s.parar();
    const { rows } = await sql('SELECT count(*)::int AS n FROM sq_sessoes', [], s.pasta);
    assert.equal(rows[0].n, 0);
  });

  it('depois de reiniciar, continua sabendo quais eventos são repetição', async () => {
    const s = await iniciarServidor();
    const t = await prepararTurma(s.api);
    await s.api('POST', 'eventos', { evento: desafio }, t.tokenAluno);
    await s.parar();
    const s2 = await iniciarServidor(s.pasta);
    const r = await s2.api('POST', 'eventos', { evento: desafio }, t.tokenAluno);
    assert.equal(r.dados.repeticao, true);
    await s2.parar();
    const { rows } = await sql('SELECT repeticao FROM sq_eventos ORDER BY id', [], s.pasta);
    assert.deepEqual(
      rows.map(r => r.repeticao),
      [false, true]
    );
  });

  it('copia os dados da versão antiga (tudo num JSON) para as tabelas na primeira vez', async () => {
    // Gera dados no formato antigo com o modo arquivo e os coloca na tabela antiga
    const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'sq-antigo-'));
    const antigo = await iniciarServidorArquivo(pasta);
    const t = await prepararTurma(antigo.api);
    await antigo.api('POST', 'eventos', { evento: desafio }, t.tokenAluno);
    await antigo.parar();
    const blob = fs.readFileSync(path.join(pasta, 'banco.json'), 'utf8');

    const esquema = await novoEsquema();
    await sql(
      'CREATE TABLE softwarequest_dados (id text PRIMARY KEY, dados jsonb NOT NULL, atualizado_em timestamptz NOT NULL DEFAULT now())',
      [],
      esquema
    );
    await sql("INSERT INTO softwarequest_dados (id, dados) VALUES ('principal', $1)", [blob], esquema);

    const s = await iniciarServidor(esquema);
    const login = await s.api('POST', 'login/aluno', {
      codigoTurma: t.turma.codigo,
      usuario: 'ana',
      senha: 'senha123'
    });
    assert.equal(login.status, 200);
    const eventos = (await s.api('GET', 'professor/eventos', undefined, t.tokenProf)).dados.eventos;
    assert.equal(eventos.length, 1);
    assert.equal(eventos[0].desafioId, 'req-pergunta');
    await s.parar();
    const tabelas = (await sql("SELECT to_regclass('softwarequest_dados_backup') AS t", [], esquema)).rows[0];
    assert.ok(tabelas.t, 'a tabela antiga fica guardada como backup');
  });

  it('grava só os registros que mudaram', async () => {
    const s = await iniciarServidor();
    const t = await prepararTurma(s.api);
    await s.api('POST', 'alunos', {
      codigoTurma: t.turma.codigo,
      usuario: 'bia',
      senha: 'senha123',
      perfil: { apelido: 'Byte', codigoPesquisa: 'P08' }
    });
    await new Promise(r => setTimeout(r, 800)); // espera a gravação agrupada
    // xmin muda sempre que o PostgreSQL reescreve uma linha
    const versoes = async () =>
      Object.fromEntries(
        (await sql('SELECT usuario, xmin::text AS v FROM sq_alunos', [], s.pasta)).rows.map(r => [r.usuario, r.v])
      );
    const antes = await versoes();
    const { perfil } = (await s.api('GET', 'perfil', undefined, t.tokenAluno)).dados;
    await s.api('PUT', 'perfil', { perfil: { ...perfil, posicao: { x: 3, y: 2 } } }, t.tokenAluno);
    await s.parar();
    const depois = await versoes();
    assert.notEqual(depois.ana, antes.ana, 'a linha de quem mudou é atualizada');
    assert.equal(depois.bia, antes.bia, 'a linha de quem não mudou fica intacta');
  });

  it('as consultas de docs/consultas.sql funcionam', async () => {
    const s = await iniciarServidor();
    const t = await prepararTurma(s.api);
    await s.api('POST', 'eventos', { evento: desafio }, t.tokenAluno);
    await s.parar();
    const consultas = fs
      .readFileSync(path.join(RAIZ, 'docs', 'consultas.sql'), 'utf8')
      .replace(/--.*$/gm, '')
      .split(';')
      .map(c => c.trim())
      .filter(Boolean);
    assert.ok(consultas.length >= 5);
    for (const c of consultas) await sql(c.replaceAll("'CODIGO'", `'${t.turma.codigo}'`), [], s.pasta);
  });

  it('exporta e importa todos os dados pelo terminal', async () => {
    const s = await iniciarServidor();
    const t = await prepararTurma(s.api);
    await s.api('POST', 'eventos', { evento: desafio }, t.tokenAluno);
    await s.parar();
    const arquivo = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'sq-backup-')), 'backup.json');
    const rodar = (esquema, ...args) =>
      execFileSync(process.execPath, ['servidor.js', ...args], {
        cwd: RAIZ,
        env: { ...process.env, DATABASE_URL: urlDoEsquema(esquema) },
        encoding: 'utf8'
      });
    assert.match(rodar(s.pasta, 'exportar', arquivo), /1 professor\(es\), 1 turma\(s\), 1 aluno\(s\), 1 evento\(s\)/);

    const destino = await novoEsquema();
    assert.match(rodar(destino, 'importar', arquivo, '--substituir'), /Dados importados/);
    const { rows } = await sql(
      'SELECT (SELECT count(*) FROM sq_alunos)::int AS a, (SELECT count(*) FROM sq_eventos)::int AS e',
      [],
      destino
    );
    assert.deepEqual(rows[0], { a: 1, e: 1 });
  });
});

/** Servidor no modo arquivo, mesmo quando os outros testes usam o PostgreSQL. */
async function iniciarServidorArquivo(pasta) {
  const anterior = process.env.TESTE_DATABASE_URL;
  delete process.env.TESTE_DATABASE_URL;
  // O ajudante decide o modo ao ser carregado: carrega uma cópia nova dele sem a variável
  delete require.cache[require.resolve('./ajudantes')];
  try {
    return await require('./ajudantes').iniciarServidor(pasta);
  } finally {
    process.env.TESTE_DATABASE_URL = anterior;
    delete require.cache[require.resolve('./ajudantes')];
  }
}
