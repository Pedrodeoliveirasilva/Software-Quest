/* =================================================================
   DADOS DO MAPA — o escritório da DevNova (editável)
   Legenda:
     #  parede          .  chão            1–7  portas das salas (abrem em sequência)
     8  porta da copa (sempre aberta)     T  mesa   C  mesa com computador
     S  servidor        P  planta          R  mural do ranking   B  biblioteca (trilha)
   ================================================================= */
window.SQ = window.SQ || {};
SQ.dados = SQ.dados || {};

SQ.dados.mapa = {
  tile: 32,
  linhas: [
    '#########################',
    '#.....#.....#.....#.....#',
    '#.....#.....#.....#.....#',
    '#.....#.....#.....#.....#',
    '#.T.T.#.T.T.#.C.C.#.C.C.#',
    '###1#####2#####3#####4###',
    '#...........R...........#',
    '#......................B#',
    '#.......................#',
    '###5#####6#####7#####8###',
    '#.....#.....#.....#.....#',
    '#.S.S.#.C.C.#.T.T.#.P.P.#',
    '#.....#.....#.....#.....#',
    '#.....#.....#.....#.....#',
    '#########################'
  ],
  inicio: { x: 12, y: 7 },
  // Salas: índice da missão, retângulo interno e cor do piso
  salas: [
    { missao: 0, x: 1, y: 1, w: 5, h: 4, piso: '#F7E6EA', rotuloY: 1 },
    { missao: 1, x: 7, y: 1, w: 5, h: 4, piso: '#E4F3E8', rotuloY: 1 },
    { missao: 2, x: 13, y: 1, w: 5, h: 4, piso: '#E3ECFA', rotuloY: 1 },
    { missao: 3, x: 19, y: 1, w: 5, h: 4, piso: '#F5E6F0', rotuloY: 1 },
    { missao: 4, x: 1, y: 10, w: 5, h: 4, piso: '#FAEEDC', rotuloY: 13 },
    { missao: 5, x: 7, y: 10, w: 5, h: 4, piso: '#ECE5FA', rotuloY: 13 },
    { missao: 6, x: 13, y: 10, w: 5, h: 4, piso: '#E4ECF0', rotuloY: 13 },
    { missao: null, nome: 'Copa', x: 19, y: 10, w: 5, h: 4, piso: '#FBF3DA', rotuloY: 13 }
  ],
  // Posição de cada personagem de missão (na mesma ordem de SQ.dados.missoes)
  posicoesMissao: [
    [3, 2],
    [9, 2],
    [15, 2],
    [21, 2],
    [3, 12],
    [9, 12],
    [15, 12]
  ],
  // Outros personagens e objetos interativos
  extras: [
    { id: 'ana', tipo: 'npc', acao: 'mentora', x: 6, y: 7, nome: 'Ana', papel: 'Líder técnica', cor: '#6B3FD6' },
    { id: 'duda', tipo: 'npc', acao: 'dica', x: 21, y: 12, nome: 'Duda', papel: 'Estagiária', cor: '#1F9D55' },
    {
      id: 'biblioteca',
      tipo: 'objeto',
      acao: 'trilha',
      x: 23,
      y: 7,
      nome: 'Biblioteca',
      papel: 'Trilha de aprendizagem'
    },
    { id: 'mural', tipo: 'objeto', acao: 'ranking', x: 12, y: 6, nome: 'Mural', papel: 'Ranking da turma' }
  ]
};
