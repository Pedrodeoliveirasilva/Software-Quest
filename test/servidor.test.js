/* Testes do servidor: cada bloco inicia um servidor isolado, com dados temporários. */
'use strict';
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { iniciarServidor, FOTO_TESTE } = require('./ajudantes');

/** Faz um GET enviando o caminho exatamente como escrito (sem resolver "..") e devolve o status. */
function statusSemNormalizar(url, caminho) {
  const { hostname, port } = new URL(url);
  return new Promise((resolve, reject) => {
    http
      .get({ hostname, port, path: caminho }, res => {
        res.resume();
        resolve(res.statusCode);
      })
      .on('error', reject);
  });
}

/** Cria professor, turma e aluno; devolve tokens e o código da turma. */
async function prepararTurma(api, sufixo = '', opcoesTurma = {}) {
  const prof = await api('POST', 'professores', {
    nome: 'Professor ' + sufixo,
    email: `prof${sufixo}@escola.com`,
    senha: 'prof123'
  });
  const turma = (await api('POST', 'turmas', { nome: 'Turma ' + sufixo, ...opcoesTurma }, prof.dados.token)).dados
    .turma;
  const aluno = await api('POST', 'alunos', {
    codigoTurma: turma.codigo,
    usuario: 'ana',
    senha: 'senha123',
    perfil: { apelido: 'Coruja', codigoPesquisa: 'P07', xp: 0, missoes: {} }
  });
  return { tokenProf: prof.dados.token, turma, tokenAluno: aluno.dados.token, uidAluno: aluno.dados.sessao.uid };
}

describe('Contas e sessões', () => {
  let s;
  before(async () => (s = await iniciarServidor()));
  after(() => s.parar());

  it('responde à verificação de saúde', async () => {
    assert.equal((await s.api('GET', 'saude')).dados.ok, true);
  });

  it('cadastra professor, recusa e-mail repetido e faz login', async () => {
    const r = await s.api('POST', 'professores', { nome: 'Hugo Araújo', email: 'hugo@escola.com', senha: 'prof123' });
    assert.equal(r.status, 200);
    assert.equal(r.dados.sessao.papel, 'professor');
    const repetido = await s.api('POST', 'professores', { nome: 'Outro', email: 'HUGO@escola.com', senha: 'abcdef' });
    assert.equal(repetido.status, 409);
    assert.equal((await s.api('POST', 'login/professor', { email: 'hugo@escola.com', senha: 'errada' })).status, 401);
    assert.equal((await s.api('POST', 'login/professor', { email: 'hugo@escola.com', senha: 'prof123' })).status, 200);
  });

  it('bloqueia depois de muitas senhas erradas', async () => {
    let ultimo;
    for (let i = 0; i < 16; i++) ultimo = await s.api('POST', 'login/professor', { email: 'x@y.com', senha: 'nao' });
    assert.equal(ultimo.status, 429);
  });

  it('encerra a sessão ao sair', async () => {
    const { dados } = await s.api('POST', 'professores', {
      nome: 'Saída Teste',
      email: 'sair@escola.com',
      senha: 'abcdef'
    });
    await s.api('POST', 'sair', {}, dados.token);
    assert.equal((await s.api('GET', 'sessao', undefined, dados.token)).dados.sessao, null);
  });
});

