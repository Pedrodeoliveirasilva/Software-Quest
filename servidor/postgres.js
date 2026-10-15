/* =================================================================
   Banco de dados PostgreSQL (Neon, no plano gratuito)
   Cada coleção é uma tabela de verdade, com colunas, chaves e índices:

     sq_professores   contas de professor (nome, escola, e-mail, foto)
     sq_turmas        turmas, com o código de acesso
     sq_alunos        alunos e o progresso de cada um no jogo
     sq_contas        login: e-mail (interno, no caso dos alunos) e hash da senha
     sq_sessoes       sessões abertas (token de login)
     sq_eventos       um registro por desafio, lição e missão: os dados da pesquisa
     sq_meta          versão do esquema

   Como funciona: ao iniciar, o servidor lê as tabelas para a memória (consultas rápidas,
   sem esperar o banco a cada clique). Cada mudança marca só o registro alterado, e a
   gravação envia ao banco apenas esses registros, numa transação. Os eventos de pesquisa
   são só inseridos, nunca reescritos. Por isso o servidor deve rodar numa única instância
   (é o caso do plano gratuito do Render).

   Na primeira vez com este esquema, se existir a tabela antiga softwarequest_dados (versão
   anterior, com tudo num único JSON), os dados são copiados para as tabelas novas e a tabela
   antiga é renomeada para softwarequest_dados_backup.
   ================================================================= */
'use strict';
const jogo = require('./jogo');

const VERSAO_ESQUEMA = 1;

const ESQUEMA = `
CREATE TABLE IF NOT EXISTS sq_meta (
  chave text PRIMARY KEY,
  valor text NOT NULL
);

CREATE TABLE IF NOT EXISTS sq_professores (
  uid        text PRIMARY KEY,
  nome       text NOT NULL,
  escola     text NOT NULL DEFAULT '',
  email      text NOT NULL UNIQUE,
  foto       text,
  criado_em  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sq_turmas (
  id              text PRIMARY KEY,
  professor_uid   text NOT NULL REFERENCES sq_professores (uid) DEFERRABLE INITIALLY DEFERRED,
  nome            text NOT NULL,
  escola          text NOT NULL DEFAULT '',
  codigo          text NOT NULL UNIQUE,
  professor_nome  text NOT NULL DEFAULT '',
  pesquisa        boolean NOT NULL DEFAULT false,
  fotos           boolean NOT NULL DEFAULT false,
  ativa           boolean NOT NULL DEFAULT true,
  criada_em       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sq_turmas_professor ON sq_turmas (professor_uid);

CREATE TABLE IF NOT EXISTS sq_alunos (
  uid                text PRIMARY KEY,
  usuario            text NOT NULL,
  apelido            text NOT NULL,
  turma_id           text NOT NULL REFERENCES sq_turmas (id) DEFERRABLE INITIALLY DEFERRED,
  turma              text NOT NULL DEFAULT '',
  codigo_turma       text NOT NULL,
  professor_uid      text NOT NULL,
  codigo_pesquisa    text,
  xp                 integer NOT NULL DEFAULT 0,
  qualidade          integer NOT NULL DEFAULT 100,
  cor                text NOT NULL DEFAULT '#6B3FD6',
  classe             text NOT NULL DEFAULT 'frontend',
  foto               text,
  missoes            jsonb NOT NULL DEFAULT '{}',
  licoes             jsonb NOT NULL DEFAULT '{}',
  itens              jsonb NOT NULL DEFAULT '[]',
  requisitos_errados jsonb NOT NULL DEFAULT '[]',
  posicao            jsonb,
  boas_vindas        boolean NOT NULL DEFAULT false,
  aceite_termos_em   timestamptz,
  criado_em          timestamptz NOT NULL DEFAULT now(),
  ultimo_acesso      timestamptz,
  UNIQUE (turma_id, usuario)
);
CREATE INDEX IF NOT EXISTS sq_alunos_turma ON sq_alunos (turma_id);
CREATE INDEX IF NOT EXISTS sq_alunos_professor ON sq_alunos (professor_uid);

CREATE TABLE IF NOT EXISTS sq_contas (
  email  text PRIMARY KEY,
  uid    text NOT NULL UNIQUE,
  papel  text NOT NULL CHECK (papel IN ('professor', 'aluno')),
  sal    text NOT NULL,
  hash   text NOT NULL
);

CREATE TABLE IF NOT EXISTS sq_sessoes (
  token      text PRIMARY KEY,
  uid        text NOT NULL,
  criada_em  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sq_sessoes_uid ON sq_sessoes (uid);

CREATE TABLE IF NOT EXISTS sq_eventos (
  id                bigserial PRIMARY KEY,
  uid               text NOT NULL,
  usuario           text,
  codigo_pesquisa   text,
  turma_id          text NOT NULL,
  turma             text,
  professor_uid     text NOT NULL,
  tipo              text NOT NULL CHECK (tipo IN ('desafio', 'licao', 'missao')),
  fase_id           text,
  fase              text,
  desafio_id        text,
  tipo_desafio      text,
  licao_id          text,
  tentativas        integer,
  acertou           boolean,
  acertou_primeira  boolean,
  pontos            integer,
  estrelas          integer,
  acertos_primeira  integer,
  tempo_segundos    integer,
  repeticao         boolean NOT NULL DEFAULT false,
  data_hora         timestamptz,
  recebido_em       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sq_eventos_turma ON sq_eventos (professor_uid, turma_id, id);
CREATE INDEX IF NOT EXISTS sq_eventos_aluno ON sq_eventos (uid, id);
`;

