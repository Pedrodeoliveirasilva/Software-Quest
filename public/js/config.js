/* =================================================================
   CONFIGURAÇÃO DO SOFTWARE QUEST
   ================================================================= */
window.SQ = window.SQ || {};

SQ.config = {
  /* OPCIONAL. Deixe null para usar o servidor local (node servidor.js), que funciona
     sem nenhuma configuração. Preencha com o objeto de configuração do seu projeto
     Firebase (Console > Configurações do projeto > Seus apps > Web) apenas se quiser
     publicar o sistema na internet usando o Firebase. */
  firebase: null,
  /* Exemplo:
  firebase: {
    apiKey: "AIza...",
    authDomain: "software-quest-xxxx.firebaseapp.com",
    projectId: "software-quest-xxxx",
    storageBucket: "software-quest-xxxx.appspot.com",
    messagingSenderId: "000000000000",
    appId: "1:000000000000:web:xxxxxxxx"
  },
  */
  firebaseVersao: '10.12.2',

  // Os alunos entram com o código da turma (criado pelo professor), um nome de usuário e uma senha.
  // Internamente o Firebase exige um e-mail; ele é montado a partir do código e do usuário e nunca é exibido.
  dominioAlunos: 'alunos.softwarequest.app',

  // Código de participante da pesquisa (P01 a P99), pedido só em turmas marcadas como "participante da pesquisa"
  padraoCodigoPesquisa: /^[Pp][0-9]{2}$/,

  // Dados exibidos na política de privacidade. PREENCHA antes de publicar.
  privacidade: {
    responsavel: '[Nome do responsável pela plataforma]',
    contato: '[e-mail de contato]',
    atualizadaEm: '[data da última atualização]'
  },

  // Pontuação
  pontosPorTentativa: [100, 50, 25],
  maxTentativas: 3,
  perdaQualidadePorErro: 4,
  xpLicao: 20,
  xpVerificacao: 10,
  niveis: [
    { nome: 'Estagiário(a)', xp: 0 },
    { nome: 'Júnior', xp: 400 },
    { nome: 'Pleno', xp: 1000 },
    { nome: 'Sênior', xp: 1800 },
    { nome: 'Tech Lead', xp: 2600 }
  ]
};
