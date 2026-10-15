/* Testes das regras do jogo no servidor (servidor/jogo.js): elas precisam concordar com as do site,
   para que um aluno que joga normalmente nunca perca progresso nem tenha eventos recusados. */
'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { carregarSite, RAIZ } = require('./ajudantes');
const jogo = require('../servidor/jogo');

const SQ = carregarSite([
  'public/js/config.js',
  'public/js/core/util.js',
  'public/js/models/dados/trilha.js',
  'public/js/models/dados/missoes.js',
  'public/js/models/dados/mapa.js',
  'public/js/models/PerfilModel.js',
  'public/js/models/MissaoModel.js'
]);
const { Perfil, Missao } = SQ.models;
const D = SQ.dados;
const cfg = SQ.config;
const TURMA = { turmaId: 't1', nome: 'Turma', codigo: 'ABC234', professorUid: 'p1' };
const copia = v => JSON.parse(JSON.stringify(v));
const novoPerfil = () =>
  Perfil.novo({ uid: 'a1', usuario: 'ana', apelido: 'Ana', turma: TURMA, avatar: { cor: '#2C6FD1', classe: 'qa' } });

/** Gerador de números pseudoaleatórios com semente, para o teste ser sempre igual. */
function aleatorio(semente) {
  return () => {
    semente = (semente * 1103515245 + 12345) % 2147483648;
    return semente / 2147483648;
  };
}

/** Joga o jogo inteiro "no papel": resultados variados em cada missão, lições e repetições. */
function jogarTudo(sorte) {
  const p = novoPerfil();
  const requisitos = D.missoes[0].desafios.find(d => d.rastrearErros);
  p.requisitosErrados = [requisitos.itens[0].texto];
  for (let vez = 0; vez < 2; vez++)
    for (const m of D.missoes) {
      const total = m.desafios.length + (m.id === 'manutencao' ? 1 : 0);
      let pontos = 0,
        acertos = 0;
      for (let i = 0; i < total; i++) {
        const tentativas = 1 + Math.floor(sorte() * 4); // 4 = errou as três
        if (tentativas === 1) acertos++;
        pontos += cfg.pontosPorTentativa[tentativas - 1] || 0;
      }
      const taxa = acertos / total;
      Perfil.concluirMissao(p, m, {
        pontos,
        acertosPrimeira: acertos,
        total,
        estrelas: taxa >= 0.9 ? 3 : taxa >= 0.6 ? 2 : 1,
        tempoSegundos: 90
      });
      for (const l of D.trilha.find(t => t.fase === m.id).licoes) Perfil.concluirLicao(p, l, sorte() < 0.5);
    }
  p.posicao = { x: 3, y: 2 };
  p.boasVindas = true;
  return copia(p);
}

describe('Regras do jogo no servidor', () => {
  it('o XP máximo é a soma de todos os desafios de primeira e de todas as lições', () => {
    const desafios = D.missoes.reduce((s, m) => s + m.desafios.length, 0) + 1; // +1: consequência na manutenção
    const licoes = D.trilha.reduce((s, t) => s + t.licoes.length, 0);
    assert.equal(jogo.XP_MAXIMO, desafios * cfg.pontosPorTentativa[0] + licoes * (cfg.xpLicao + cfg.xpVerificacao));
  });

  it('quem joga normalmente mantém todo o progresso e o mesmo XP depois da limpeza do servidor', () => {
    for (let semente = 1; semente <= 20; semente++) {
      const p = jogarTudo(aleatorio(semente));
      const limpo = jogo.progressoSeguro(p);
      assert.equal(limpo.xp, p.xp, 'semente ' + semente);
      assert.deepEqual(limpo.missoes, p.missoes, 'semente ' + semente);
      assert.deepEqual(limpo.licoes, p.licoes);
      assert.deepEqual(limpo.itens, p.itens);
      assert.deepEqual(limpo.requisitosErrados, p.requisitosErrados);
      assert.deepEqual(limpo.posicao, p.posicao);
      assert.ok(limpo.xp <= jogo.XP_MAXIMO);
    }
  });

  it('os eventos gerados pelo site são aceitos com os mesmos valores', () => {
    const p = novoPerfil();
    const m = Missao(
      D.missoes.find(x => x.id === 'requisitos'),
      p
    );
    m.avancar(); // desafio de escolha
    const d = m.desafio;
    m.avaliar(d.opcoes.find(o => !o.correta));
    const registro = copia(m.avaliar(d.opcoes.find(o => o.correta)).registro);
    const aceito = jogo.eventoSeguro(registro, p, new Set());
    for (const campo of ['faseId', 'fase', 'desafioId', 'tipoDesafio', 'tentativas', 'acertou', 'acertouPrimeira'])
      assert.equal(aceito[campo], registro[campo], campo);
    assert.equal(aceito.pontos, registro.pontos);
  });

  it('a especialidade e a cor do avatar só aceitam valores do jogo', () => {
    assert.deepEqual(jogo.avatarSeguro({ cor: '#0C8F7C', classe: 'devops' }, null), {
      cor: '#0C8F7C',
      classe: 'devops',
      foto: null
    });
    assert.deepEqual(jogo.avatarSeguro({ cor: 'url(//x)', classe: '__proto__' }, null), {
      cor: '#6B3FD6',
      classe: 'frontend',
      foto: null
    });
    // As cores e especialidades oferecidas no cadastro são todas aceitas
    for (const cor of SQ.util.coresAvatar) assert.equal(jogo.avatarSeguro({ cor }).cor, cor);
    for (const classe of Object.keys(SQ.util.classes)) assert.equal(jogo.avatarSeguro({ classe }).classe, classe);
  });

  it('regras do Firebase acompanham a pontuação de public/js/config.js', () => {
    const regras = fs.readFileSync(path.join(RAIZ, 'firestore.rules'), 'utf8');
    const p = cfg.pontosPorTentativa;
    assert.ok(regras.includes(`return [${p.join(', ')}];`), 'pontosPorTentativa()');
    assert.ok(regras.includes(`acertouPrimeira ? ${cfg.xpLicao + cfg.xpVerificacao} : ${cfg.xpLicao};`), 'xpLicao()');
    assert.ok(regras.includes(`return ${jogo.XP_MAXIMO};`), 'xpMaximo() deve ser ' + jogo.XP_MAXIMO);
    assert.ok(regras.includes(`e.tentativas <= ${cfg.maxTentativas}`), 'maxTentativas');
  });
});
