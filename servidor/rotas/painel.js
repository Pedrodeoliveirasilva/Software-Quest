/* Rotas do painel do professor: alunos, eventos, nova senha e remoção de foto. */
'use strict';
const banco = require('../banco');
const { falha } = require('../erros');
const seg = require('../seguranca');

module.exports = function registrar(rota) {
  rota('GET', '/api/professor/alunos', ({ s, query }) => {
    seg.exigirProfessor(s);
    const turmaId = query.get('turmaId');
    return {
      alunos: Object.values(banco.dados.users).filter(
        u => u.professorUid === s.uid && (!turmaId || u.turmaId === turmaId)
      )
    };
  });

  rota('GET', '/api/professor/eventos', ({ s, query }) => {
    seg.exigirProfessor(s);
    const turmaId = query.get('turmaId');
    return {
      eventos: banco.dados.eventos.filter(e => e.professorUid === s.uid && (!turmaId || e.turmaId === turmaId))
    };
  });

  rota('POST', '/api/professor/alunos/:uid/senha', ({ s, params, corpo }) => {
    seg.exigirProfessor(s);
    seg.alunoDoProfessor(s, params.uid);
    const senha = String(corpo.senha || '');
    if (senha.length < 6) falha(400, 'auth/weak-password', 'A senha precisa ter pelo menos 6 caracteres.');
    const contas = banco.dados.contas;
    const email = Object.keys(contas).find(k => contas[k].uid === params.uid);
    Object.assign(contas[email], seg.protegerSenha(senha));
    seg.encerrarSessoesDe(params.uid);
    banco.gravar();
    return { ok: true };
  });

  rota('DELETE', '/api/professor/alunos/:uid/foto', ({ s, params }) => {
    seg.exigirProfessor(s);
    const a = seg.alunoDoProfessor(s, params.uid);
    a.avatar = { ...(a.avatar || {}), foto: null };
    banco.gravar();
    return { ok: true };
  });
};
