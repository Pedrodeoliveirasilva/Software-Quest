/* Testes do servidor: cada bloco inicia um servidor isolado, com dados temporários. */
'use strict';
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { spawnSync } = require('node:child_process');
const { iniciarServidor, FOTO_TESTE, RAIZ, usandoPostgres } = require('./ajudantes');

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

  it('responde à verificação de saúde, dizendo onde os dados estão', async () => {
    const { dados } = await s.api('GET', 'saude');
    assert.equal(dados.ok, true);
    assert.equal(dados.armazenamento, usandoPostgres ? 'postgresql' : 'arquivo');
  });

  it('não inicia publicado (Render) sem DATABASE_URL, para não perder dados', () => {
    const env = { ...process.env, RENDER_EXTERNAL_URL: 'https://exemplo.onrender.com', PORT: '0' };
    delete env.DATABASE_URL;
    const r = spawnSync(process.execPath, ['servidor.js'], { cwd: RAIZ, env, encoding: 'utf8', timeout: 10000 });
    assert.equal(r.status, 1);
    assert.match(r.stderr, /falta a variável DATABASE_URL/);
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

  it('bloqueia a conta depois de muitas senhas erradas, mesmo trocando o IP informado', async () => {
    await s.api('POST', 'professores', { nome: 'Alvo Teste', email: 'alvo@escola.com', senha: 'certa1' });
    const tentar = (senha, ip) =>
      fetch(s.url + '/api/login/professor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip },
        body: JSON.stringify({ email: 'alvo@escola.com', senha })
      }).then(r => r.status);
    let ultimo;
    for (let i = 0; i < 11; i++) ultimo = await tentar('errada', '10.0.0.' + i);
    assert.equal(ultimo, 429);
    assert.equal(await tentar('certa1', '10.0.1.1'), 429, 'a conta fica bloqueada por alguns minutos');
    // As outras contas continuam funcionando
    assert.equal((await s.api('POST', 'login/professor', { email: 'hugo@escola.com', senha: 'prof123' })).status, 200);
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

  it('erros de senha de vários alunos na mesma rede não bloqueiam a turma', async () => {
    // Na escola, todos saem pelo mesmo IP: 40 alunos errando a senha uma vez não podem travar os demais
    for (let i = 0; i < 40; i++)
      await s.api('POST', 'login/aluno', { codigoTurma: t.turma.codigo, usuario: 'aluno' + i, senha: 'errada' });
    const r = await s.api('POST', 'login/aluno', { codigoTurma: t.turma.codigo, usuario: 'ana', senha: 'senha123' });
    assert.equal(r.status, 200);
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
    const alterado = {
      ...dados.perfil,
      turmaId: 'outra',
      usuario: 'hacker',
      professorUid: 'invasor',
      missoes: { requisitos: { pontos: 300, acertosPrimeira: 3, total: 3, tempoSegundos: 60, vezes: 1 } }
    };
    await s.api('PUT', 'perfil', { perfil: alterado }, t.tokenAluno);
    const depois = (await s.api('GET', 'perfil', undefined, t.tokenAluno)).dados.perfil;
    assert.equal(depois.turmaId, t.turma.id);
    assert.equal(depois.usuario, 'ana');
    assert.equal(depois.xp, 300, 'o progresso é salvo normalmente');
  });

  it('os eventos ficam com os dados do aluno logado e só o professor da turma os vê', async () => {
    await s.api(
      'POST',
      'eventos',
      {
        evento: {
          tipo: 'desafio',
          faseId: 'requisitos',
          desafioId: 'req-pergunta',
          tentativas: 1,
          acertou: true,
          uid: 'falso',
          turmaId: 'outra'
        }
      },
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

describe('Progresso e eventos validados pelo servidor', () => {
  let s, t;
  const evento = (e, token = t.tokenAluno) => s.api('POST', 'eventos', { evento: e }, token);
  const desafio = (desafioId, extra = {}) => ({
    tipo: 'desafio',
    faseId: 'requisitos',
    desafioId,
    tentativas: 1,
    acertou: true,
    tempoSegundos: 20,
    ...extra
  });
  const eventosDoProfessor = async () =>
    (await s.api('GET', 'professor/eventos', undefined, t.tokenProf)).dados.eventos;
  const perfil = async () => (await s.api('GET', 'perfil', undefined, t.tokenAluno)).dados.perfil;

  before(async () => {
    s = await iniciarServidor();
    t = await prepararTurma(s.api, 'V');
  });
  after(() => s.parar());

  it('o cadastro ignora XP, missões e campos estranhos enviados pelo navegador', async () => {
    const r = await s.api('POST', 'alunos', {
      codigoTurma: t.turma.codigo,
      usuario: 'trapaca',
      senha: 'abcdef',
      perfil: {
        apelido: 'Esperto',
        xp: 99999,
        missoes: { requisitos: { pontos: 300 }, planejamento: { pontos: 300 } },
        licoes: { 'req-1': { acertouPrimeira: true } },
        lixo: 'x'.repeat(2000),
        avatar: { cor: 'red;background:url(//e.co)', classe: 'hacker' }
      }
    });
    const p = (await s.api('GET', 'perfil', undefined, r.dados.token)).dados.perfil;
    assert.equal(p.xp, 0);
    assert.deepEqual(p.missoes, {});
    assert.deepEqual(p.licoes, {});
    assert.equal(p.lixo, undefined);
    assert.equal(p.avatar.cor, '#6B3FD6');
    assert.equal(p.avatar.classe, 'frontend');
  });

  it('o XP é recalculado a partir das missões e lições, que precisam ser coerentes', async () => {
    const atual = await perfil();
    await s.api(
      'PUT',
      'perfil',
      {
        perfil: {
          ...atual,
          xp: 99999,
          missoes: {
            requisitos: { pontos: 99999, acertosPrimeira: 2, total: 3 }, // 2 de primeira: no máximo 250
            testes: { pontos: 300, acertosPrimeira: 3 } // missão fora de ordem: ignorada
          },
          licoes: { 'req-1': { acertouPrimeira: true }, 'plan-3': { acertouPrimeira: true }, inventada: {} },
          campoNovo: 'x'.repeat(5000),
          avatar: { cor: '#123ABC', classe: 'qa' }
        }
      },
      t.tokenAluno
    );
    const p = await perfil();
    assert.deepEqual(Object.keys(p.missoes), ['requisitos']);
    assert.equal(p.missoes.requisitos.pontos, 250);
    assert.equal(p.missoes.requisitos.estrelas, 2);
    assert.deepEqual(Object.keys(p.licoes), ['req-1'], 'lição inventada e aprofundamento bloqueado ficam de fora');
    assert.equal(p.xp, 250 + 30);
    assert.equal(p.campoNovo, undefined);
    assert.equal(p.avatar.cor, '#123ABC');
    assert.equal(p.avatar.classe, 'qa');
  });

  it('a cor do avatar não aceita CSS, nem no perfil nem no ranking', async () => {
    const atual = await perfil();
    await s.api(
      'PUT',
      'perfil',
      { perfil: { ...atual, avatar: { cor: 'red;background:url(//e.co)', classe: 'qa' } } },
      t.tokenAluno
    );
    assert.equal((await perfil()).avatar.cor, '#6B3FD6');
    const ranking = (await s.api('GET', 'ranking', undefined, t.tokenAluno)).dados.ranking;
    assert.ok(ranking.every(r => /^#[0-9a-fA-F]{6}$/.test(r.avatar.cor)));
  });

  it('recusa eventos de fase, desafio ou tipo desconhecidos e tentativas incoerentes', async () => {
    assert.equal((await evento({ tipo: 'desafio', faseId: 'inventada', desafioId: 'x' })).status, 400);
    assert.equal((await evento(desafio('nao-existe'))).status, 400);
    assert.equal((await evento({ ...desafio('req-historia'), tipo: 'outro' })).status, 400);
    assert.equal((await evento(desafio('req-historia', { tentativas: 9 }))).status, 400);
    assert.equal((await evento(desafio('req-historia', { acertou: false, tentativas: 1 }))).status, 400);
  });

  it('recalcula pontos e acerto de primeira e descarta campos extras', async () => {
    const antes = (await eventosDoProfessor()).length;
    const r = await evento(
      desafio('req-classificar', { tentativas: 2, acertouPrimeira: true, pontos: 100000, extra: 'x', uid: 'outro' })
    );
    assert.equal(r.status, 200);
    const e = (await eventosDoProfessor())[antes];
    assert.equal(e.acertouPrimeira, false);
    assert.equal(e.pontos, 50);
    assert.equal(e.tipoDesafio, 'classificar');
    assert.equal(e.fase, 'Requisitos');
    assert.equal(e.extra, undefined);
    assert.equal(e.uid, t.uidAluno);
  });

  it('a repetição é decidida pelo servidor, não pelo navegador', async () => {
    await evento(desafio('req-historia', { repeticao: false }));
    await evento(desafio('req-historia', { repeticao: false }));
    const meus = (await eventosDoProfessor()).filter(e => e.desafioId === 'req-historia');
    assert.deepEqual(
      meus.map(e => e.repeticao),
      [false, true]
    );
  });

  it('não aceita eventos de uma missão que ainda não foi liberada', async () => {
    const outra = await prepararTurma(s.api, 'W');
    const planejamento = { ...desafio('plan-papeis'), faseId: 'planejamento' };
    assert.equal((await evento(planejamento, outra.tokenAluno)).status, 400);
    const fim = { tipo: 'missao', faseId: 'requisitos', pontos: 300, acertosPrimeira: 3, tempoSegundos: 100 };
    assert.equal((await evento(fim, outra.tokenAluno)).status, 200);
    assert.equal((await evento(planejamento, outra.tokenAluno)).status, 200);
  });

  it('limita a quantidade de eventos por minuto de um mesmo aluno', async () => {
    const outra = await prepararTurma(s.api, 'X');
    let ultimo;
    for (let i = 0; i < 61; i++) ultimo = await evento(desafio('req-pergunta'), outra.tokenAluno);
    assert.equal(ultimo.status, 429);
  });

  it('recusa corpos grandes demais', async () => {
    const r = await evento({ ...desafio('req-pergunta'), lixo: 'x'.repeat(20000) });
    assert.equal(r.status, 413);
    const enorme = await s.api('PUT', 'perfil', { perfil: { lixo: 'x'.repeat(400 * 1024) } }, t.tokenAluno);
    assert.equal(enorme.status, 413);
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
