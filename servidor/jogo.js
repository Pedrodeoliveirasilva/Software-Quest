/* =================================================================
   Regras do jogo no servidor
   Lê o conteúdo do próprio site (config.js, missoes.js, trilha.js e mapa.js),
   para que o servidor e o navegador usem sempre as mesmas missões, lições e
   pontuação. Com isso o servidor consegue:
   - limpar o progresso enviado pelo aluno (PUT /api/perfil), recalculando o XP;
   - validar cada evento de pesquisa (POST /api/eventos), recalculando os campos
     que podem ser deduzidos (pontos, acerto de primeira, estrelas).
   Se um professor editar missoes.js ou trilha.js, basta reiniciar o servidor.
   ================================================================= */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const cfgServidor = require('./config');
const { falha } = require('./erros');

/* ---------- carrega os dados do site ---------- */
function carregarSite() {
  const contexto = {};
  contexto.window = contexto;
  vm.createContext(contexto);
  for (const arquivo of ['config.js', 'models/dados/missoes.js', 'models/dados/trilha.js', 'models/dados/mapa.js']) {
    const caminho = path.join(cfgServidor.PUBLICO, 'js', arquivo);
    vm.runInContext(fs.readFileSync(caminho, 'utf8'), contexto, { filename: caminho });
  }
  // Cópia em JSON: os objetos passam a ser comuns do Node (e não do contexto isolado)
  return JSON.parse(JSON.stringify({ config: contexto.SQ.config, dados: contexto.SQ.dados }));
}

const SQ = carregarSite();
const CFG = SQ.config;
const MISSOES = SQ.dados.missoes;
const TRILHA = SQ.dados.trilha;
const MAPA = SQ.dados.mapa;

// Desafio extra que a missão de manutenção ganha quando houve requisitos classificados errado
const DESAFIO_CONSEQUENCIA = { id: 'man-consequencia', tipo: 'escolha' };

const missaoPorId = id => MISSOES.find(m => m.id === id);
const indiceDaMissao = id => MISSOES.findIndex(m => m.id === id);
const moduloDaFase = fase => TRILHA.find(t => t.fase === fase);
const temConsequencia = m => m.id === 'manutencao';
const desafiosDa = m => (temConsequencia(m) ? m.desafios.concat([DESAFIO_CONSEQUENCIA]) : m.desafios);
const pontosPara = tentativas => CFG.pontosPorTentativa[tentativas - 1] || 0;
const PONTOS_PRIMEIRA = pontosPara(1);
const PONTOS_DEPOIS = pontosPara(2);
const xpDaLicao = acertouPrimeira => CFG.xpLicao + (acertouPrimeira ? CFG.xpVerificacao : 0);

// Textos dos pedidos que podem voltar como defeito na manutenção (desafio com rastrearErros)
const TEXTOS_REQUISITOS = new Set(
  MISSOES.flatMap(m => m.desafios.filter(d => d.rastrearErros).flatMap(d => (d.itens || []).map(i => i.texto)))
);

/** Maior XP possível: todos os desafios na primeira tentativa e todas as lições com acerto de primeira. */
const XP_MAXIMO =
  MISSOES.reduce((s, m) => s + desafiosDa(m).length * PONTOS_PRIMEIRA, 0) +
  TRILHA.reduce((s, t) => s + t.licoes.length * xpDaLicao(true), 0);

/* ---------- conversões seguras ---------- */
const inteiro = (v, min, max, padrao = min) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : padrao;
};
const inteiroExato = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;
const objeto = v => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
const UM_DIA_MS = 24 * 3600 * 1000;
/** Data ISO válida (ou null). Datas no futuro, além de um dia de folga para relógios errados, são descartadas. */
function dataIso(v) {
  if (typeof v !== 'string' || v.length > 40) return null;
  const t = Date.parse(v);
  if (!Number.isFinite(t) || t > Date.now() + UM_DIA_MS) return null;
  return new Date(t).toISOString();
}
const estrelasPara = (acertos, total) => {
  const taxa = total ? acertos / total : 0;
  return taxa >= 0.9 ? 3 : taxa >= 0.6 ? 2 : 1;
};
/** Total de desafios que a missão teve para este aluno (a manutenção pode ter um a mais). */
const totalDesafios = (m, temErrosReq) => m.desafios.length + (temConsequencia(m) && temErrosReq ? 1 : 0);

