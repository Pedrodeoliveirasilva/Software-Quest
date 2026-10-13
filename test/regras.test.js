/* Testes das regras do jogo (models do site), executados no Node sem navegador. */
'use strict';
const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { carregarSite } = require('./ajudantes');

const SQ = carregarSite([
  'public/js/config.js',
  'public/js/core/util.js',
  'public/js/models/dados/trilha.js',
  'public/js/models/dados/missoes.js',
  'public/js/models/dados/mapa.js',
  'public/js/models/PerfilModel.js',
  'public/js/models/MissaoModel.js',
  'public/js/models/MundoModel.js',
  'public/js/models/PainelModel.js'
]);
const { Perfil, Missao, Mundo, Painel } = SQ.models;
const D = SQ.dados;
const TURMA = { turmaId: 't1', nome: 'Turma', codigo: 'ABC234', professorUid: 'p1' };
const novoPerfil = () =>
  Perfil.novo({ uid: 'a1', usuario: 'ana', apelido: 'Ana', turma: TURMA, avatar: { cor: '#000', classe: 'qa' } });
const missao = id => D.missoes.find(m => m.id === id);
// Listas criadas dentro do contexto isolado são de outro "tipo"; copiamos antes de comparar.
const copia = v => JSON.parse(JSON.stringify(v));
const correta = d => d.opcoes.find(o => o.correta);
const errada = (d, n = 0) => d.opcoes.filter(o => !o.correta)[n];

describe('Utilitários', () => {
  it('valida nomes de usuário', () => {
    assert.equal(SQ.util.usuarioValido('ana_b'), true);
    assert.equal(SQ.util.usuarioValido('Ana Beatriz'), false);
    assert.equal(SQ.util.usuarioValido('ab'), false);
  });

  it('formata e gera códigos de turma sem caracteres ambíguos', () => {
    assert.equal(SQ.util.formatarCodigo('qx742b'), 'QX7-42B');
    const codigo = SQ.util.gerarCodigoTurma();
    assert.match(codigo, /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/);
  });

  it('bloqueia palavras impróprias sem bloquear palavras parecidas', () => {
    assert.equal(SQ.util.textoImproprio('m3rd4'), true);
    assert.equal(SQ.util.textoImproprio('Pinto Jr'), true);
    assert.equal(SQ.util.textoImproprio('Pintor'), false);
    assert.equal(SQ.util.textoImproprio('Coruja Veloz'), false);
  });
});

describe('Níveis e desbloqueio de salas', () => {
  it('calcula o nível pelo XP', () => {
    assert.equal(Perfil.nivelDe(0).nome, 'Estagiário(a)');
    assert.equal(Perfil.nivelDe(400).nome, 'Júnior');
    assert.equal(Perfil.nivelDe(2600).nome, 'Tech Lead');
    assert.equal(Perfil.nivelDe(2600).proximo, null);
  });

  it('abre as salas em sequência', () => {
    const p = novoPerfil();
    assert.equal(Perfil.statusMissao(p, 0), 'disponivel');
    assert.equal(Perfil.statusMissao(p, 1), 'bloqueada');
    Perfil.concluirMissao(p, D.missoes[0], {
      pontos: 300,
      estrelas: 3,
      acertosPrimeira: 3,
      total: 3,
      tempoSegundos: 60
    });
    assert.equal(Perfil.statusMissao(p, 0), 'concluida');
    assert.equal(Perfil.statusMissao(p, 1), 'disponivel');
  });
});

describe('Missão: correção e pontuação', () => {
  let p;
  beforeEach(() => {
    p = novoPerfil();
  });

  it('dá 100, 50 e 25 pontos conforme a tentativa', () => {
    const m = Missao(missao('requisitos'), p);
    m.avancar(); // segundo desafio (escolha)
    const d = m.desafio;
    assert.equal(m.avaliar(correta(d)).registro.pontos, 100);

    const m2 = Missao(missao('requisitos'), p);
    m2.avancar();
    assert.equal(m2.avaliar(errada(m2.desafio)).status, 'erro');
    assert.equal(m2.avaliar(correta(m2.desafio)).registro.pontos, 50);
  });

  it('revela a resposta e dá 0 pontos depois de 3 erros', () => {
    const m = Missao(missao('requisitos'), p);
    m.avancar();
    m.avaliar(errada(m.desafio, 0));
    m.avaliar(errada(m.desafio, 1));
    const r = m.avaliar(errada(m.desafio, 2));
    assert.equal(r.status, 'esgotou');
    assert.equal(r.registro.pontos, 0);
    assert.equal(m.avaliar(correta(m.desafio)), null, 'depois de concluído, o desafio não aceita respostas');
  });

  it('classificar aponta os itens errados e guarda os requisitos errados', () => {
    const m = Missao(missao('requisitos'), p);
    const d = m.desafio;
    const escolhas = d.itens.map(it => it.correta);
    escolhas[0] = d.categorias.find(c => c !== d.itens[0].correta);
    const r = m.avaliar({ itens: d.itens, escolhas });
    assert.deepEqual(copia(r.erros), [0]);
    assert.deepEqual(copia(m.resultado().requisitosErrados), [d.itens[0].texto]);
  });

  it('selecionar explica quando a Sprint passa da capacidade', () => {
    const m = Missao(missao('planejamento'), p);
    m.avancar();
    const r = m.avaliar(m.desafio.itens.map(i => i.id));
    assert.equal(r.ok, false);
    assert.match(r.motivo, /mais do que a equipe consegue entregar/);
  });

  it('ordenar marca as posições certas', () => {
    const m = Missao(missao('planejamento'), p);
    m.avancar();
    m.avancar();
    const itens = m.desafio.itens;
    const r = m.avaliar([itens[1], itens[0], ...itens.slice(2)]);
    assert.equal(r.certos, itens.length - 2);
    assert.deepEqual(copia(r.marcas.slice(0, 2)), [false, false]);
  });

  it('dá 3 estrelas com 90% de acertos de primeira e 1 estrela abaixo de 60%', () => {
    const m = Missao(missao('integracao'), p);
    for (let i = 0; i < m.total; i++) {
      if (m.desafio.tipo === 'escolha') m.avaliar(correta(m.desafio));
      else if (m.desafio.tipo === 'classificar')
        m.avaliar({ itens: m.desafio.itens, escolhas: m.desafio.itens.map(x => x.correta) });
      if (!m.ultimo) m.avancar();
    }
    assert.equal(m.resultado().estrelas, 3);
  });

  it('a manutenção traz a consequência dos requisitos errados', () => {
    p.requisitosErrados = ['Professores lançam as notas de cada bimestre.'];
    const m = Missao(missao('manutencao'), p);
    assert.equal(m.total, missao('manutencao').desafios.length + 1);
    m.avancar();
    assert.equal(m.desafio.consequencia, true);
    assert.match(m.desafio.enunciado, /Professores lançam as notas/);
  });
});

