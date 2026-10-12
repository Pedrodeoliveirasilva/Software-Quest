/* =================================================================
   MISSÕES DO JOGO
   Uma missão por fase do processo de desenvolvimento. Cada missão tem um
   personagem (NPC), a sala onde ele fica no mapa, falas, um item de
   recompensa e a lista de desafios.
   Tipos de desafio: escolha, classificar, selecionar, ordenar.
   Em "escolha", marque a alternativa certa com correta: true.
   Professores podem editar este arquivo sem mexer no restante do sistema.
   ================================================================= */
window.SQ = window.SQ || {};

SQ.dados = SQ.dados || {};
SQ.dados.historia =
  'Você acaba de entrar na DevNova, uma pequena empresa de software. Seu primeiro projeto é o Boletim Online da Escola Estadual Vila Nova: um sistema para professores lançarem notas e alunos acompanharem o próprio desempenho. Sua missão é levar o projeto do primeiro pedido da diretora até o sistema funcionando nas mãos dos alunos.';

SQ.dados.missoes = [
  {
    id: 'requisitos',
    nome: 'Requisitos',
    titulo: 'Conversa com a cliente',
    npc: 'Diretora Márcia',
    papel: 'Cliente da Escola Estadual Vila Nova',
    sala: 'Sala de Reuniões',
    cor: '#D9486B',
    item: {
      nome: 'Caderno de Requisitos',
      icone: '📓'
    },
    falaInicio: [
      'Que bom que você chegou! Nossa escola precisa de um sistema para os professores lançarem as notas e os alunos acompanharem o boletim.',
      'Vou contar tudo o que precisamos. Anote com atenção: se você entender errado agora, vai dar problema lá na frente!'
    ],
    falaFim:
      'Perfeito! Agora sinto que vocês entenderam o que a escola precisa. Leve este caderno para o Rafa, na Sala Scrum.',
    desafios: [
      {
        id: 'req-classificar',
        tipo: 'classificar',
        rastrearErros: true,
        enunciado: 'A diretora fez estes pedidos. Classifique cada um.',
        categorias: ['Funcional', 'Não funcional'],
        itens: [
          {
            texto: 'Professores lançam as notas de cada bimestre.',
            correta: 'Funcional',
            porque: 'Descreve algo que o sistema faz.'
          },
          {
            texto: 'O sistema fica disponível 24 horas por dia.',
            correta: 'Não funcional',
            porque: 'Disponibilidade é uma qualidade do sistema.'
          },
          {
            texto: 'Alunos consultam o próprio boletim.',
            correta: 'Funcional',
            porque: 'É uma ação que o sistema oferece ao aluno.'
          },
          {
            texto: 'As senhas são guardadas de forma criptografada.',
            correta: 'Não funcional',
            porque: 'Segurança é uma qualidade, não uma funcionalidade.'
          },
          {
            texto: 'A secretaria gera um relatório com os alunos abaixo da média.',
            correta: 'Funcional',
            porque: 'Gerar um relatório é uma ação do sistema.'
          },
          {
            texto: 'Uma pessoa sem treinamento consegue usar o sistema em até 10 minutos.',
            correta: 'Não funcional',
            porque: 'Facilidade de uso (usabilidade) é uma qualidade.'
          }
        ],
        explicacao:
          'Funcional = o que o sistema faz. Não funcional = como ele deve ser (desempenho, segurança, usabilidade, disponibilidade).'
      },
      {
        id: 'req-pergunta',
        tipo: 'escolha',
        enunciado: 'Qual pergunta ajuda mais a levantar os requisitos com a diretora?',
        opcoes: [
          {
            texto: 'Quem vai usar o sistema e o que cada pessoa precisa fazer nele?',
            correta: true,
            porque: 'Entender os usuários e suas necessidades é o ponto de partida dos requisitos.'
          },
          {
            texto: 'Qual linguagem de programação devemos usar?',
            porque: 'A linguagem é uma decisão técnica da equipe, não uma necessidade da cliente.'
          },
          {
            texto: 'O sistema pode ser igual a um aplicativo famoso?',
            porque: 'Copiar outro sistema não revela o que esta escola realmente precisa.'
          },
          {
            texto: 'Quanto custa um servidor?',
            porque: 'Custo importa, mas não diz o que o sistema deve fazer.'
          }
        ]
      },
      {
        id: 'req-historia',
        tipo: 'escolha',
        enunciado: 'Qual destas é uma história de usuário bem escrita?',
        opcoes: [
          {
            texto: 'Criar tabela NOTAS no banco de dados.',
            porque: 'Isso é uma tarefa técnica, não uma necessidade de um usuário.'
          },
          {
            texto: 'Como professor, quero lançar as notas da turma, para que os alunos acompanhem seu desempenho.',
            correta: true,
            porque: 'Diz quem precisa, o que quer e por quê.'
          },
          {
            texto: 'O sistema tem que ser bom.',
            porque: 'É vago: não diz quem, o quê nem por quê.'
          },
          {
            texto: 'Botão azul no canto da tela.',
            porque: 'É um detalhe de interface, não uma necessidade.'
          }
        ]
      }
    ]
  },
  {
    id: 'planejamento',
    nome: 'Planejamento',
    titulo: 'Planejando a Sprint',
    npc: 'Rafa',
    papel: 'Product Owner',
    sala: 'Sala Scrum',
    cor: '#2F8F4E',
    item: {
      nome: 'Quadro da Sprint',
      icone: '📋'
    },
    falaInicio: [
      'Oi! Eu sou o Product Owner: cuido do Product Backlog e decido o que é mais valioso para a escola.',
      'Temos muitos pedidos e pouco tempo. Vamos planejar a primeira Sprint juntos?'
    ],
    falaFim: 'Sprint planejada! O Léo, no Laboratório de Código, já está esperando para começar.',
    desafios: [
      {
        id: 'plan-papeis',
        tipo: 'escolha',
        enunciado:
          'No meio da Sprint, a equipe travou porque ninguém tem acesso ao servidor de testes. Quem deve ajudar a remover esse impedimento?',
        opcoes: [
          {
            texto: 'O Product Owner',
            porque: 'O PO cuida do valor e da ordem do backlog, não dos impedimentos do dia a dia.'
          },
          {
            texto: 'A diretora da escola',
            porque: 'A cliente não participa da rotina técnica da equipe.'
          },
          {
            texto: 'O Scrum Master',
            correta: true,
            porque: 'Remover impedimentos é uma das responsabilidades do Scrum Master.'
          },
          {
            texto: 'Ninguém: a equipe espera a próxima Sprint',
            porque: 'Impedimentos devem ser tratados logo, não empurrados.'
          }
        ]
      },
      {
        id: 'plan-backlog',
        tipo: 'selecionar',
        enunciado:
          'A equipe entrega 13 pontos por Sprint. Os itens estão na ordem de prioridade definida pelo Product Owner. Escolha o que entra nesta Sprint.',
        capacidade: 13,
        itens: [
          {
            id: 'a',
            texto: 'Login de professores',
            pontos: 5
          },
          {
            id: 'b',
            texto: 'Lançar notas',
            pontos: 5
          },
          {
            id: 'c',
            texto: 'Consultar boletim',
            pontos: 3
          },
          {
            id: 'd',
            texto: 'Relatório da secretaria',
            pontos: 8
          },
          {
            id: 'e',
            texto: 'Tema escuro',
            pontos: 2
          }
        ],
        esperado: ['a', 'b', 'c'],
        explicacao:
          'Login, lançar notas e consultar boletim somam 13 pontos: usam toda a capacidade e respeitam a ordem de prioridade.'
      },
      {
        id: 'plan-eventos',
        tipo: 'ordenar',
        enunciado: 'Coloque os eventos da Sprint na ordem em que acontecem.',
        itens: ['Sprint Planning', 'Daily Scrum (todos os dias)', 'Sprint Review', 'Sprint Retrospective'],
        explicacao:
          'A Sprint começa no Planning, tem uma Daily todos os dias, mostra o resultado na Review e termina com a Retrospective, em que a equipe melhora seu jeito de trabalhar.'
      }
    ]
  },
  {
    id: 'programacao',
    nome: 'Programação',
    titulo: 'Mão no código',
    npc: 'Léo',
    papel: 'Desenvolvedor sênior',
    sala: 'Laboratório de Código',
    cor: '#2C6FD1',
    item: {
      nome: 'Teclado de Ouro',
      icone: '⌨️'
    },
    falaInicio: [
      'E aí! Hora de transformar as histórias de usuário em código.',
      'Um detalhe errado e um aluno aprovado aparece como reprovado. Bora com atenção?'
    ],
    falaFim: 'Mandou bem no código! Agora a Bia, no Laboratório de Testes, vai tentar quebrar tudo o que fizemos.',
    desafios: [
      {
        id: 'prog-aprovacao',
        tipo: 'escolha',
        enunciado: 'Regra da escola: o aluno é aprovado com média maior ou igual a 5. Qual código atende a essa regra?',
        codigo: true,
        opcoes: [
          {
            texto: 'if (media > 5) { status = "Aprovado"; }',
            porque: 'Com ">", um aluno com média exatamente 5 seria reprovado.'
          },
          {
            texto: 'if (media >= 5) { status = "Aprovado"; }',
            correta: true,
            porque: '">=" inclui a média 5, como a regra pede.'
          },
          {
            texto: 'if (media = 5) { status = "Aprovado"; }',
            porque: '"=" atribui um valor; não compara.'
          },
          {
            texto: 'if (media <= 5) { status = "Aprovado"; }',
            porque: 'Isso aprovaria quem tem média baixa.'
          }
        ]
      },
      {
        id: 'prog-bug',
        tipo: 'escolha',
        enunciado: 'Este código deveria calcular a média das 4 notas do bimestre. O que está errado?',
        trecho: 'media = (n1 + n2 + n3 + n4) / 3',
        opcoes: [
          {
            texto: 'Faltam parênteses.',
            porque: 'Os parênteses estão corretos: a soma acontece antes da divisão.'
          },
          {
            texto: 'Deveria multiplicar em vez de dividir.',
            porque: 'Média é soma dividida pela quantidade.'
          },
          {
            texto: 'Nada, o código está certo.',
            porque: 'São 4 notas, mas a divisão é por 3.'
          },
          {
            texto: 'A divisão deveria ser por 4, não por 3.',
            correta: true,
            porque: 'Média de 4 notas = soma das notas dividida por 4.'
          }
        ]
      },
      {
        id: 'prog-git',
        tipo: 'escolha',
        enunciado: 'Você vai começar a funcionalidade "Consultar boletim". Qual é a melhor prática com Git?',
        opcoes: [
          {
            texto: 'Programar tudo e fazer um único commit no fim do mês.',
            porque: 'Commits grandes dificultam revisar e encontrar erros.'
          },
          {
            texto: 'Criar um branch para a funcionalidade e fazer commits pequenos com mensagens claras.',
            correta: true,
            porque: 'Assim o trabalho fica organizado e cada mudança é fácil de entender e desfazer.'
          },
          {
            texto: 'Editar o código direto no servidor de produção.',
            porque: 'Qualquer erro afetaria os usuários imediatamente.'
          },
          {
            texto: 'Não usar Git, para ganhar tempo.',
            porque: 'Sem controle de versão, a equipe perde o histórico e se atrapalha.'
          }
        ]
      }
    ]
  },
  {
    id: 'testes',
    nome: 'Testes',
    titulo: 'Caça aos bugs',
    npc: 'Bia',
    papel: 'Analista de testes (QA)',
    sala: 'Laboratório de Testes',
    cor: '#B8548F',
    item: {
      nome: 'Lupa Caça-Bugs',
      icone: '🔍'
    },
    falaInicio: [
      'Olá! Meu trabalho é encontrar defeitos antes que os alunos encontrem.',
      'Código pronto não quer dizer código certo. Vamos testar?'
    ],
    falaFim: 'Excelente caçada! Com os testes prontos, o Caio pode automatizar tudo na Central de Integração.',
    desafios: [
      {
        id: 'test-tipos',
        tipo: 'classificar',
        enunciado: 'Que tipo de teste é cada situação?',
        categorias: ['Unidade', 'Integração', 'Sistema', 'Aceitação'],
        itens: [
          {
            texto: 'Verificar se calcularMedia(6, 8) devolve 7.',
            correta: 'Unidade',
            porque: 'Testa uma única função, isolada.'
          },
          {
            texto: 'Verificar se o módulo de notas grava corretamente no banco de dados.',
            correta: 'Integração',
            porque: 'Testa duas partes funcionando juntas.'
          },
          {
            texto: 'Percorrer o sistema inteiro: login, lançar nota, gerar boletim.',
            correta: 'Sistema',
            porque: 'Testa o sistema completo, de ponta a ponta.'
          },
          {
            texto: 'A diretora usa o sistema e confirma que ele atende ao pedido.',
            correta: 'Aceitação',
            porque: 'É a cliente validando o que recebeu.'
          }
        ],
        explicacao:
          'Unidade (uma função) → integração (partes juntas) → sistema (o todo) → aceitação (a cliente aprova).'
      },
      {
        id: 'test-limites',
        tipo: 'escolha',
        enunciado: 'Para testar a regra "aprovado com média maior ou igual a 5", qual conjunto de médias é o melhor?',
        opcoes: [
          {
            texto: '7, 8 e 9',
            porque: 'Todos bem acima de 5: não testam a fronteira, onde os erros costumam aparecer.'
          },
          {
            texto: 'Apenas 5',
            porque: 'Um único valor não mostra o que acontece logo abaixo e logo acima do limite.'
          },
          {
            texto: '4.9, 5 e 5.1',
            correta: true,
            porque: 'Valores no limite e ao redor dele revelam erros como usar ">" no lugar de ">=".'
          },
          {
            texto: '0 e 10',
            porque: 'Extremos são úteis, mas não testam o ponto exato da regra.'
          }
        ]
      },
      {
        id: 'test-tdd',
        tipo: 'escolha',
        enunciado: 'A equipe decidiu usar TDD (desenvolvimento orientado a testes). Qual é o primeiro passo?',
        opcoes: [
          {
            texto: 'Escrever um teste que falha, antes do código.',
            correta: true,
            porque: 'No TDD o teste vem primeiro; depois se escreve o código para ele passar.'
          },
          {
            texto: 'Escrever todo o código e testar no fim.',
            porque: 'Esse é o jeito tradicional, o oposto do TDD.'
          },
          {
            texto: 'Pedir para a cliente testar.',
            porque: 'O TDD é praticado pelos próprios desenvolvedores.'
          },
          {
            texto: 'Publicar em produção e esperar reclamações.',
            porque: 'Isso deixa os usuários encontrarem os erros.'
          }
        ]
      }
    ]
  },
  {
    id: 'integracao',
    nome: 'Integração contínua',
    titulo: 'O pipeline acendeu',
    npc: 'Caio',
    papel: 'Engenheiro DevOps',
    sala: 'Central de Integração',
    cor: '#C77A12',
    item: {
      nome: 'Chave do Pipeline',
      icone: '🔧'
    },
    falaInicio: [
      'Chegou na hora certa! Agora são quatro pessoas mexendo no mesmo código.',
      'Cada alteração passa pelo pipeline de integração contínua. E hoje ele ficou vermelho… me ajuda?'
    ],
    falaFim: 'Pipeline verde de novo! A Nina, na Sala de Deploy, vai levar o sistema até a produção.',
    desafios: [
      {
        id: 'ci-log',
        tipo: 'escolha',
        enunciado: 'O pipeline falhou. Leia o registro e diga qual é o problema.',
        log: [
          {
            t: '✔ Código baixado do repositório',
            ok: true
          },
          {
            t: '✔ Build concluído',
            ok: true
          },
          {
            t: '✔ 41 testes passaram',
            ok: true
          },
          {
            t: '✘ 1 teste falhou: calcularMedia(7, 8) deveria devolver 7.5, mas devolveu 7',
            ok: false
          }
        ],
        opcoes: [
          {
            texto: 'O servidor está fora do ar.',
            porque: 'O build e 41 testes rodaram: o servidor está funcionando.'
          },
          {
            texto: 'A função está arredondando o resultado: o teste encontrou um defeito no cálculo.',
            correta: true,
            porque: 'O teste esperava 7.5 e recebeu 7. O código está cortando as casas decimais.'
          },
          {
            texto: 'O teste está errado e deve ser apagado.',
            porque: 'A média de 7 e 8 é mesmo 7.5. O teste está certo.'
          },
          {
            texto: 'Faltou instalar o Git.',
            porque: 'O código foi baixado do repositório, então o Git funcionou.'
          }
        ]
      },
      {
        id: 'ci-frequencia',
        tipo: 'escolha',
        enunciado: 'Com que frequência a equipe deve integrar seu código ao repositório principal?',
        opcoes: [
          {
            texto: 'Uma vez, no fim do projeto.',
            porque: 'Juntar tudo no fim gera muitos conflitos e erros difíceis de encontrar.'
          },
          {
            texto: 'Uma vez por Sprint.',
            porque: 'Ainda é pouco: as alterações acumulam e os conflitos crescem.'
          },
          {
            texto: 'Em pequenas alterações, várias vezes ao dia.',
            correta: true,
            porque: 'Integrar pouco e sempre deixa os problemas pequenos e fáceis de corrigir.'
          },
          {
            texto: 'Só quando alguém pedir.',
            porque: 'A integração contínua é um hábito da equipe, não um evento.'
          }
        ]
      },
      {
        id: 'ci-automatico',
        tipo: 'classificar',
        enunciado: 'O que o pipeline de integração contínua faz automaticamente a cada envio de código?',
        categorias: ['Automático no pipeline', 'Não faz parte'],
        itens: [
          {
            texto: 'Compilar o código (build)',
            correta: 'Automático no pipeline',
            porque: 'O build roda a cada envio.'
          },
          {
            texto: 'Rodar os testes de unidade',
            correta: 'Automático no pipeline',
            porque: 'Os testes automatizados são o coração da integração contínua.'
          },
          {
            texto: 'Verificar o padrão de escrita do código',
            correta: 'Automático no pipeline',
            porque: 'Ferramentas de análise podem rodar automaticamente.'
          },
          {
            texto: 'Fazer a reunião de retrospectiva',
            correta: 'Não faz parte',
            porque: 'A retrospectiva é uma reunião de pessoas, não uma etapa automática.'
          },
          {
            texto: 'Entrevistar a diretora sobre novos pedidos',
            correta: 'Não faz parte',
            porque: 'Levantar requisitos é trabalho com pessoas.'
          }
        ],
        explicacao: 'O pipeline automatiza o que é repetitivo e verificável: build, testes e análise do código.'
      }
    ]
  },
  {
    id: 'entrega',
    nome: 'Entrega contínua',
    titulo: 'Rumo à produção',
    npc: 'Nina',
    papel: 'Engenheira de plataforma',
    sala: 'Sala de Deploy',
    cor: '#6B3FD6',
    item: {
      nome: 'Foguete de Deploy',
      icone: '🚀'
    },
    falaInicio: [
      'O Boletim Online está quase no ar!',
      'Precisamos montar o caminho que leva cada versão do código até os alunos, com segurança.'
    ],
    falaFim: 'O sistema está no ar! Agora os pedidos dos usuários vão chegar para o Seu Jorge, na Central de Suporte.',
    desafios: [
      {
        id: 'cd-ordenar',
        tipo: 'ordenar',
        enunciado: 'Monte o pipeline de entrega na ordem certa.',
        itens: [
          'Commit no repositório',
          'Build',
          'Testes automatizados',
          'Implantação em homologação',
          'Testes de aceitação',
          'Implantação em produção'
        ],
        explicacao:
          'O código entra pelo commit, é compilado, testado automaticamente, vai para homologação, é aceito e só então chega à produção.'
      },
      {
        id: 'cd-homologacao',
        tipo: 'escolha',
        enunciado: 'Para que serve o ambiente de homologação?',
        opcoes: [
          {
            texto: 'Para os desenvolvedores programarem.',
            porque: 'Programar acontece no ambiente de desenvolvimento.'
          },
          {
            texto: 'Para guardar os backups.',
            porque: 'Backups são outra coisa.'
          },
          {
            texto: 'Para os alunos usarem o sistema de verdade.',
            porque: 'Esse é o ambiente de produção.'
          },
          {
            texto: 'Para validar a versão em um ambiente parecido com o real antes de liberar.',
            correta: true,
            porque: 'A homologação reduz o risco de surpresas em produção.'
          }
        ]
      },
      {
        id: 'cd-entrega',
        tipo: 'escolha',
        enunciado:
          'O Boletim Online está sempre pronto para ser liberado, mas a diretora prefere liberar cada nova versão só no início do bimestre. Que prática é essa?',
        opcoes: [
          {
            texto: 'Entrega contínua',
            correta: true,
            porque: 'O software está sempre pronto, e liberar é uma decisão de negócio.'
          },
          {
            texto: 'Implantação contínua',
            porque: 'Na implantação contínua, cada alteração aprovada iria sozinha para produção.'
          },
          {
            texto: 'Modelo em cascata',
            porque: 'Cascata é um modelo de processo sequencial, sem pipeline automatizado.'
          },
          {
            texto: 'Integração manual',
            porque: 'O pipeline aqui é automatizado.'
          }
        ]
      },
      {
        id: 'cd-rollback',
        tipo: 'escolha',
        enunciado: 'Uma nova versão chegou à produção e o login parou de funcionar. O que fazer primeiro?',
        opcoes: [
          {
            texto: 'Esperar os alunos reclamarem.',
            porque: 'Enquanto isso, ninguém consegue entrar no sistema.'
          },
          {
            texto: 'Voltar para a versão anterior (rollback) e investigar o erro com calma.',
            correta: true,
            porque: 'Restaurar o serviço vem primeiro; a correção vem em seguida.'
          },
          {
            texto: 'Apagar o repositório e começar de novo.',
            porque: 'Isso destruiria todo o histórico do projeto.'
          },
          {
            texto: 'Desligar o pipeline.',
            porque: 'O pipeline é justamente o que ajuda a voltar e a corrigir com segurança.'
          }
        ]
      }
    ]
  },
  {
    id: 'manutencao',
    nome: 'Manutenção',
    titulo: 'O sistema no ar',
    npc: 'Seu Jorge',
    papel: 'Suporte ao usuário',
    sala: 'Central de Suporte',
    cor: '#4E6E81',
    item: {
      nome: 'Kit de Manutenção',
      icone: '🧰'
    },
    falaInicio: [
      'Bom dia! O sistema está no ar e os alunos já estão usando.',
      'E sabe o que acontece quando um sistema está no ar? Chegam pedidos, reclamações e ideias. Vamos resolver?'
    ],
    falaFim: 'Você cuidou de tudo, do primeiro pedido ao sistema em uso. E lembre: o ciclo nunca para!',
    desafios: [
      {
        id: 'man-classificar',
        tipo: 'classificar',
        enunciado: 'Chegaram quatro pedidos. Classifique o tipo de manutenção de cada um.',
        categorias: ['Corretiva', 'Adaptativa', 'Perfectiva', 'Preventiva'],
        itens: [
          {
            texto: 'O boletim de um aluno está mostrando as notas de outro aluno.',
            correta: 'Corretiva',
            porque: 'É um defeito que precisa ser corrigido.'
          },
          {
            texto: 'A Secretaria da Educação mudou as notas para a escala de 0 a 100.',
            correta: 'Adaptativa',
            porque: 'Uma regra externa mudou, e o sistema precisa se adaptar.'
          },
          {
            texto: 'A diretora pediu um gráfico do desempenho de cada turma.',
            correta: 'Perfectiva',
            porque: 'É uma melhoria, uma nova funcionalidade.'
          },
          {
            texto: 'Atualizar uma biblioteca que vai deixar de receber correções de segurança.',
            correta: 'Preventiva',
            porque: 'Evita um problema antes que ele aconteça.'
          }
        ],
        explicacao:
          'Corretiva conserta, adaptativa acompanha mudanças externas, perfectiva melhora e preventiva evita problemas futuros.'
      },
      {
        id: 'man-custo',
        tipo: 'escolha',
        enunciado: 'Por que a manutenção costuma ser a fase mais cara da vida de um sistema?',
        opcoes: [
          {
            texto: 'Porque os programadores de manutenção ganham mais.',
            porque: 'O custo vem do tempo de uso do sistema, não do salário.'
          },
          {
            texto: 'Porque o sistema é usado e alterado por muitos anos.',
            correta: true,
            porque: 'Correções, adaptações e melhorias se acumulam durante toda a vida do sistema.'
          },
          {
            texto: 'Porque na manutenção não se usam testes.',
            porque: 'Testes continuam essenciais na manutenção.'
          },
          {
            texto: 'Porque é preciso reescrever o sistema todo a cada pedido.',
            porque: 'A maioria das mudanças é feita aos poucos, sem reescrever tudo.'
          }
        ]
      },
      {
        id: 'man-ciclo',
        tipo: 'escolha',
        enunciado: 'Os novos pedidos da diretora foram aprovados. Para onde eles vão agora?',
        opcoes: [
          {
            texto: 'Direto para produção, sem passar pela equipe.',
            porque: 'Toda mudança precisa ser planejada, programada e testada.'
          },
          {
            texto: 'Para uma gaveta, porque o projeto já acabou.',
            porque: 'Um sistema em uso continua evoluindo.'
          },
          {
            texto: 'Viram novos itens no Product Backlog, e o ciclo recomeça.',
            correta: true,
            porque:
              'O desenvolvimento é um ciclo: requisitos, planejamento, código, testes, integração, entrega e manutenção.'
          },
          {
            texto: 'Para o Scrum Master programar sozinho.',
            porque: 'O Scrum Master não é o responsável por programar os pedidos.'
          }
        ]
      }
    ]
  }
];