/** Faixa de pontos coerente com o número de acertos de primeira. */
function limitarPontos(pontos, acertos, total) {
  const min = acertos * PONTOS_PRIMEIRA;
  const max = min + (total - acertos) * PONTOS_DEPOIS;
  return inteiro(pontos, min, max);
}

/* ---------- avatar ---------- */
const COR_PADRAO = '#6B3FD6';
const CLASSES = ['frontend', 'backend', 'qa', 'devops'];
/** Cor (#RRGGBB) e especialidade (uma das classes do jogo). A foto só muda pela rota própria. */
function avatarSeguro(novo, fotoAtual) {
  const a = objeto(novo);
  const cor = typeof a.cor === 'string' && /^#[0-9a-fA-F]{6}$/.test(a.cor) ? a.cor : COR_PADRAO;
  const classe = CLASSES.includes(a.classe) ? a.classe : CLASSES[0];
  return { cor, classe, foto: fotoAtual || null };
}

/* ---------- progresso do aluno ---------- */

/**
 * Limpa o progresso enviado pelo navegador. Só passam os campos conhecidos, com valores
 * coerentes com as missões e lições existentes, e o XP é recalculado a partir deles
 * (o navegador soma exatamente: melhor pontuação de cada missão + XP das lições).
 */
function progressoSeguro(p) {
  p = objeto(p);

  // Pedidos classificados errado na primeira missão (só textos que existem no jogo)
  const requisitosErrados = (Array.isArray(p.requisitosErrados) ? p.requisitosErrados : [])
    .filter(t => TEXTOS_REQUISITOS.has(t))
    .slice(0, 20);

  // Missões: na ordem do jogo, cada uma só vale se a anterior também estiver concluída
  const recebidas = objeto(p.missoes);
  const missoes = {};
  for (const m of MISSOES) {
    if (!Object.hasOwn(recebidas, m.id)) break;
    const r = objeto(recebidas[m.id]);
    const total = totalDesafios(m, requisitosErrados.length > 0);
    const acertosPrimeira = inteiro(r.acertosPrimeira, 0, total);
    missoes[m.id] = {
      pontos: limitarPontos(r.pontos, acertosPrimeira, total),
      estrelas: estrelasPara(acertosPrimeira, total),
      acertosPrimeira,
      total,
      tempoSegundos: inteiro(r.tempoSegundos, 0, UM_DIA_MS / 1000),
      concluidaEm: dataIso(r.concluidaEm),
      vezes: inteiro(r.vezes, 1, 100000, 1)
    };
  }

  // Lições: só as que existem; as de aprofundamento exigem a missão do tema
  const recebidasL = objeto(p.licoes);
  const licoes = {};
  for (const mod of TRILHA)
    for (const l of mod.licoes) {
      if (!Object.hasOwn(recebidasL, l.id)) continue;
      if (l.aprofundamento && !missoes[mod.fase]) continue;
      const r = objeto(recebidasL[l.id]);
      licoes[l.id] = { concluidaEm: dataIso(r.concluidaEm), acertouPrimeira: r.acertouPrimeira === true };
    }

  const xp =
    Object.values(missoes).reduce((s, r) => s + r.pontos, 0) +
    Object.values(licoes).reduce((s, r) => s + xpDaLicao(r.acertouPrimeira), 0);

  // Posição no mapa: dentro dos limites do escritório
  const pos = objeto(p.posicao);
  const altura = MAPA.linhas.length,
    largura = MAPA.linhas[0].length;
  const posicao =
    inteiroExato(pos.x, 0, largura - 1) && inteiroExato(pos.y, 0, altura - 1) ? { x: pos.x, y: pos.y } : null;

  return {
    xp,
    qualidade: inteiro(p.qualidade, 0, 100, 100),
    licoes,
    missoes,
    itens: MISSOES.filter(m => missoes[m.id] && Array.isArray(p.itens) && p.itens.includes(m.id)).map(m => m.id),
    requisitosErrados,
    posicao,
    boasVindas: p.boasVindas === true,
    aceiteTermosEm: dataIso(p.aceiteTermosEm)
  };
}

/* ---------- eventos de pesquisa ---------- */
const invalido = msg => falha(400, 'invalid-argument', 'Evento inválido: ' + msg);

/** Data informada pelo navegador, se for plausível (até um dia de diferença); senão, a do servidor. */
function dataDoEvento(v) {
  const d = dataIso(v);
  return d && Math.abs(Date.parse(d) - Date.now()) <= UM_DIA_MS ? d : new Date().toISOString();
}

