/* Rotas de professores: cadastro, login e "Minha conta" (nome, escola e foto). */
'use strict';
const banco = require('../banco');
const { falha } = require('../erros');
const { agora, novoId, texto, emailValido, validarFoto } = require('../util');
const seg = require('../seguranca');

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
    banco.gravar();
    return { token: seg.criarSessao(uid), sessao: seg.infoSessao(uid) };
  });

  rota('POST', '/api/login/professor', ({ corpo, ip }) => {
    seg.falhasDeLogin.verificar(ip);
    const conta = banco.dados.contas[texto(corpo.email, 120).toLowerCase()];
    if (!conta || conta.papel !== 'professor' || !seg.senhaConfere(conta, corpo.senha)) {
      seg.falhasDeLogin.somar(ip);
      falha(401, 'auth/invalid-credential', 'E-mail ou senha incorretos.');
    }
    return { token: seg.criarSessao(conta.uid), sessao: seg.infoSessao(conta.uid) };
  });

  // Minha conta: o professor altera nome, escola e foto
  rota('PATCH', '/api/professores/eu', ({ s, corpo }) => {
    const p = seg.exigirProfessor(s);
    if ('nome' in corpo) {
      const n = texto(corpo.nome, 80);
      if (n.length < 3) falha(400, 'invalid-argument', 'Informe seu nome.');
      p.nome = n;
    }
    if ('escola' in corpo) p.escola = texto(corpo.escola, 80);
    if ('foto' in corpo) p.foto = validarFoto(corpo.foto);
    // o nome do professor aparece no cadastro dos alunos: atualiza as turmas dele
    Object.entries(banco.dados.turmas).forEach(([, t]) => {
      if (t.professorUid === s.uid) {
        t.professorNome = p.nome;
        banco.dados.codigos[t.codigo].professorNome = p.nome;
      }
    });
    banco.gravar();
    return { sessao: seg.infoSessao(s.uid) };
  });
};