/* ---------- conversões entre a memória (objetos do servidor) e as linhas das tabelas ---------- */
const iso = v => (v == null ? null : v instanceof Date ? v.toISOString() : String(v));
const dataOuNull = v => {
  if (v == null || v === '') return null;
  const t = typeof v === 'number' ? v : Date.parse(v);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
};
const dataOuAgora = v => dataOuNull(v) || new Date().toISOString();
const inteiroOuNull = v => (Number.isFinite(Number(v)) && v !== null && v !== '' ? Math.round(Number(v)) : null);
const boolOuNull = v => (typeof v === 'boolean' ? v : null);

/**
 * Cada tabela: nome, chave primária, coleção na memória e as duas conversões.
 * paraLinha(chave, objeto) -> linha da tabela; daLinha(linha) -> [chave, objeto].
 */
const TABELAS = {
  professores: {
    tabela: 'sq_professores',
    pk: 'uid',
    paraLinha: (uid, p) => ({
      uid,
      nome: p.nome,
      escola: p.escola || '',
      email: p.email,
      foto: p.foto || null,
      criado_em: dataOuAgora(p.criadoEm)
    }),
    daLinha: r => [
      r.uid,
      { nome: r.nome, escola: r.escola, email: r.email, foto: r.foto || null, criadoEm: iso(r.criado_em) }
    ]
  },
  turmas: {
    tabela: 'sq_turmas',
    pk: 'id',
    paraLinha: (id, t) => ({
      id,
      professor_uid: t.professorUid,
      nome: t.nome,
      escola: t.escola || '',
      codigo: t.codigo,
      professor_nome: t.professorNome || '',
      pesquisa: !!t.pesquisa,
      fotos: !!t.fotos,
      ativa: t.ativa !== false,
      criada_em: dataOuAgora(t.criadaEm)
    }),
    daLinha: r => [
      r.id,
      {
        nome: r.nome,
        escola: r.escola,
        codigo: r.codigo,
        professorUid: r.professor_uid,
        professorNome: r.professor_nome,
        pesquisa: r.pesquisa,
        fotos: r.fotos,
        ativa: r.ativa,
        criadaEm: iso(r.criada_em)
      }
    ]
  },
  users: {
    tabela: 'sq_alunos',
    pk: 'uid',
    paraLinha: (uid, a) => {
      const avatar = a.avatar || {};
      return {
        uid,
        usuario: a.usuario,
        apelido: a.apelido,
        turma_id: a.turmaId,
        turma: a.turma || '',
        codigo_turma: a.codigoTurma,
        professor_uid: a.professorUid,
        codigo_pesquisa: a.codigoPesquisa || null,
        xp: inteiroOuNull(a.xp) || 0,
        qualidade: inteiroOuNull(a.qualidade) ?? 100,
        cor: avatar.cor || '#6B3FD6',
        classe: avatar.classe || 'frontend',
        foto: avatar.foto || null,
        missoes: a.missoes || {},
        licoes: a.licoes || {},
        itens: a.itens || [],
        requisitos_errados: a.requisitosErrados || [],
        posicao: a.posicao || null,
        boas_vindas: !!a.boasVindas,
        aceite_termos_em: dataOuNull(a.aceiteTermosEm),
        criado_em: dataOuAgora(a.criadoEm),
        ultimo_acesso: dataOuNull(a.ultimoAcesso)
      };
    },
    daLinha: r => [
      r.uid,
      {
        uid: r.uid,
        papel: 'aluno',
        usuario: r.usuario,
        apelido: r.apelido,
        codigoPesquisa: r.codigo_pesquisa,
        avatar: { cor: r.cor, classe: r.classe, foto: r.foto || null },
        turmaId: r.turma_id,
        turma: r.turma,
        codigoTurma: r.codigo_turma,
        professorUid: r.professor_uid,
        xp: r.xp,
        qualidade: r.qualidade,
        licoes: r.licoes,
        missoes: r.missoes,
        itens: r.itens,
        requisitosErrados: r.requisitos_errados,
        posicao: r.posicao,
        boasVindas: r.boas_vindas,
        aceiteTermosEm: iso(r.aceite_termos_em),
        criadoEm: iso(r.criado_em),
        ultimoAcesso: iso(r.ultimo_acesso)
      }
    ]
  },
  contas: {
    tabela: 'sq_contas',
    pk: 'email',
    paraLinha: (email, c) => ({ email, uid: c.uid, papel: c.papel, sal: c.sal, hash: c.hash }),
    daLinha: r => [r.email, { uid: r.uid, papel: r.papel, sal: r.sal, hash: r.hash }]
  },
  sessoes: {
    tabela: 'sq_sessoes',
    pk: 'token',
    paraLinha: (token, s) => ({ token, uid: s.uid, criada_em: dataOuAgora(s.criadaEm) }),
    daLinha: r => [r.token, { uid: r.uid, criadaEm: new Date(r.criada_em).getTime() }]
  }
};
// Ordem de gravação: quem é referenciado vem antes (as chaves estrangeiras também são adiadas)
const ORDEM = ['professores', 'turmas', 'users', 'contas', 'sessoes'];