/** A missão está liberada para o aluno? (a anterior concluída no perfil ou registrada nos eventos) */
function missaoLiberada(m, aluno, missoesComEvento) {
  const i = indiceDaMissao(m.id);
  if (i === 0) return true;
  const anterior = MISSOES[i - 1].id;
  return !!(aluno.missoes && aluno.missoes[anterior]) || missoesComEvento.has(anterior);
}

/**
 * Valida um evento enviado pelo navegador e devolve só os campos aceitos.
 * Campos que podem ser deduzidos (nome da fase, tipo do desafio, pontos, acerto de primeira,
 * estrelas) são recalculados aqui. O campo "repeticao" é definido por quem chama, com base
 * nos eventos já guardados, e nunca vem do navegador.
 * aluno: perfil guardado no servidor; missoesComEvento: Set das missões já concluídas nos eventos.
 */
function eventoSeguro(e, aluno, missoesComEvento) {
  e = objeto(e);
  const m = missaoPorId(e.faseId);
  if (!m) invalido('fase desconhecida.');
  const comum = { faseId: m.id, fase: m.nome, dataHora: dataDoEvento(e.dataHora) };
  const tempoSegundos = inteiro(e.tempoSegundos, 0, UM_DIA_MS / 1000);

  if (e.tipo === 'desafio') {
    const d = desafiosDa(m).find(x => x.id === e.desafioId);
    if (!d) invalido('desafio desconhecido.');
    if (!missaoLiberada(m, aluno, missoesComEvento)) invalido('a missão ainda não foi liberada.');
    if (!inteiroExato(e.tentativas, 1, CFG.maxTentativas)) invalido('número de tentativas.');
    if (typeof e.acertou !== 'boolean') invalido('campo "acertou".');
    // Quem erra usa todas as tentativas; quem acerta pode ter usado qualquer número delas
    if (!e.acertou && e.tentativas !== CFG.maxTentativas) invalido('tentativas incoerentes com o erro.');
    return {
      tipo: 'desafio',
      ...comum,
      desafioId: d.id,
      tipoDesafio: d.tipo,
      tentativas: e.tentativas,
      acertou: e.acertou,
      acertouPrimeira: e.acertou && e.tentativas === 1,
      pontos: e.acertou ? pontosPara(e.tentativas) : 0,
      tempoSegundos
    };
  }

  if (e.tipo === 'licao') {
    const mod = moduloDaFase(m.id);
    const l = mod && mod.licoes.find(x => x.id === e.licaoId);
    if (!l) invalido('lição desconhecida.');
    const missaoFeita = !!(aluno.missoes && aluno.missoes[m.id]) || missoesComEvento.has(m.id);
    if (l.aprofundamento && !missaoFeita) invalido('a lição de aprofundamento ainda não foi liberada.');
    if (!inteiroExato(e.tentativas, 1, 100)) invalido('número de tentativas.');
    const acertouPrimeira = e.tentativas === 1;
    return {
      tipo: 'licao',
      ...comum,
      licaoId: l.id,
      tentativas: e.tentativas,
      acertou: true,
      acertouPrimeira,
      pontos: xpDaLicao(acertouPrimeira),
      tempoSegundos
    };
  }

  if (e.tipo === 'missao') {
    if (!missaoLiberada(m, aluno, missoesComEvento)) invalido('a missão ainda não foi liberada.');
    const total = totalDesafios(m, !!(aluno.requisitosErrados && aluno.requisitosErrados.length));
    if (!inteiroExato(e.acertosPrimeira, 0, total)) invalido('acertos de primeira.');
    return {
      tipo: 'missao',
      ...comum,
      pontos: limitarPontos(e.pontos, e.acertosPrimeira, total),
      estrelas: estrelasPara(e.acertosPrimeira, total),
      acertosPrimeira: e.acertosPrimeira,
      tentativas: null,
      tempoSegundos
    };
  }

  return invalido('tipo desconhecido.');
}

/** Chave usada para saber se um evento é repetição (mesmo aluno, mesmo desafio, lição ou missão). */
function chaveDoEvento(e) {
  if (e.tipo === 'desafio') return 'd|' + e.desafioId;
  if (e.tipo === 'licao') return 'l|' + e.licaoId;
  return 'm|' + e.faseId;
}

module.exports = {
  XP_MAXIMO,
  avatarSeguro,
  progressoSeguro,
  eventoSeguro,
  chaveDoEvento,
  nivelDe(xp) {
    let nome = CFG.niveis[0].nome;
    for (const n of CFG.niveis) if (xp >= n.xp) nome = n.nome;
    return nome;
  }
};
