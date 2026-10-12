/* Rotas do aluno: cadastro, login, perfil, foto, eventos de pesquisa e ranking da turma. */
'use strict';
const banco = require('../banco');
const { falha } = require('../erros');
const {
  agora,
  novoId,
  texto,
  normalizarCodigo,
  normalizarUsuario,
  usuarioValido,
  emailAluno,
  nivelDe,
  validarFoto
} = require('../util');
const seg = require('../seguranca');

// Campos do perfil que o aluno não pode alterar pelo PUT /api/perfil
const CAMPOS_FIXOS = [
  'uid',
  'papel',
  'usuario',
  'apelido',
  'turmaId',
  'turma',
  'codigoTurma',
  'professorUid',
  'codigoPesquisa',
  'criadoEm'
];

/** Cor e especialidade vêm do navegador; a foto só muda pela rota própria. */
function avatarSeguro(novo, fotoAtual) {
  const a = novo && typeof novo === 'object' ? novo : {};
  return { cor: texto(a.cor, 20) || '#6B3FD6', classe: texto(a.classe, 20) || 'frontend', foto: fotoAtual || null };
}
const fotosPermitidas = aluno => !!(banco.dados.turmas[aluno.turmaId] || {}).fotos;

module.exports = function registrar(rota) {
  rota('POST', '/api/alunos', ({ corpo, ip }) => {
    seg.cadastros.verificar(ip);
    seg.cadastros.somar(ip);
    const d = banco.dados;
    const codigo = normalizarCodigo(corpo.codigoTurma),
      usuario = normalizarUsuario(corpo.usuario),
      senha = String(corpo.senha || '');
    const cod = d.codigos[codigo];
    if (!cod) falha(404, 'not-found', 'Turma não encontrada. Confira o código com seu professor.');
    if (!cod.ativa)
      falha(403, 'permission-denied', 'Esta turma não está aceitando novos cadastros. Fale com seu professor.');
    if (!usuarioValido(usuario))
      falha(400, 'invalid-argument', 'O usuário deve ter de 3 a 20 caracteres: letras sem acento, números ou _.');
    if (senha.length < 6) falha(400, 'auth/weak-password', 'A senha precisa ter pelo menos 6 caracteres.');
    const email = emailAluno(codigo, usuario);
    if (d.contas[email])
      falha(409, 'auth/email-already-in-use', 'Este nome de usuário já existe nesta turma. Escolha outro.');
    const p = corpo.perfil || {};
    const apelido = texto(p.apelido, 16);
    if (apelido.length < 3) falha(400, 'invalid-argument', 'O apelido precisa ter pelo menos 3 letras.');
    const codigoPesquisa = cod.pesquisa ? texto(p.codigoPesquisa, 3).toUpperCase() : null;
    if (cod.pesquisa && !/^P[0-9]{2}$/.test(codigoPesquisa))
      falha(400, 'invalid-argument', 'Digite o código de participante no formato P07.');
    const foto = cod.fotos ? validarFoto(p.avatar && p.avatar.foto) : null;
    const uid = novoId('aluno');
    d.contas[email] = { uid, papel: 'aluno', ...seg.protegerSenha(senha) };
    d.users[uid] = {
      ...p,
      uid,
      papel: 'aluno',
      usuario,
      apelido,
      codigoPesquisa,
      avatar: avatarSeguro(p.avatar, foto),
      turmaId: cod.turmaId,
      turma: cod.nome,
      codigoTurma: codigo,
      professorUid: cod.professorUid,
      criadoEm: agora()
    };
    banco.gravar();
    return { token: seg.criarSessao(uid), sessao: seg.infoSessao(uid) };
  });

  rota('POST', '/api/login/aluno', ({ corpo, ip }) => {
    seg.falhasDeLogin.verificar(ip);
    const conta = banco.dados.contas[emailAluno(corpo.codigoTurma, corpo.usuario)];
    if (!conta || conta.papel !== 'aluno' || !seg.senhaConfere(conta, corpo.senha)) {
      seg.falhasDeLogin.somar(ip);
      falha(401, 'auth/invalid-credential', 'Código da turma, usuário ou senha incorretos.');
    }
    return { token: seg.criarSessao(conta.uid), sessao: seg.infoSessao(conta.uid) };
  });

  rota('GET', '/api/perfil', ({ s }) => {
    const a = seg.exigirAluno(s);
    return { perfil: { ...a, fotosPermitidas: fotosPermitidas(a) } };
  });

  // Salva o progresso. Campos fixos e a foto são preservados do que já está guardado.
  rota('PUT', '/api/perfil', ({ s, corpo }) => {
    const atual = seg.exigirAluno(s);
    const novo =
      corpo.perfil && typeof corpo.perfil === 'object'
        ? corpo.perfil
        : falha(400, 'invalid-argument', 'Perfil inválido.');
    CAMPOS_FIXOS.forEach(k => {
      novo[k] = atual[k];
    });
    novo.avatar = avatarSeguro(novo.avatar, atual.avatar && atual.avatar.foto);
    delete novo.fotosPermitidas;
    novo.ultimoAcesso = agora();
    banco.dados.users[s.uid] = novo;
    banco.gravar();
    return { ok: true };
  });

  // Foto do personagem: só quando o professor permite fotos na turma (remover é sempre permitido)
  rota('PUT', '/api/perfil/foto', ({ s, corpo }) => {
    const a = seg.exigirAluno(s);
    const foto = validarFoto(corpo.foto);
    if (foto && !fotosPermitidas(a)) falha(403, 'permission-denied', 'Seu professor não liberou fotos nesta turma.');
    a.avatar = { ...(a.avatar || {}), foto };
    banco.gravar();
    return { foto };
  });

  rota('POST', '/api/eventos', ({ s, corpo }) => {
    const a = seg.exigirAluno(s);
    const e =
      corpo.evento && typeof corpo.evento === 'object'
        ? corpo.evento
        : falha(400, 'invalid-argument', 'Evento inválido.');
    if (!['desafio', 'licao', 'missao'].includes(e.tipo)) falha(400, 'invalid-argument', 'Tipo de evento inválido.');
    banco.dados.eventos.push({
      ...e,
      uid: s.uid,
      usuario: a.usuario,
      codigoPesquisa: a.codigoPesquisa || null,
      turmaId: a.turmaId,
      turma: a.turma,
      professorUid: a.professorUid,
      recebidoEm: agora()
    });
    banco.gravar();
    return { ok: true };
  });

  rota('GET', '/api/ranking', ({ s }) => {
    const a = seg.exigirAluno(s);
    const lista = Object.values(banco.dados.users)
      .filter(u => u.turmaId === a.turmaId)
      .map(u => ({
        uid: u.uid,
        apelido: u.apelido,
        xp: u.xp || 0,
        nivel: nivelDe(u.xp || 0),
        avatar: u.avatar,
        missoes: Object.keys(u.missoes || {}).length
      }));
    return { ranking: lista.sort((x, y) => y.xp - x.xp) };
  });
};