const COLUNAS_EVENTO = [
  'uid',
  'usuario',
  'codigo_pesquisa',
  'turma_id',
  'turma',
  'professor_uid',
  'tipo',
  'fase_id',
  'fase',
  'desafio_id',
  'tipo_desafio',
  'licao_id',
  'tentativas',
  'acertou',
  'acertou_primeira',
  'pontos',
  'estrelas',
  'acertos_primeira',
  'tempo_segundos',
  'repeticao',
  'data_hora',
  'recebido_em'
];
const eventoParaLinha = e => ({
  uid: e.uid,
  usuario: e.usuario || null,
  codigo_pesquisa: e.codigoPesquisa || null,
  turma_id: e.turmaId,
  turma: e.turma || null,
  professor_uid: e.professorUid,
  tipo: e.tipo,
  fase_id: e.faseId || null,
  fase: e.fase || null,
  desafio_id: e.desafioId || null,
  tipo_desafio: e.tipoDesafio || null,
  licao_id: e.licaoId || null,
  tentativas: inteiroOuNull(e.tentativas),
  acertou: boolOuNull(e.acertou),
  acertou_primeira: boolOuNull(e.acertouPrimeira),
  pontos: inteiroOuNull(e.pontos),
  estrelas: inteiroOuNull(e.estrelas),
  acertos_primeira: inteiroOuNull(e.acertosPrimeira),
  tempo_segundos: inteiroOuNull(e.tempoSegundos),
  repeticao: !!e.repeticao,
  data_hora: dataOuNull(e.dataHora),
  recebido_em: dataOuAgora(e.recebidoEm)
});
/** Devolve o evento no mesmo formato usado pelas rotas e pelo painel (sem campos vazios). */
function eventoDaLinha(r) {
  const e = {
    tipo: r.tipo,
    faseId: r.fase_id,
    fase: r.fase,
    desafioId: r.desafio_id,
    tipoDesafio: r.tipo_desafio,
    licaoId: r.licao_id,
    tentativas: r.tentativas,
    acertou: r.acertou,
    acertouPrimeira: r.acertou_primeira,
    pontos: r.pontos,
    estrelas: r.estrelas,
    acertosPrimeira: r.acertos_primeira,
    tempoSegundos: r.tempo_segundos,
    dataHora: iso(r.data_hora),
    repeticao: r.repeticao,
    uid: r.uid,
    usuario: r.usuario,
    codigoPesquisa: r.codigo_pesquisa,
    turmaId: r.turma_id,
    turma: r.turma,
    professorUid: r.professor_uid,
    recebidoEm: iso(r.recebido_em)
  };
  for (const k of Object.keys(e)) if (e[k] === null && k !== 'codigoPesquisa' && k !== 'tentativas') delete e[k];
  return e;
}