describe('Turmas e alunos', () => {
  let s, t;
  before(async () => {
    s = await iniciarServidor();
    t = await prepararTurma(s.api, 'A', { pesquisa: true });
  });
  after(() => s.parar());

  it('encontra a turma pelo código sem precisar de login', async () => {
    const r = await s.api('GET', 'turmas/codigo/' + t.turma.codigo.toLowerCase());
    assert.equal(r.dados.turma.nome, 'Turma A');
  });

  it('exige o código de participante em turmas de pesquisa', async () => {
    const r = await s.api('POST', 'alunos', {
      codigoTurma: t.turma.codigo,
      usuario: 'bia',
      senha: 'abcdef',
      perfil: { apelido: 'Byte' }
    });
    assert.equal(r.status, 400);
  });

  it('recusa usuário repetido na mesma turma, mas aceita em outra turma', async () => {
    const repetido = await s.api('POST', 'alunos', {
      codigoTurma: t.turma.codigo,
      usuario: 'ana',
      senha: 'abcdef',
      perfil: { apelido: 'Outra', codigoPesquisa: 'P08' }
    });
    assert.equal(repetido.status, 409);
    const outra = await prepararTurma(s.api, 'B');
    assert.ok(outra.tokenAluno);
  });

  it('não deixa um professor alterar a turma de outro', async () => {
    const outro = await s.api('POST', 'professores', { nome: 'Intruso', email: 'intruso@escola.com', senha: 'abcdef' });
    const r = await s.api('PATCH', 'turmas/' + t.turma.id, { ativa: false }, outro.dados.token);
    assert.equal(r.status, 404);
  });

  it('turma fechada não aceita novos cadastros', async () => {
    await s.api('PATCH', 'turmas/' + t.turma.id, { ativa: false }, t.tokenProf);
    const r = await s.api('POST', 'alunos', {
      codigoTurma: t.turma.codigo,
      usuario: 'novo',
      senha: 'abcdef',
      perfil: { apelido: 'Novo', codigoPesquisa: 'P09' }
    });
    assert.equal(r.status, 403);
    await s.api('PATCH', 'turmas/' + t.turma.id, { ativa: true }, t.tokenProf);
  });
});

describe('Permissões e dados protegidos', () => {
  let s, t;
  before(async () => {
    s = await iniciarServidor();
    t = await prepararTurma(s.api, 'C');
  });
  after(() => s.parar());

  it('aluno não acessa o painel do professor', async () => {
    assert.equal((await s.api('GET', 'professor/alunos', undefined, t.tokenAluno)).status, 403);
    assert.equal((await s.api('GET', 'professor/alunos')).status, 403);
  });

  it('o aluno não consegue mudar turma, usuário ou professor pelo perfil', async () => {
    const { dados } = await s.api('GET', 'perfil', undefined, t.tokenAluno);
    const alterado = { ...dados.perfil, turmaId: 'outra', usuario: 'hacker', professorUid: 'invasor', xp: 500 };
    await s.api('PUT', 'perfil', { perfil: alterado }, t.tokenAluno);
    const depois = (await s.api('GET', 'perfil', undefined, t.tokenAluno)).dados.perfil;
    assert.equal(depois.turmaId, t.turma.id);
    assert.equal(depois.usuario, 'ana');
    assert.equal(depois.xp, 500, 'o progresso é salvo normalmente');
  });

  it('os eventos ficam com os dados do aluno logado e só o professor da turma os vê', async () => {
    await s.api(
      'POST',
      'eventos',
      { evento: { tipo: 'desafio', uid: 'falso', turmaId: 'outra', pontos: 100 } },
      t.tokenAluno
    );
    const meus = (await s.api('GET', 'professor/eventos', undefined, t.tokenProf)).dados.eventos;
    assert.equal(meus.length, 1);
    assert.equal(meus[0].uid, t.uidAluno);
    const outro = await prepararTurma(s.api, 'D');
    assert.equal((await s.api('GET', 'professor/eventos', undefined, outro.tokenProf)).dados.eventos.length, 0);
  });

  it('o ranking mostra só a turma do aluno', async () => {
    const outra = await prepararTurma(s.api, 'E');
    const ranking = (await s.api('GET', 'ranking', undefined, outra.tokenAluno)).dados.ranking;
    assert.equal(ranking.length, 1);
    assert.equal(ranking[0].uid, outra.uidAluno);
  });

  it('não entrega os arquivos de dados nem o código do servidor', async () => {
    for (const caminho of [
      '/dados/banco.json',
      '/servidor.js',
      '/servidor/seguranca.js',
      '/package.json',
      '/test/ajudantes.js'
    ]) {
      assert.equal((await fetch(s.url + caminho)).status, 404, caminho);
    }
    // Tentativas de sair da pasta public/ enviadas sem normalizar o caminho (o fetch normalizaria)
    for (const caminho of [
      '/js/../../servidor.js',
      '/../dados/banco.json',
      '/%2e%2e/servidor.js',
      '/css/..%2f..%2fpackage.json'
    ]) {
      assert.equal(await statusSemNormalizar(s.url, caminho), 404, caminho);
    }
    assert.equal((await fetch(s.url + '/')).status, 200);
    assert.equal((await fetch(s.url + '/css/01-tokens.css')).status, 200);
  });
});

