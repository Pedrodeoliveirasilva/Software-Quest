-- =================================================================
-- TABELAS DO SOFTWARE QUEST (PostgreSQL / Neon)
-- O servidor cria estas tabelas sozinho ao iniciar com a DATABASE_URL, e o comando
--   node servidor.js verificar-banco
-- faz o mesmo a partir do seu computador. Use este arquivo só se preferir criá-las
-- à mão: cole tudo no SQL Editor do Neon, NO MESMO BANCO E BRANCH da DATABASE_URL
-- do Render, e clique em "Run". Pode rodar mais de uma vez: nada é apagado.
-- Este arquivo é conferido pelo npm test e deve ser igual ao de servidor/postgres.js.
-- =================================================================
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