/* ---------- comandos SQL em lote ----------
   json_populate_recordset transforma uma lista JSON em linhas da tabela, então um único
   comando grava muitos registros, o que importa num banco remoto como o Neon. */
async function upsert(cliente, nome, linhas) {
  if (!linhas.length) return;
  const { tabela, pk } = TABELAS[nome];
  const colunas = Object.keys(linhas[0]);
  const lista = colunas.join(', ');
  const atualizar = colunas
    .filter(c => c !== pk)
    .map(c => `${c} = EXCLUDED.${c}`)
    .join(', ');
  await cliente.query(
    `INSERT INTO ${tabela} (${lista}) SELECT ${lista} FROM json_populate_recordset(NULL::${tabela}, $1::json) ` +
      `ON CONFLICT (${pk}) DO UPDATE SET ${atualizar}`,
    [JSON.stringify(linhas)]
  );
}
async function apagar(cliente, nome, chaves) {
  if (!chaves.length) return;
  const { tabela, pk } = TABELAS[nome];
  await cliente.query(`DELETE FROM ${tabela} WHERE ${pk} = ANY($1::text[])`, [chaves]);
}
async function inserirEventos(cliente, eventos) {
  const lista = COLUNAS_EVENTO.join(', ');
  for (let i = 0; i < eventos.length; i += 1000) {
    const linhas = eventos.slice(i, i + 1000).map(eventoParaLinha);
    await cliente.query(
      `INSERT INTO sq_eventos (${lista}) SELECT ${lista} FROM json_populate_recordset(NULL::sq_eventos, $1::json)`,
      [JSON.stringify(linhas)]
    );
  }
}

/** Executa fn(cliente) numa transação: ou tudo é gravado, ou nada. */
async function transacao(pool, fn) {
  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    const r = await fn(cliente);
    await cliente.query('COMMIT');
    return r;
  } catch (e) {
    await cliente.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    cliente.release();
  }
}

/**
 * Remove registros que quebrariam as chaves estrangeiras (dados antigos ou editados à mão),
 * avisando no terminal, e passa o progresso dos alunos pelas mesmas regras das rotas.
 */
function prepararParaImportar(d) {
  const avisos = [];
  const turmas = {},
    users = {};
  for (const [id, t] of Object.entries(d.turmas || {})) {
    if (d.professores[t.professorUid]) turmas[id] = t;
    else avisos.push(`turma ${id} ignorada (professor inexistente)`);
  }
  for (const [uid, a] of Object.entries(d.users || {})) {
    if (!turmas[a.turmaId]) {
      avisos.push(`aluno ${uid} ignorado (turma inexistente)`);
      continue;
    }
    const avatar = jogo.avatarSeguro(a.avatar, a.avatar && a.avatar.foto);
    users[uid] = { ...a, ...jogo.progressoSeguro(a), avatar, ultimoAcesso: a.ultimoAcesso || null };
  }
  const eventos = (d.eventos || []).filter(e => e && e.uid && e.turmaId && e.professorUid && e.tipo);
  if (eventos.length < (d.eventos || []).length)
    avisos.push(`${(d.eventos || []).length - eventos.length} evento(s) incompleto(s) ignorado(s)`);
  avisos.forEach(a => console.warn('  Aviso: ' + a));
  return { ...d, turmas, users, eventos };
}

