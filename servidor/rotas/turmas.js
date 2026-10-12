/* Rotas de turmas: consulta pública pelo código e gestão pelo professor. */
'use strict';
const banco = require('../banco');
const { falha } = require('../erros');
const { agora, novoId, texto, normalizarCodigo, gerarCodigoTurma } = require('../util');
const seg = require('../seguranca');

/** Resumo público da turma, guardado no índice de códigos (usado no cadastro do aluno). */
const resumoCodigo = (id, t) => ({
  turmaId: id,
  nome: t.nome,
  escola: t.escola,
  professorUid: t.professorUid,
  professorNome: t.professorNome,
  pesquisa: !!t.pesquisa,
  fotos: !!t.fotos,
  ativa: t.ativa !== false
});

module.exports = function registrar(rota) {
  rota('GET', '/api/turmas/codigo/:codigo', ({ params }) => {
    const c = normalizarCodigo(params.codigo),
      t = banco.dados.codigos[c];
    return { turma: t ? { codigo: c, ...t } : null };
  });

  rota('GET', '/api/turmas', ({ s }) => {
    seg.exigirProfessor(s);
    return {
      turmas: Object.entries(banco.dados.turmas)
        .filter(([, t]) => t.professorUid === s.uid)
        .map(([id, t]) => ({ id, ...t }))
    };
  });

  rota('POST', '/api/turmas', ({ s, corpo }) => {
    const prof = seg.exigirProfessor(s);
    const nome = texto(corpo.nome, 60);
    if (nome.length < 2) falha(400, 'invalid-argument', 'Dê um nome à turma.');
    const d = banco.dados,
      id = novoId('turma'),
      codigo = gerarCodigoTurma(d.codigos);
    const t = {
      nome,
      escola: texto(corpo.escola, 80) || prof.escola || '',
      codigo,
      professorUid: s.uid,
      professorNome: prof.nome,
      pesquisa: !!corpo.pesquisa,
      fotos: false,
      ativa: true,
      criadaEm: agora()
    };
    d.turmas[id] = t;
    d.codigos[codigo] = resumoCodigo(id, t);
    banco.gravar();
    return { turma: { id, ...t } };
  });

  rota('PATCH', '/api/turmas/:id', ({ s, params, corpo }) => {
    seg.exigirProfessor(s);
    const t = seg.turmaDoProfessor(s, params.id);
    if ('nome' in corpo) {
      const n = texto(corpo.nome, 60);
      if (n.length >= 2) t.nome = n;
    }
    if ('ativa' in corpo) t.ativa = !!corpo.ativa;
    if ('pesquisa' in corpo) t.pesquisa = !!corpo.pesquisa;
    if ('fotos' in corpo) {
      t.fotos = !!corpo.fotos;
      // ao desativar as fotos, as fotos atuais dos alunos desta turma são removidas
      if (!t.fotos)
        Object.values(banco.dados.users).forEach(u => {
          if (u.turmaId === params.id && u.avatar) u.avatar.foto = null;
        });
    }
    banco.dados.codigos[t.codigo] = resumoCodigo(params.id, t);
    banco.gravar();
    return { turma: { id: params.id, ...t } };
  });
};