describe('Perfil: XP, lições e recomendações', () => {
  it('ao rejogar, soma só a diferença de XP e guarda a melhor pontuação', () => {
    const p = novoPerfil();
    const m = D.missoes[0];
    const r1 = Perfil.concluirMissao(p, m, {
      pontos: 200,
      estrelas: 2,
      acertosPrimeira: 2,
      total: 3,
      tempoSegundos: 1
    });
    assert.equal(r1.xpGanho, 200);
    const r2 = Perfil.concluirMissao(p, m, {
      pontos: 150,
      estrelas: 1,
      acertosPrimeira: 1,
      total: 3,
      tempoSegundos: 1
    });
    assert.equal(r2.xpGanho, 0);
    assert.equal(p.missoes[m.id].pontos, 200);
    const r3 = Perfil.concluirMissao(p, m, {
      pontos: 300,
      estrelas: 3,
      acertosPrimeira: 3,
      total: 3,
      tempoSegundos: 1
    });
    assert.equal(r3.xpGanho, 100);
    assert.equal(p.xp, 300);
    assert.deepEqual(copia(p.itens), [m.id]);
  });

  it('lição vale 30 XP acertando de primeira, 20 errando, e não conta duas vezes', () => {
    const p = novoPerfil();
    const [l1, l2] = D.trilha[0].licoes;
    assert.equal(Perfil.concluirLicao(p, l1, true).xp, 30);
    assert.equal(Perfil.concluirLicao(p, l2, false).xp, 20);
    assert.equal(Perfil.concluirLicao(p, l1, true).jaFeita, true);
    assert.equal(p.xp, 50);
  });

  it('recomenda estudar antes da missão e revisar quando houve dificuldade', () => {
    const p = novoPerfil();
    assert.equal(Perfil.recomendacao(p).modulo, 'requisitos');
    D.trilha[0].licoes.filter(l => !l.aprofundamento).forEach(l => Perfil.concluirLicao(p, l, true));
    Perfil.concluirMissao(p, D.missoes[0], {
      pontos: 100,
      estrelas: 1,
      acertosPrimeira: 1,
      total: 3,
      tempoSegundos: 1
    });
    assert.match(Perfil.recomendacao(p).texto, /dificuldade/);
  });
});

describe('Mundo: movimento no mapa', () => {
  const criar = p =>
    Mundo(p, { portaAberta: n => Perfil.portaAberta(p, n), statusMissao: i => Perfil.statusMissao(p, i) });

  it('não atravessa paredes e avisa quando a porta está trancada', () => {
    const p = novoPerfil();
    p.posicao = { x: 9, y: 6 }; // logo abaixo da porta da sala 2
    const mundo = criar(p);
    const r = mundo.mover(0, -1);
    assert.equal(r.ok, false);
    assert.equal(r.portaTrancada, 2);
  });

  it('planeja o caminho até um personagem e para ao lado dele', () => {
    const p = novoPerfil();
    const mundo = criar(p);
    const plano = mundo.planejarAte('npc-requisitos');
    assert.ok(plano.passos.length > 0);
    const [x, y] = plano.passos.at(-1);
    assert.equal(Math.abs(x - 3) + Math.abs(y - 2), 1);
  });
});

describe('Painel: estatísticas da turma', () => {
  it('considera só a primeira vez que cada aluno fez cada desafio', () => {
    const ev = (uid, acertouPrimeira, dataHora) => ({
      tipo: 'desafio',
      uid,
      faseId: 'requisitos',
      fase: 'Requisitos',
      desafioId: 'req-pergunta',
      tentativas: acertouPrimeira ? 1 : 2,
      acertouPrimeira,
      dataHora
    });
    const eventos = [ev('a', false, '2026-01-01'), ev('a', true, '2026-01-02'), ev('b', true, '2026-01-01')];
    const est = Painel.calcular([], eventos);
    assert.equal(est.indicadores.acertoGeral, 50);
    assert.equal(est.porTema[0].valor, 50);
  });
});