function armazenamentoPostgres(url) {
  let Pool;
  try {
    ({ Pool } = require('pg'));
  } catch (e) {
    console.error('A variável DATABASE_URL foi definida, mas o pacote "pg" não está instalado. Rode: npm install');
    process.exit(1);
  }
  const pool = new Pool({ connectionString: url, max: 3, idleTimeoutMillis: 30000, connectionTimeoutMillis: 20000 });
  pool.on('error', e => console.error('Conexão com o banco encerrada (será reaberta quando preciso):', e.message));

  /** Grava todos os dados, substituindo o conteúdo das tabelas (comando importar e migração). */
  async function gravarTudo(cliente, dados) {
    const d = prepararParaImportar(dados);
    await cliente.query(
      'TRUNCATE sq_eventos, sq_sessoes, sq_contas, sq_alunos, sq_turmas, sq_professores RESTART IDENTITY'
    );
    for (const nome of ORDEM) {
      const { paraLinha } = TABELAS[nome];
      const linhas = Object.entries(d[nome] || {}).map(([k, v]) => paraLinha(k, v));
      for (let i = 0; i < linhas.length; i += 1000) await upsert(cliente, nome, linhas.slice(i, i + 1000));
    }
    await inserirEventos(cliente, d.eventos);
  }

  async function migrarVersaoAntiga(cliente) {
    const existe = await cliente.query("SELECT to_regclass('softwarequest_dados') IS NOT NULL AS existe");
    if (!existe.rows[0].existe) return;
    const ocupado = await cliente.query('SELECT (SELECT count(*) FROM sq_professores) > 0 AS ocupado');
    if (ocupado.rows[0].ocupado) return; // as tabelas novas já têm dados: não mistura
    const r = await cliente.query("SELECT dados FROM softwarequest_dados WHERE id = 'principal'");
    if (r.rows[0]) {
      console.log('  Copiando os dados da versão anterior para as tabelas novas...');
      await gravarTudo(cliente, {
        professores: {},
        turmas: {},
        users: {},
        contas: {},
        sessoes: {},
        ...r.rows[0].dados
      });
    }
    await cliente.query('ALTER TABLE softwarequest_dados RENAME TO softwarequest_dados_backup');
    console.log('  Pronto. A tabela antiga foi mantida como softwarequest_dados_backup.');
  }

  return {
    descricao: 'banco PostgreSQL (DATABASE_URL), tabelas sq_*',

    async carregar() {
      await transacao(pool, async c => {
        // Impede que duas instâncias criem as tabelas ao mesmo tempo
        await c.query('SELECT pg_advisory_xact_lock(727274)');
        await c.query(ESQUEMA);
        await c.query(
          "INSERT INTO sq_meta (chave, valor) VALUES ('versao', $1) ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor",
          [String(VERSAO_ESQUEMA)]
        );
        await migrarVersaoAntiga(c);
      });
      const dados = { eventos: [] };
      for (const nome of ORDEM) {
        const { tabela, daLinha } = TABELAS[nome];
        dados[nome] = Object.fromEntries((await pool.query(`SELECT * FROM ${tabela}`)).rows.map(daLinha));
      }
      dados.eventos = (await pool.query('SELECT * FROM sq_eventos ORDER BY id')).rows.map(eventoDaLinha);
      return dados;
    },

    /**
     * Grava só o que mudou. lote = { colecoes: { users: Set(chaves), ... }, eventos: [novos] }.
     * Para cada chave marcada: se o registro ainda existe na memória, atualiza (ou cria);
     * se não existe mais, apaga.
     */
    async salvar(dados, lote) {
      await transacao(pool, async c => {
        for (const nome of ORDEM) {
          const chaves = [...(lote.colecoes[nome] || [])];
          if (!chaves.length) continue;
          const colecao = dados[nome];
          const existentes = chaves.filter(k => Object.hasOwn(colecao, k));
          await upsert(
            c,
            nome,
            existentes.map(k => TABELAS[nome].paraLinha(k, colecao[k]))
          );
          await apagar(
            c,
            nome,
            chaves.filter(k => !Object.hasOwn(colecao, k))
          );
        }
        await inserirEventos(c, lote.eventos);
      });
    },

    substituir: dados => transacao(pool, c => gravarTudo(c, dados)),
    fechar: () => pool.end()
  };
}

module.exports = { armazenamentoPostgres, prepararParaImportar };
