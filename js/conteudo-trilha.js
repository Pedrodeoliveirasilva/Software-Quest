/* =================================================================
   TRILHA DE APRENDIZAGEM
   Um módulo por fase do jogo. Cada módulo tem lições básicas e uma lição
   de aprofundamento (liberada depois da missão da fase).
   Blocos: p (parágrafo), lista, exemplo, dica, codigo.
   Professores podem editar este arquivo sem mexer no restante do sistema.
   ================================================================= */
window.SQ = window.SQ || {};

SQ.trilha = [
  {
    fase: 'requisitos',
    titulo: 'Requisitos de software',
    licoes: [
      {
        id: 'req-1', titulo: 'O que são requisitos', minutos: 4,
        blocos: [
          { tipo: 'p', texto: 'Requisitos descrevem o que um sistema deve fazer e as condições em que ele deve funcionar. Eles são o ponto de partida de qualquer projeto: se a equipe entende errado o que a cliente precisa, todo o resto é construído sobre uma base errada.' },
          { tipo: 'lista', titulo: 'Dois tipos principais', itens: [
            'Requisito funcional: o que o sistema faz. Ex.: "o professor lança as notas".',
            'Requisito não funcional: como o sistema deve ser. Ex.: rápido, seguro, fácil de usar, disponível o tempo todo.'
          ]},
          { tipo: 'exemplo', titulo: 'No Boletim Online', texto: '"O aluno consulta suas notas" é funcional. "A página abre em até 2 segundos" é não funcional (desempenho).' },
          { tipo: 'dica', texto: 'Pergunte a si mesmo: isso é uma ação que o sistema realiza ou uma qualidade que ele precisa ter?' }
        ],
        verificacao: {
          pergunta: '"O sistema deve continuar funcionando mesmo com internet lenta." Que tipo de requisito é esse?',
          opcoes: [
            { texto: 'Funcional', porque: 'Não descreve uma ação do sistema, e sim uma condição de funcionamento.' },
            { texto: 'Não funcional', correta: true, porque: 'Descreve uma qualidade: o desempenho em condições difíceis.' }
          ]
        }
      },
      {
        id: 'req-2', titulo: 'Como levantar requisitos', minutos: 5,
        blocos: [
          { tipo: 'p', texto: 'Levantar requisitos é descobrir, junto com as pessoas que vão usar o sistema, o que elas realmente precisam. Nem sempre o cliente sabe explicar tudo de primeira, por isso a equipe usa diferentes técnicas.' },
          { tipo: 'lista', titulo: 'Técnicas comuns', itens: [
            'Entrevista: conversar com os usuários e fazer boas perguntas.',
            'Observação: acompanhar como as pessoas trabalham hoje.',
            'Questionário: ouvir muitas pessoas ao mesmo tempo.',
            'Protótipo: mostrar um rascunho das telas e colher opiniões.'
          ]},
          { tipo: 'p', texto: 'Em equipes ágeis, os requisitos costumam ser escritos como histórias de usuário, no formato: "Como [quem], quero [o quê], para [por quê]". Cada história ganha critérios de aceitação, que dizem quando ela está pronta.' },
          { tipo: 'exemplo', titulo: 'História com critério de aceitação', texto: 'Como aluno, quero ver minha média do bimestre, para saber se preciso estudar mais. Critério: a média aparece com uma casa decimal e em vermelho quando for menor que 5.' }
        ],
        verificacao: {
          pergunta: 'Os professores têm dificuldade de explicar como fazem o fechamento das notas hoje. Qual técnica ajuda mais nesse caso?',
          opcoes: [
            { texto: 'Enviar um questionário com perguntas fechadas', porque: 'Se eles não conseguem explicar, perguntas fechadas também não vão revelar o processo.' },
            { texto: 'Observar o trabalho deles no dia a dia', correta: true, porque: 'Observar mostra o que as pessoas fazem, mesmo quando elas não sabem descrever.' },
            { texto: 'Começar a programar e ver no que dá', porque: 'Programar sem entender a necessidade gera retrabalho.' }
          ]
        }
      },
      {
        id: 'req-3', titulo: 'Aprofundamento: requisitos mudam', minutos: 4, aprofundamento: true,
        blocos: [
          { tipo: 'p', texto: 'Requisitos mudam durante o projeto: a escola muda uma regra, a diretora percebe uma nova necessidade, um usuário testa o protótipo e sugere algo melhor. Isso é normal, e os métodos ágeis foram criados justamente para lidar com essas mudanças.' },
          { tipo: 'p', texto: 'O que não pode acontecer é descobrir um requisito errado só no fim. Quanto mais tarde um erro de requisito é encontrado, mais caro ele fica, porque já existe código, testes e às vezes usuários dependendo daquilo.' },
          { tipo: 'lista', titulo: 'Como reduzir o risco', itens: [
            'Validar os requisitos com o cliente logo no início.',
            'Mostrar versões pequenas do sistema com frequência.',
            'Manter o Product Backlog atualizado e priorizado.'
          ]},
          { tipo: 'dica', texto: 'No jogo, um requisito classificado errado na primeira fase volta como defeito na manutenção. É exatamente assim no mundo real.' }
        ],
        verificacao: {
          pergunta: 'Quando é mais barato corrigir um requisito errado?',
          opcoes: [
            { texto: 'Durante o levantamento de requisitos', correta: true, porque: 'Nessa fase só é preciso reescrever o requisito, sem mexer em código ou testes.' },
            { texto: 'Depois que o sistema está em produção', porque: 'Aqui a correção envolve código, testes, implantação e usuários afetados.' },
            { texto: 'Tanto faz, o custo é sempre o mesmo', porque: 'O custo cresce à medida que o projeto avança.' }
          ]
        }
      }
    ]
  },
  {
    fase: 'planejamento',
    titulo: 'Métodos ágeis e Scrum',
    licoes: [
      {
        id: 'plan-1', titulo: 'Métodos ágeis e o Scrum', minutos: 5,
        blocos: [
          { tipo: 'p', texto: 'Durante muito tempo, os projetos seguiam o modelo em cascata: primeiro todos os requisitos, depois todo o projeto, depois todo o código, e só no fim os testes. O problema é que mudanças e erros apareciam tarde demais.' },
          { tipo: 'p', texto: 'Em 2001, um grupo de desenvolvedores publicou o Manifesto Ágil, propondo trabalhar em ciclos curtos, com entregas frequentes e muita colaboração com o cliente.' },
          { tipo: 'lista', titulo: 'Os quatro valores do Manifesto Ágil', itens: [
            'Indivíduos e interações mais que processos e ferramentas.',
            'Software funcionando mais que documentação abrangente.',
            'Colaboração com o cliente mais que negociação de contratos.',
            'Responder a mudanças mais que seguir um plano.'
          ]},
          { tipo: 'p', texto: 'O Scrum é o framework ágil mais usado. Ele se apoia em três pilares: transparência (todos veem o andamento), inspeção (o trabalho é revisado com frequência) e adaptação (a equipe ajusta o rumo quando precisa).' }
        ],
        verificacao: {
          pergunta: 'Qual destes é um valor do Manifesto Ágil?',
          opcoes: [
            { texto: 'Seguir o plano inicial mesmo que o cliente mude de ideia', porque: 'É o contrário: o manifesto valoriza responder a mudanças.' },
            { texto: 'Responder a mudanças mais que seguir um plano', correta: true, porque: 'Esse é um dos quatro valores do manifesto.' },
            { texto: 'Documentação completa antes de qualquer código', porque: 'O manifesto valoriza mais o software funcionando.' }
          ]
        }
      },
      {
        id: 'plan-2', titulo: 'Papéis, eventos e artefatos', minutos: 6,
        blocos: [
          { tipo: 'lista', titulo: 'Papéis', itens: [
            'Product Owner: ordena o Product Backlog pelo valor de cada item.',
            'Scrum Master: ajuda a equipe a aplicar o Scrum e remove impedimentos.',
            'Developers: constroem o produto a cada Sprint.'
          ]},
          { tipo: 'lista', titulo: 'Eventos', itens: [
            'Sprint: ciclo de até um mês que contém todos os outros eventos.',
            'Sprint Planning: a equipe decide o que fazer na Sprint.',
            'Daily Scrum: encontro rápido todos os dias para alinhar o trabalho.',
            'Sprint Review: a equipe mostra o incremento aos interessados.',
            'Sprint Retrospective: a equipe discute como melhorar seu jeito de trabalhar.'
          ]},
          { tipo: 'lista', titulo: 'Artefatos', itens: [
            'Product Backlog: lista ordenada de tudo que o produto pode ter.',
            'Sprint Backlog: o que foi escolhido para a Sprint atual.',
            'Incremento: a parte do produto pronta ao fim da Sprint.'
          ]},
          { tipo: 'dica', texto: 'Review olha para o produto ("o que construímos?"). Retrospective olha para a equipe ("como trabalhamos?").' }
        ],
        verificacao: {
          pergunta: 'Em qual evento a equipe mostra o que construiu para a diretora e outros interessados?',
          opcoes: [
            { texto: 'Daily Scrum', porque: 'A Daily é um alinhamento rápido da própria equipe.' },
            { texto: 'Sprint Retrospective', porque: 'A Retrospective trata do jeito de trabalhar da equipe.' },
            { texto: 'Sprint Review', correta: true, porque: 'Na Review o incremento é apresentado e discutido com os interessados.' }
          ]
        }
      },
      {
        id: 'plan-3', titulo: 'Aprofundamento: estimativas e capacidade', minutos: 4, aprofundamento: true,
        blocos: [
          { tipo: 'p', texto: 'Para decidir o que cabe em uma Sprint, muitas equipes estimam o esforço de cada item em pontos (story points). Os pontos não são horas: indicam o tamanho relativo do trabalho, comparando um item com outro.' },
          { tipo: 'p', texto: 'A soma dos pontos que a equipe costuma entregar por Sprint é chamada de velocidade. Ela ajuda a prever quanto trabalho cabe na próxima Sprint sem prometer demais.' },
          { tipo: 'exemplo', titulo: 'Exemplo', texto: 'Se a equipe entregou 18, 20 e 22 pontos nas últimas três Sprints, uma previsão razoável é cerca de 20 pontos para a próxima.' },
          { tipo: 'dica', texto: 'Respeite a ordem do Product Owner: os itens mais valiosos entram primeiro, até atingir a capacidade da equipe.' }
        ],
        verificacao: {
          pergunta: 'A equipe entregou 18, 20 e 22 pontos nas últimas Sprints. Qual é uma previsão razoável para a próxima?',
          opcoes: [
            { texto: 'Cerca de 20 pontos', correta: true, porque: 'É a média do que a equipe vem entregando.' },
            { texto: '40 pontos, para acelerar o projeto', porque: 'Prometer o dobro da capacidade faz a Sprint fracassar.' },
            { texto: 'Não dá para prever nada', porque: 'A velocidade das Sprints anteriores serve justamente para prever.' }
          ]
        }
      }
    ]
  },
  {
    fase: 'programacao',
    titulo: 'Programação e controle de versão',
    licoes: [
      {
        id: 'prog-1', titulo: 'Do requisito ao código', minutos: 5,
        blocos: [
          { tipo: 'p', texto: 'Programar é transformar uma necessidade em instruções que o computador executa. Um bom código faz exatamente o que a história de usuário e seus critérios de aceitação pedem, nem mais, nem menos.' },
          { tipo: 'lista', titulo: 'Detalhes que mudam tudo', itens: [
            '> (maior que) e >= (maior ou igual) parecem iguais, mas decidem se a média 5 aprova ou reprova.',
            '= atribui um valor; == ou === comparam valores.',
            'Multiplicação e divisão acontecem antes de soma e subtração; use parênteses para deixar a ordem clara.'
          ]},
          { tipo: 'codigo', texto: 'let media = (nota1 + nota2) / 2;\nif (media >= 5) {\n  situacao = "Aprovado";\n} else {\n  situacao = "Recuperação";\n}' },
          { tipo: 'dica', texto: 'Antes de programar, releia a regra e pense em um exemplo concreto: com as notas 4 e 6, qual deveria ser o resultado?' }
        ],
        verificacao: {
          pergunta: 'Qual expressão é verdadeira quando a nota está entre 0 e 10, incluindo o 0 e o 10?',
          codigo: true,
          opcoes: [
            { texto: 'nota > 0 && nota < 10', porque: 'Com > e <, as notas 0 e 10 ficariam de fora.' },
            { texto: 'nota >= 0 && nota <= 10', correta: true, porque: '>= e <= incluem os dois limites.' },
            { texto: 'nota >= 0 || nota <= 10', porque: 'Com || (ou), qualquer número seria aceito.' }
          ]
        }
      },
      {
        id: 'prog-2', titulo: 'Controle de versão com Git', minutos: 5,
        blocos: [
          { tipo: 'p', texto: 'Quando várias pessoas mexem no mesmo código, é preciso registrar cada alteração e conseguir voltar atrás. É para isso que serve um sistema de controle de versão como o Git.' },
          { tipo: 'lista', titulo: 'Conceitos essenciais', itens: [
            'Repositório: onde fica o código e todo o seu histórico.',
            'Commit: um registro de alteração, com uma mensagem explicando o que mudou.',
            'Branch: uma linha paralela de trabalho, para desenvolver sem atrapalhar o código principal.',
            'Merge / pull request: juntar o trabalho de um branch ao código principal, geralmente com revisão de um colega.'
          ]},
          { tipo: 'exemplo', titulo: 'Mensagens de commit', texto: 'Ruim: "ajustes". Boa: "Corrige cálculo da média com 4 notas". A boa mensagem diz o que mudou sem precisar abrir o código.' }
        ],
        verificacao: {
          pergunta: 'Qual é a melhor mensagem de commit?',
          opcoes: [
            { texto: 'mudanças', porque: 'Não diz o que mudou.' },
            { texto: 'Corrige cálculo da média com 4 notas', correta: true, porque: 'É curta e explica exatamente a alteração.' },
            { texto: 'aaaaa agora vai', porque: 'Não ajuda ninguém a entender o histórico.' }
          ]
        }
      },
      {
        id: 'prog-3', titulo: 'Aprofundamento: código limpo e refatoração', minutos: 4, aprofundamento: true,
        blocos: [
          { tipo: 'p', texto: 'Código é lido muito mais vezes do que é escrito. Por isso, deixá-lo fácil de entender economiza tempo de toda a equipe.' },
          { tipo: 'lista', titulo: 'Boas práticas', itens: [
            'Nomes que explicam: mediaBimestral em vez de m2.',
            'Funções pequenas, cada uma com uma responsabilidade.',
            'Evitar repetir o mesmo trecho em vários lugares.'
          ]},
          { tipo: 'p', texto: 'Refatorar é melhorar a estrutura do código sem mudar o que ele faz. Os testes automatizados dão segurança para refatorar: se eles continuam passando, o comportamento foi preservado.' }
        ],
        verificacao: {
          pergunta: 'Qual nome de variável é melhor para guardar a média do bimestre?',
          opcoes: [
            { texto: 'x', porque: 'Não diz nada sobre o conteúdo.' },
            { texto: 'mediaBimestral', correta: true, porque: 'Qualquer pessoa entende o que a variável guarda.' },
            { texto: 'aux2', porque: 'Nomes genéricos obrigam a ler todo o código para entender.' }
          ]
        }
      }
    ]
  },
  {
    fase: 'testes',
    titulo: 'Testes de software',
    licoes: [
      {
        id: 'test-1', titulo: 'Por que testar', minutos: 5,
        blocos: [
          { tipo: 'p', texto: 'Testar é executar o sistema para verificar se ele atende aos requisitos e para encontrar defeitos antes que os usuários os encontrem. Os testes mostram a presença de erros, mas não conseguem provar que não existe nenhum.' },
          { tipo: 'lista', titulo: 'Níveis de teste', itens: [
            'Unidade: uma função ou parte pequena, isolada.',
            'Integração: partes diferentes funcionando juntas (ex.: o sistema e o banco de dados).',
            'Sistema: o sistema completo, de ponta a ponta.',
            'Aceitação: o cliente confirma que o sistema atende ao que pediu.'
          ]},
          { tipo: 'dica', texto: 'Quanto mais cedo um defeito é encontrado, mais barato é corrigi-lo.' }
        ],
        verificacao: {
          pergunta: 'Um teste verifica se a tela de login consegue buscar corretamente o usuário no banco de dados. Que nível de teste é esse?',
          opcoes: [
            { texto: 'Unidade', porque: 'Envolve duas partes diferentes, não uma função isolada.' },
            { texto: 'Integração', correta: true, porque: 'Testa a comunicação entre o login e o banco de dados.' },
            { texto: 'Aceitação', porque: 'Aceitação é feita pelo cliente, validando o sistema.' }
          ]
        }
      },
      {
        id: 'test-2', titulo: 'Como escolher casos de teste', minutos: 6,
        blocos: [
          { tipo: 'p', texto: 'É impossível testar todos os valores possíveis. Por isso, escolhemos casos de teste inteligentes, que têm mais chance de revelar erros.' },
          { tipo: 'lista', titulo: 'Duas técnicas simples', itens: [
            'Partição de equivalência: dividir os valores em grupos que se comportam igual e testar um de cada grupo.',
            'Valores-limite: testar exatamente na fronteira da regra e logo antes e depois dela, onde os erros costumam aparecer.'
          ]},
          { tipo: 'exemplo', titulo: 'Regra: idade mínima de 14 anos', texto: 'Grupos: menor de 14 (recusar) e 14 ou mais (aceitar). Valores-limite: 13, 14 e 15.' }
        ],
        verificacao: {
          pergunta: 'Regra: a senha deve ter de 6 a 12 caracteres. Quais tamanhos testam melhor os limites?',
          opcoes: [
            { texto: '8 e 10', porque: 'Estão no meio da faixa e não testam as fronteiras.' },
            { texto: '5, 6, 12 e 13', correta: true, porque: 'Testam cada limite e o valor logo fora dele.' },
            { texto: '1 e 100', porque: 'São extremos distantes, que não testam o ponto exato da regra.' }
          ]
        }
      },
      {
        id: 'test-3', titulo: 'Aprofundamento: testes automatizados e TDD', minutos: 4, aprofundamento: true,
        blocos: [
          { tipo: 'p', texto: 'Testes automatizados são programas que testam o sistema. Eles rodam em segundos, quantas vezes for preciso, e são a base da integração contínua.' },
          { tipo: 'p', texto: 'No TDD (desenvolvimento orientado a testes), o teste é escrito antes do código, em um ciclo de três passos:' },
          { tipo: 'lista', itens: [
            'Vermelho: escrever um teste que falha, porque a funcionalidade ainda não existe.',
            'Verde: escrever o código mínimo para o teste passar.',
            'Refatorar: melhorar o código, mantendo o teste passando.'
          ]}
        ],
        verificacao: {
          pergunta: 'Qual é a ordem do ciclo do TDD?',
          opcoes: [
            { texto: 'Código → teste → entrega', porque: 'No TDD, o teste vem antes do código.' },
            { texto: 'Teste que falha → código que passa → refatorar', correta: true, porque: 'É o ciclo vermelho, verde, refatorar.' },
            { texto: 'Refatorar → teste → código', porque: 'Não há o que refatorar antes de existir código.' }
          ]
        }
      }
    ]
  },
  {
    fase: 'integracao',
    titulo: 'Integração contínua',
    licoes: [
      {
        id: 'ci-1', titulo: 'O problema da integração', minutos: 5,
        blocos: [
          { tipo: 'p', texto: 'Imagine quatro pessoas programando separadas por um mês e juntando tudo no último dia. Aparecem conflitos, partes que não se encaixam e erros difíceis de rastrear. Esse cenário é conhecido como "inferno da integração".' },
          { tipo: 'p', texto: 'A integração contínua resolve isso: cada pessoa integra pequenas alterações ao repositório principal com frequência, várias vezes ao dia. A cada envio, um pipeline automático compila o código e roda os testes.' },
          { tipo: 'lista', titulo: 'Benefícios', itens: [
            'Os erros aparecem logo, quando a alteração ainda é pequena.',
            'Todos trabalham sempre sobre a versão mais recente.',
            'Tarefas repetitivas ficam por conta da máquina.'
          ]}
        ],
        verificacao: {
          pergunta: 'O que dispara o pipeline de integração contínua?',
          opcoes: [
            { texto: 'Cada envio de código ao repositório', correta: true, porque: 'Cada alteração enviada é verificada automaticamente.' },
            { texto: 'Uma reunião semanal da equipe', porque: 'O pipeline é automático e não depende de reuniões.' },
            { texto: 'O pedido do cliente', porque: 'O cliente não aciona o pipeline.' }
          ]
        }
      },
      {
        id: 'ci-2', titulo: 'Lendo um pipeline', minutos: 5,
        blocos: [
          { tipo: 'p', texto: 'Um pipeline é uma sequência de etapas automáticas. Ferramentas como o GitHub Actions mostram o resultado de cada etapa em um registro (log).' },
          { tipo: 'codigo', texto: '✔ Baixar código\n✔ Instalar dependências\n✔ Build\n✘ Testes: 1 falhou (calcularMedia)' },
          { tipo: 'p', texto: 'Quando o pipeline fica vermelho, dizemos que o build está quebrado. A regra de ouro é corrigir isso antes de enviar novas alterações: senão, novos erros se misturam ao primeiro e fica difícil descobrir a causa.' },
          { tipo: 'dica', texto: 'Leia o log de cima para baixo e procure a primeira etapa que falhou. A mensagem de erro geralmente diz o que era esperado e o que aconteceu.' }
        ],
        verificacao: {
          pergunta: 'O que significa um pipeline vermelho?',
          opcoes: [
            { texto: 'Que o sistema está pronto para produção', porque: 'Vermelho indica falha, não sucesso.' },
            { texto: 'Que alguma etapa falhou e precisa ser corrigida antes de seguir', correta: true, porque: 'O build quebrado deve ser a prioridade da equipe.' },
            { texto: 'Que o computador está desligado', porque: 'O pipeline rodou e registrou uma falha.' }
          ]
        }
      },
      {
        id: 'ci-3', titulo: 'Aprofundamento: DevOps', minutos: 4, aprofundamento: true,
        blocos: [
          { tipo: 'p', texto: 'DevOps é uma cultura que aproxima quem desenvolve (Dev) de quem opera os sistemas (Ops). Em vez de "jogar o código por cima do muro", as duas áreas trabalham juntas do início ao fim.' },
          { tipo: 'lista', titulo: 'Quatro métricas usadas para medir a entrega de software', itens: [
            'Frequência de implantação: quantas vezes se coloca uma versão nova no ar.',
            'Tempo de espera: quanto tempo uma mudança leva do código até a produção.',
            'Tempo de restauração: quanto tempo se leva para recuperar o serviço após uma falha.',
            'Taxa de falha: quantas mudanças causam problemas em produção.'
          ]}
        ],
        verificacao: {
          pergunta: 'Qual destas é uma métrica de desempenho da entrega de software?',
          opcoes: [
            { texto: 'Número de linhas de código escritas', porque: 'Mais linhas não significam entregas melhores.' },
            { texto: 'Frequência de implantação', correta: true, porque: 'É uma das quatro métricas de desempenho de entrega.' },
            { texto: 'Quantidade de reuniões por semana', porque: 'Reuniões não medem a entrega de software.' }
          ]
        }
      }
    ]
  },
  {
    fase: 'entrega',
    titulo: 'Entrega contínua',
    licoes: [
      {
        id: 'cd-1', titulo: 'Ambientes e pipeline de entrega', minutos: 5,
        blocos: [
          { tipo: 'lista', titulo: 'Ambientes', itens: [
            'Desenvolvimento: onde os desenvolvedores programam e testam.',
            'Homologação: cópia parecida com a real, para validar antes de liberar.',
            'Produção: onde os usuários usam o sistema de verdade.'
          ]},
          { tipo: 'p', texto: 'O pipeline de entrega é o caminho automático que leva cada versão do código até a produção: commit, build, testes automatizados, implantação em homologação, testes de aceitação e implantação em produção. Cada etapa só começa se a anterior passou.' },
          { tipo: 'dica', texto: 'O pipeline funciona como uma série de portões: uma versão com defeito é barrada antes de chegar aos alunos.' }
        ],
        verificacao: {
          pergunta: 'Em qual ambiente os alunos usam o Boletim Online de verdade?',
          opcoes: [
            { texto: 'Desenvolvimento', porque: 'É o ambiente dos programadores.' },
            { texto: 'Homologação', porque: 'É usado para validar antes da liberação.' },
            { texto: 'Produção', correta: true, porque: 'Produção é o ambiente real, usado pelos usuários.' }
          ]
        }
      },
      {
        id: 'cd-2', titulo: 'Entrega contínua x implantação contínua', minutos: 4,
        blocos: [
          { tipo: 'p', texto: 'Na entrega contínua, o software fica sempre pronto para ser liberado. A liberação para produção é uma decisão de negócio, que pode acontecer a qualquer momento com um clique.' },
          { tipo: 'p', texto: 'Na implantação contínua, vai um passo além: toda alteração aprovada no pipeline vai automaticamente para produção, sem ninguém precisar decidir.' },
          { tipo: 'exemplo', titulo: 'Para comparar', texto: 'Um aplicativo de banco pode preferir entrega contínua (libera em horários planejados). Uma rede social pode usar implantação contínua (dezenas de versões por dia).' }
        ],
        verificacao: {
          pergunta: 'Em uma loja virtual, cada alteração aprovada nos testes vai sozinha para o site, várias vezes ao dia. Que prática é essa?',
          opcoes: [
            { texto: 'Entrega contínua', porque: 'Na entrega contínua alguém decide quando liberar.' },
            { texto: 'Implantação contínua', correta: true, porque: 'A liberação acontece automaticamente, sem decisão manual.' },
            { texto: 'Modelo em cascata', porque: 'Cascata não tem liberações frequentes e automáticas.' }
          ]
        }
      },
      {
        id: 'cd-3', titulo: 'Aprofundamento: quando algo dá errado', minutos: 4, aprofundamento: true,
        blocos: [
          { tipo: 'p', texto: 'Mesmo com testes, às vezes uma versão com problema chega à produção. Equipes maduras se preparam para isso.' },
          { tipo: 'lista', itens: [
            'Rollback: voltar rapidamente para a versão anterior que funcionava.',
            'Entregas pequenas: cada versão muda pouco, então é fácil descobrir o que quebrou.',
            'Feature flags: ligar e desligar uma funcionalidade sem precisar de uma nova versão.'
          ]},
          { tipo: 'dica', texto: 'Primeiro restaure o serviço para os usuários; depois investigue a causa com calma.' }
        ],
        verificacao: {
          pergunta: 'Por que entregas pequenas e frequentes são mais seguras?',
          opcoes: [
            { texto: 'Porque dispensam testes', porque: 'Os testes continuam essenciais.' },
            { texto: 'Porque cada mudança é menor, mais fácil de testar e de desfazer', correta: true, porque: 'Menos mudanças por vez significa menos risco e diagnóstico mais rápido.' },
            { texto: 'Porque os usuários não percebem os erros', porque: 'Os usuários percebem, por isso é importante corrigir rápido.' }
          ]
        }
      }
    ]
  },
  {
    fase: 'manutencao',
    titulo: 'Manutenção e evolução',
    licoes: [
      {
        id: 'man-1', titulo: 'O software continua vivo', minutos: 5,
        blocos: [
          { tipo: 'p', texto: 'Entregar o sistema não é o fim do projeto. Um software em uso precisa ser corrigido, adaptado e melhorado durante anos. Por isso, a manutenção costuma ser a fase mais cara da vida de um sistema.' },
          { tipo: 'lista', titulo: 'Tipos de manutenção', itens: [
            'Corretiva: corrige um defeito.',
            'Adaptativa: ajusta o sistema a mudanças externas, como uma nova lei ou um novo sistema operacional.',
            'Perfectiva: melhora o sistema ou acrescenta funcionalidades.',
            'Preventiva: evita problemas futuros, como atualizar uma biblioteca antes que ela fique insegura.'
          ]}
        ],
        verificacao: {
          pergunta: 'A pedido dos alunos, a tela do boletim foi redesenhada para ficar mais fácil de ler. Que tipo de manutenção é essa?',
          opcoes: [
            { texto: 'Corretiva', porque: 'Não havia um defeito; a tela funcionava.' },
            { texto: 'Perfectiva', correta: true, porque: 'É uma melhoria no sistema.' },
            { texto: 'Adaptativa', porque: 'Nada mudou no ambiente externo.' }
          ]
        }
      },
      {
        id: 'man-2', titulo: 'Registrando e priorizando pedidos', minutos: 4,
        blocos: [
          { tipo: 'p', texto: 'Pedidos de manutenção costumam chegar como chamados (tickets). Um bom relato de defeito economiza muito tempo da equipe.' },
          { tipo: 'lista', titulo: 'Um bom relato de defeito tem', itens: [
            'Os passos para reproduzir o problema.',
            'O resultado esperado.',
            'O resultado obtido (o que aconteceu de errado).'
          ]},
          { tipo: 'p', texto: 'Os pedidos aprovados voltam para o Product Backlog e são priorizados pelo impacto que causam. Um defeito que impede os alunos de entrar no sistema vem antes de uma mudança de cor.' }
        ],
        verificacao: {
          pergunta: 'Qual relato de defeito ajuda mais a equipe?',
          opcoes: [
            { texto: '"O sistema não funciona."', porque: 'Não diz onde, quando nem como o problema acontece.' },
            { texto: '"Entrei como aluno, abri o boletim do 2º bimestre e a média de Matemática apareceu como 0, mas deveria ser 7,5."', correta: true, porque: 'Tem os passos, o resultado esperado e o obtido.' },
            { texto: '"Tá tudo bugado!!!"', porque: 'Mostra a frustração, mas não ajuda a encontrar o problema.' }
          ]
        }
      },
      {
        id: 'man-3', titulo: 'Aprofundamento: dívida técnica', minutos: 4, aprofundamento: true,
        blocos: [
          { tipo: 'p', texto: 'Às vezes a equipe pega um atalho para entregar mais rápido: pula testes, copia código, deixa uma gambiarra "para arrumar depois". Esses atalhos criam a chamada dívida técnica.' },
          { tipo: 'p', texto: 'Como uma dívida de verdade, ela cobra juros: cada nova alteração fica mais lenta e arriscada. A refatoração e a manutenção preventiva são formas de pagar essa dívida aos poucos.' },
          { tipo: 'dica', texto: 'O medidor de qualidade do jogo funciona como um termômetro da dívida técnica do seu projeto.' }
        ],
        verificacao: {
          pergunta: 'Pular os testes para entregar mais rápido gera o quê?',
          opcoes: [
            { texto: 'Dívida técnica', correta: true, porque: 'O tempo "economizado" volta depois, com juros, na forma de defeitos e retrabalho.' },
            { texto: 'Um sistema mais seguro', porque: 'Sem testes, é mais provável que defeitos cheguem aos usuários.' },
            { texto: 'Nenhuma consequência', porque: 'Atalhos sempre têm consequências no futuro.' }
          ]
        }
      }
    ]
  }
];
