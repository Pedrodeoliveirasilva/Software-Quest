/* Rotas de professores: cadastro, login e "Minha conta" (nome, escola e foto). */
'use strict';
const banco = require('../banco');
const { falha } = require('../erros');
const { agora, novoId, texto, emailValido, validarFoto } = require('../util');
const seg = require('../seguranca');
const cfg = require('../config');

module.exports = function registrar(rota) {
  rota('POST', '/api/professores', ({ corpo, ip }) => {
    seg.cadastros.verificar(ip);
    seg.cadastros.somar(ip);
    const nome = texto(corpo.nome, 80),
      escola = texto(corpo.escola, 80),
      email = texto(corpo.email, 120).toLowerCase(),
      senha = String(corpo.senha || '');
    if (nome.length < 3) falha(400, 'invalid-argument', 'Informe seu nome.');
    if (!emailValido(email)) falha(400, 'auth/invalid-email', 'E-mail inválido.');
    if (senha.length < 6) falha(400, 'auth/weak-password', 'A senha precisa ter pelo menos 6 caracteres.');
    const d = banco.dados;
    if (d.contas[email]) falha(409, 'auth/email-already-in-use', 'Já existe uma conta com este e-mail.');
    const uid = novoId('prof');
    d.contas[email] = { uid, papel: 'professor', ...seg.protegerSenha(senha) };
    d.professores[uid] = { nome, escola, email, foto: null, criadoEm: agora() };
    banco.alterar('contas', email);
    banco.alterar('professores', uid);
    return { token: seg.criarSessao(uid), sessao: seg.infoSessao(uid) };
  });

  rota('POST', '/api/login/professor', ({ corpo, ip }) => {
    const email = texto(corpo.email, 120).toLowerCase();
    seg.verificarLogin(ip, email);
    const conta = banco.dados.contas[email];
    if (!conta || conta.papel !== 'professor' || !seg.senhaConfere(conta, corpo.senha)) {
      seg.falhaDeLogin(ip, email);
      falha(401, 'auth/invalid-credential', 'E-mail ou senha incorretos.');
    }
    seg.loginCerto(email);
    return { token: seg.criarSessao(conta.uid), sessao: seg.infoSessao(conta.uid) };
  });

  // Minha conta: o professor altera nome, escola e foto
  rota(
    'PATCH',
    '/api/professores/eu',
    ({ s, corpo }) => {
      const p = seg.exigirProfessor(s);
      if ('nome' in corpo) {
        const n = texto(corpo.nome, 80);
        if (n.length < 3) falha(400, 'invalid-argument', 'Informe seu nome.');
        p.nome = n;
      }
      if ('escola' in corpo) p.escola = texto(corpo.escola, 80);
      if ('foto' in corpo) p.foto = validarFoto(corpo.foto);
      // o nome do professor aparece no cadastro dos alunos: atualiza as turmas dele
      Object.entries(banco.dados.turmas).forEach(([id, t]) => {
        if (t.professorUid === s.uid && t.professorNome !== p.nome) {
          t.professorNome = p.nome;
          banco.dados.codigos[t.codigo].professorNome = p.nome;
          banco.alterar('turmas', id);
        }
      });
      banco.alterar('professores', s.uid);
      return { sessao: seg.infoSessao(s.uid) };
    },
    { limite: cfg.LIMITE_CORPO_FOTO }
  );
};