describe('Fotos', () => {
  let s, t;
  before(async () => {
    s = await iniciarServidor();
    t = await prepararTurma(s.api, 'F');
  });
  after(() => s.parar());

  it('turmas novas não aceitam foto de aluno', async () => {
    assert.equal(t.turma.fotos, false);
    assert.equal((await s.api('PUT', 'perfil/foto', { foto: FOTO_TESTE }, t.tokenAluno)).status, 403);
  });

  it('aceita a foto depois que o professor libera e recusa imagem inválida', async () => {
    await s.api('PATCH', 'turmas/' + t.turma.id, { fotos: true }, t.tokenProf);
    assert.equal((await s.api('PUT', 'perfil/foto', { foto: 'javascript:alert(1)' }, t.tokenAluno)).status, 400);
    assert.equal((await s.api('PUT', 'perfil/foto', { foto: FOTO_TESTE }, t.tokenAluno)).status, 200);
  });

  it('a foto não muda pelo salvamento comum do perfil', async () => {
    const { perfil } = (await s.api('GET', 'perfil', undefined, t.tokenAluno)).dados;
    await s.api('PUT', 'perfil', { perfil: { ...perfil, avatar: { ...perfil.avatar, foto: null } } }, t.tokenAluno);
    assert.equal((await s.api('GET', 'perfil', undefined, t.tokenAluno)).dados.perfil.avatar.foto, FOTO_TESTE);
  });

  it('o professor remove a foto, e desligar as fotos da turma remove todas', async () => {
    await s.api('DELETE', `professor/alunos/${t.uidAluno}/foto`, undefined, t.tokenProf);
    assert.equal((await s.api('GET', 'perfil', undefined, t.tokenAluno)).dados.perfil.avatar.foto, null);
    await s.api('PUT', 'perfil/foto', { foto: FOTO_TESTE }, t.tokenAluno);
    await s.api('PATCH', 'turmas/' + t.turma.id, { fotos: false }, t.tokenProf);
    assert.equal((await s.api('GET', 'perfil', undefined, t.tokenAluno)).dados.perfil.avatar.foto, null);
  });

  it('o professor atualiza a própria foto e o nome', async () => {
    const r = await s.api('PATCH', 'professores/eu', { nome: 'Professor Novo', foto: FOTO_TESTE }, t.tokenProf);
    assert.equal(r.dados.sessao.nome, 'Professor Novo');
    assert.equal(r.dados.sessao.foto, FOTO_TESTE);
  });
});

describe('Senhas e persistência', () => {
  it('o professor redefine a senha do aluno e os dados sobrevivem a um reinício', async () => {
    const s = await iniciarServidor();
    const t = await prepararTurma(s.api, 'G');
    await s.api('POST', `professor/alunos/${t.uidAluno}/senha`, { senha: 'nova456' }, t.tokenProf);
    const login = senha => s.api('POST', 'login/aluno', { codigoTurma: t.turma.codigo, usuario: 'ana', senha });
    assert.equal((await login('senha123')).status, 401);
    assert.equal((await s.api('GET', 'perfil', undefined, t.tokenAluno)).status, 403, 'a sessão antiga é encerrada');
    assert.equal((await login('nova456')).status, 200);
    await s.parar();

    const s2 = await iniciarServidor(s.pasta);
    const r = await s2.api('POST', 'login/aluno', { codigoTurma: t.turma.codigo, usuario: 'ana', senha: 'nova456' });
    assert.equal(r.status, 200);
    await s2.parar();
  });
});
