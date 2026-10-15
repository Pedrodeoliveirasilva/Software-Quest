-- =================================================================
-- CONSULTAS PRONTAS PARA A PESQUISA (PostgreSQL / Neon)
-- Abra o projeto no Neon, clique em "SQL Editor", cole uma consulta e clique em "Run".
-- O resultado pode ser baixado em CSV pelo próprio Neon.
--
-- Troque 'CODIGO' pelo código da turma (sem o hífen, por exemplo 'QX742B').
-- As estatísticas consideram só a primeira vez de cada desafio (repeticao = false),
-- como no painel do professor.
-- Estas consultas só leem os dados; nenhuma altera nada.
-- =================================================================


-- 1. Turmas e quantidade de alunos
SELECT t.codigo, t.nome, t.escola, p.nome AS professor, t.pesquisa,
       count(a.uid) AS alunos
FROM sq_turmas t
JOIN sq_professores p ON p.uid = t.professor_uid
LEFT JOIN sq_alunos a ON a.turma_id = t.id
GROUP BY t.id, p.nome
ORDER BY t.criada_em;


-- 2. Resumo por aluno: XP, missões concluídas e acerto de primeira nos desafios
SELECT a.codigo_pesquisa, a.apelido, a.xp,
       (SELECT count(*) FROM jsonb_object_keys(a.missoes)) AS missoes_concluidas,
       count(e.id) FILTER (WHERE e.tipo = 'desafio') AS desafios,
       round(100.0 * avg(e.acertou_primeira::int) FILTER (WHERE e.tipo = 'desafio'), 1) AS pct_acerto_primeira
FROM sq_alunos a
LEFT JOIN sq_eventos e ON e.uid = a.uid AND NOT e.repeticao
WHERE a.codigo_turma = 'CODIGO'
GROUP BY a.uid
ORDER BY a.codigo_pesquisa NULLS LAST, a.apelido;


-- 3. Acerto de primeira por tema (fase do processo)
SELECT e.fase, count(*) AS respostas,
       round(100.0 * avg(e.acertou_primeira::int), 1) AS pct_acerto_primeira,
       round(avg(e.tentativas), 2) AS media_tentativas
FROM sq_eventos e
JOIN sq_turmas t ON t.id = e.turma_id
WHERE t.codigo = 'CODIGO' AND e.tipo = 'desafio' AND NOT e.repeticao
GROUP BY e.fase
ORDER BY min(e.id);


-- 4. Desafios com mais erros na primeira tentativa
SELECT e.desafio_id, e.fase, e.tipo_desafio, count(*) AS respostas,
       round(100.0 * avg((NOT e.acertou_primeira)::int), 1) AS pct_erro_primeira
FROM sq_eventos e
JOIN sq_turmas t ON t.id = e.turma_id
WHERE t.codigo = 'CODIGO' AND e.tipo = 'desafio' AND NOT e.repeticao
GROUP BY e.desafio_id, e.fase, e.tipo_desafio
ORDER BY pct_erro_primeira DESC, respostas DESC;


-- 5. Tempo e pontos por missão, por participante (para cruzar com o pré e o pós-teste)
SELECT a.codigo_pesquisa, e.fase, e.pontos, e.estrelas, e.acertos_primeira, e.tempo_segundos, e.data_hora
FROM sq_eventos e
JOIN sq_alunos a ON a.uid = e.uid
WHERE a.codigo_turma = 'CODIGO' AND e.tipo = 'missao' AND NOT e.repeticao
ORDER BY a.codigo_pesquisa, e.id;


-- 6. Lições da trilha concluídas por participante
SELECT a.codigo_pesquisa, a.apelido,
       count(*) FILTER (WHERE e.tipo = 'licao') AS licoes,
       count(*) FILTER (WHERE e.tipo = 'licao' AND e.acertou_primeira) AS verificacoes_de_primeira
FROM sq_alunos a
LEFT JOIN sq_eventos e ON e.uid = a.uid AND NOT e.repeticao
WHERE a.codigo_turma = 'CODIGO'
GROUP BY a.uid
ORDER BY a.codigo_pesquisa NULLS LAST;


-- 7. Todos os eventos da turma, no mesmo formato do CSV do painel
SELECT e.data_hora, a.codigo_pesquisa, a.usuario, e.tipo, e.fase, e.desafio_id, e.tipo_desafio, e.licao_id,
       e.tentativas, e.acertou, e.acertou_primeira, e.pontos, e.estrelas, e.tempo_segundos,
       e.repeticao::int AS repeticao
FROM sq_eventos e
JOIN sq_alunos a ON a.uid = e.uid
WHERE a.codigo_turma = 'CODIGO'
ORDER BY e.id;


-- 8. Uso do banco (para acompanhar o limite de 0,5 GB do plano gratuito do Neon)
SELECT relname AS tabela, n_live_tup AS linhas,
       pg_size_pretty(pg_total_relation_size(relid)) AS tamanho
FROM pg_stat_user_tables
WHERE relname LIKE 'sq_%'
ORDER BY pg_total_relation_size(relid) DESC;
