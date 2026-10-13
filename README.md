# Software Quest: Missão Entrega Contínua

Jogo educacional para o ensino de Processos de Desenvolvimento de Software, desenvolvido como Trabalho de Conclusão de Curso (TCC) na Universidade Federal do ABC (UFABC).

O aluno entra na DevNova, uma empresa fictícia de software, e conduz o projeto do Boletim Online de uma escola estadual, do primeiro pedido da cliente até o sistema em uso.

A plataforma é aberta: qualquer professor pode criar uma conta, criar turmas e passar o código de acesso para os alunos. Cada professor vê apenas os dados das próprias turmas.

## Como rodar (sem configurar nada)

Você só precisa do [Node.js](https://nodejs.org) instalado (versão 22 ou mais recente). Para rodar no seu computador, não há pacotes para instalar nem chaves para configurar.

**No VS Code:** abra a pasta do projeto (Arquivo > Abrir Pasta) e aperte **F5**. O servidor inicia e o jogo abre no navegador.

**Pelo terminal:** dentro da pasta do projeto, rode:

```bash
node servidor.js
```

e acesse `http://localhost:3000`. Para encerrar, aperte `Ctrl+C`.

Ao iniciar, o servidor mostra também os endereços para os alunos, por exemplo `http://192.168.0.10:3000`. Qualquer computador ou celular **na mesma rede (Wi-Fi da escola)** acessa o jogo por esse endereço, e os dados de todos ficam no computador que está rodando o servidor.

- **Firewall:** no Windows, na primeira vez, pode aparecer um aviso do firewall. Permita o acesso em redes privadas para que os alunos consigam entrar.
- **Onde ficam os dados:** todas as contas e todo o progresso ficam no arquivo `dados/banco.json`. Para fazer backup, basta copiar esse arquivo. As senhas são guardadas protegidas (hash com sal), nunca em texto.
- **Outra porta:** se a porta 3000 já estiver em uso, rode `PORT=3001 node servidor.js` (no Windows PowerShell: `$env:PORT=3001; node servidor.js`).
- **Senha esquecida de aluno:** o professor redefine pelo painel, no botão "Nova senha" da linha do aluno.
- **Senha esquecida de professor:** quem administra o servidor redefine com:

  ```bash
  node servidor.js redefinir-senha professor@email.com nova-senha
  ```

- **Live Server não funciona:** abrir o `public/index.html` direto ou pelo Live Server não funciona, porque é o servidor que guarda as contas e o progresso. Nesse caso, o jogo mostra uma tela explicando como iniciar o servidor.

## O que o sistema tem

| Parte                  | O que faz                                                                                                                                                                                                                                                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Contas de professor    | O professor se cadastra pelo próprio site, com nome, escola, e-mail e senha, e pode recuperar a senha por e-mail.                                                                                                                                                                                                        |
| Turmas                 | Cada professor cria quantas turmas quiser. Cada turma recebe um código de acesso de 6 caracteres (por exemplo, `QX7-42B`), que pode ser aberto ou fechado para novos cadastros.                                                                                                                                          |
| Cadastro do aluno      | O aluno informa o código da turma, cria um nome de usuário, um apelido e uma senha. Não é pedido nome completo nem e-mail. Em turmas marcadas como participantes de pesquisa, ele informa também o código de participante (P01 a P99) dos formulários de pré e pós-teste.                                                |
| Moderação              | Apelidos e nomes de usuário com palavras ofensivas são recusados no cadastro (lista editável em `public/js/core/util.js`).                                                                                                                                                                                               |
| Privacidade            | Política de privacidade e termos de uso, aceitos no cadastro de alunos e professores.                                                                                                                                                                                                                                    |
| Mundo RPG              | Escritório da DevNova com corredor e 7 salas. O aluno anda com o teclado, o mouse ou o toque, conversa com os personagens e inicia as missões. Cada porta abre quando a missão anterior é concluída.                                                                                                                     |
| Missões                | 7 missões, uma por etapa do processo (requisitos, planejamento, programação, testes, integração contínua, entrega contínua e manutenção), com 23 desafios de quatro tipos: escolha, classificação, montagem da Sprint e ordenação.                                                                                       |
| Trilha de aprendizagem | 21 lições (duas básicas e uma de aprofundamento por tema), cada uma com uma verificação rápida. As lições de aprofundamento são liberadas depois da missão do tema.                                                                                                                                                      |
| Recomendações          | O sistema indica o que estudar com base no desempenho do aluno: revisar um tema em que ele teve dificuldade, preparar-se para a próxima missão ou aprofundar um tema já concluído.                                                                                                                                       |
| Gamificação            | XP, níveis (Estagiário(a) a Tech Lead), estrelas por missão, itens na mochila, medidor de qualidade do projeto e uma consequência: um requisito classificado errado na primeira missão volta como defeito na manutenção.                                                                                                 |
| Ranking                | Classificação por XP entre os colegas da mesma turma. Mostra apenas apelidos.                                                                                                                                                                                                                                            |
| Fotos                  | O professor pode colocar foto na própria conta. Em cada turma, o professor decide se os alunos podem usar foto no personagem (vem desligado). A foto aparece no mapa, na barra superior e no ranking, e o professor pode removê-la. As imagens são reduzidas para 160 x 160 pixels no navegador antes de serem enviadas. |
| Painel do professor    | Gestão das turmas e, para cada turma, indicadores, acerto de primeira por tema, progresso na trilha, desafios com mais erros, tabela de alunos e exportação dos dados em CSV.                                                                                                                                            |

## Estrutura do projeto

O site segue o padrão **MVC** (Model-View-Controller) e o servidor é dividido em módulos pequenos, um por responsabilidade. A explicação completa, com o mapa de todos os arquivos, os fluxos entre as camadas e guias passo a passo (adicionar lição, desafio, tela ou rota), está em **[docs/ARQUITETURA.md](docs/ARQUITETURA.md)**.

```
public/                     o site (tudo o que o navegador recebe)
├── index.html              página única
├── css/                    estilos em camadas: tokens, base, layout, componentes/, telas/, utilitários
└── js/
    ├── core/               utilitários sem regra de negócio (templates, imagem, validações)
    ├── models/             regras do jogo, acesso aos dados e conteúdo editável (models/dados/)
    ├── views/              telas (só desenham e repassam cliques)
    └── controllers/        coordenam views e models; aluno/ tem um controller por área
servidor.js                 ponto de partida do servidor
servidor/                   módulos do servidor: armazenamento, segurança, HTTP e rotas/
test/                       testes automatizados (npm test)
docs/ARQUITETURA.md         como o código está organizado e como alterá-lo
.github/workflows/ci.yml    integração contínua no GitHub
render.yaml, package.json   publicação gratuita no Render
firestore.rules, firebase.json   alternativa com Firebase
```

O servidor só entrega aos visitantes o que está dentro de `public/`. O código do servidor, os testes e a pasta `dados/` ficam de fora por causa da própria estrutura.

### Onde editar o quê

| Quero mudar...                         | Arquivo                                                                                    |
| -------------------------------------- | ------------------------------------------------------------------------------------------ |
| Lições da trilha                       | `public/js/models/dados/trilha.js`                                                         |
| Missões, desafios, falas e itens       | `public/js/models/dados/missoes.js`                                                        |
| Mapa do escritório                     | `public/js/models/dados/mapa.js`                                                           |
| Pontuação, níveis e XP                 | `public/js/config.js`                                                                      |
| Regras de recomendação de estudo       | `public/js/models/PerfilModel.js` (função `recomendacao`)                                  |
| Palavras bloqueadas em apelidos        | `public/js/core/util.js` (`termosBloqueados`)                                              |
| Pontuação usada no ranking do servidor | `servidor/config.js` (`NIVEIS`)                                                            |
| Texto da política de privacidade       | `public/js/views/PrivacidadeView.js`                                                       |
| Tamanho máximo das fotos               | `public/js/core/imagem.js` (tamanho da imagem) e `servidor/config.js` (`TAMANHO_MAX_FOTO`) |
| Regras de acesso do servidor           | `servidor/seguranca.js` e os arquivos de `servidor/rotas/`                                 |
| Visual                                 | `public/css/style.css`                                                                     |

Os arquivos do site são scripts comuns (sem `import`/`export`), carregados em ordem pelo `public/index.html`, respeitando as dependências: core, models, views, controllers e, por último, `main.js`. Assim o projeto não precisa de nenhuma etapa de compilação.

## Desenvolvimento

O projeto segue as práticas usuais de equipes de software: formatação automática, verificação de código, testes automatizados e integração contínua. Para usar as ferramentas, rode `npm install` uma vez na pasta do projeto.

| Comando          | O que faz                                                                           |
| ---------------- | ----------------------------------------------------------------------------------- |
| `npm start`      | inicia o servidor                                                                   |
| `npm run dev`    | inicia o servidor e reinicia sozinho a cada alteração em arquivos do servidor       |
| `npm test`       | roda os testes automatizados (regras do jogo e servidor)                            |
| `npm run lint`   | verifica o JavaScript (ESLint) e o CSS (Stylelint)                                  |
| `npm run format` | formata todos os arquivos (Prettier)                                                |
| `npm run check`  | confere formatação, verificação e testes de uma vez; rode antes de enviar ao GitHub |

A cada envio ao GitHub, o arquivo `.github/workflows/ci.yml` roda as mesmas verificações automaticamente, e o resultado aparece na aba **Actions** do repositório. No VS Code, as extensões **Prettier**, **ESLint**, **Stylelint** e **EditorConfig** aplicam as mesmas regras enquanto você digita.

As versões das ferramentas e do pacote do banco estão fixadas no `package.json` e no `package-lock.json`, para que todos usem exatamente as mesmas. Elas foram escolhidas entre versões publicadas há pelo menos duas semanas, uma precaução contra pacotes comprometidos.

## Colocar online de graça (Render + Neon)

Com esta opção, o jogo fica acessível pela internet, de qualquer lugar, com um endereço como `https://software-quest.onrender.com`. O projeto já vem com tudo configurado (`render.yaml` e `package.json`); você só precisa criar três contas gratuitas e colar um endereço.

| Serviço                      | Para que serve                                          | Plano gratuito                                                                      |
| ---------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| [GitHub](https://github.com) | Guarda o código do projeto                              | Gratuito                                                                            |
| [Neon](https://neon.com)     | Banco de dados PostgreSQL onde ficam contas e progresso | 0,5 GB de armazenamento e 100 horas de processamento por mês, sem prazo de validade |
| [Render](https://render.com) | Roda o `servidor.js` na internet, com HTTPS             | 750 horas por mês, suficientes para um serviço ligado o mês inteiro                 |

### 1. Enviar o projeto para o GitHub

1. Crie uma conta em https://github.com e clique em **New repository**. Dê o nome `software-quest`; pode ser **Private**.
2. Na página do repositório, clique em **uploading an existing file** e arraste **o conteúdo** da pasta `software-quest` (os arquivos e as pastas `css`, `js` e `.vscode`). Não envie as pastas `dados` e `node_modules`, se existirem.
3. Clique em **Commit changes**.

Se você usa Git no terminal: `git init`, `git add .`, `git commit -m "Software Quest"` e siga as instruções do GitHub para enviar (`git remote add origin ...` e `git push`). O arquivo `.gitignore` já impede o envio dos dados e senhas locais.

### 2. Criar o banco de dados no Neon

1. Crie uma conta em https://neon.com (dá para entrar com a conta do GitHub).
2. Crie um projeto chamado `software-quest`. Na região, escolha a mais próxima do Brasil entre as disponíveis.
3. Na tela do projeto, clique em **Connect** e copie a **connection string**. Ela começa com `postgresql://` e termina com `sslmode=require`.

Guarde esse endereço com cuidado: ele contém a senha do banco. Não o coloque em nenhum arquivo do projeto.

### 3. Publicar no Render

1. Crie uma conta em https://render.com, entrando com a conta do GitHub.
2. No painel, clique em **New > Blueprint** e escolha o repositório `software-quest`. O Render lê o arquivo `render.yaml` e já configura tudo.
3. Quando pedir o valor de **DATABASE_URL**, cole a connection string do Neon.
4. Clique em **Deploy Blueprint** e espere alguns minutos.
5. Abra o serviço `software-quest` no painel: o endereço público aparece no topo, no formato `https://software-quest-xxxx.onrender.com`.

Pronto. Abra o endereço, crie sua conta de professor, crie uma turma e passe o link e o código para os alunos. O servidor cria sozinho a tabela no banco na primeira vez.

### Atualizar o jogo

Toda alteração enviada ao GitHub é publicada automaticamente pelo Render em poucos minutos.

### Backup e migração dos dados

Os comandos abaixo rodam no seu computador e acessam o banco online. Na primeira vez, rode `npm install` na pasta do projeto.

```bash
# macOS e Linux
DATABASE_URL="cole-a-connection-string" node servidor.js exportar backup.json

# Windows (PowerShell)
$env:DATABASE_URL="cole-a-connection-string"; node servidor.js exportar backup.json
```

- **Backup:** `node servidor.js exportar backup.json` copia todos os dados para um arquivo.
- **Levar os dados do servidor local para o online:** `node servidor.js importar dados/banco.json --substituir`, com a `DATABASE_URL` definida como acima. Depois, no painel do Render, clique em **Manual Deploy > Restart service** para o servidor carregar os dados importados. O mesmo vale para restaurar um backup.
- **Senha esquecida de professor:** `node servidor.js redefinir-senha professor@email.com nova-senha`, também com a `DATABASE_URL` definida, seguido do restart do serviço.

### O que saber sobre os planos gratuitos

- **O servidor dorme:** o Render desliga o serviço depois de 15 minutos sem acessos, e o primeiro acesso seguinte leva cerca de um minuto para acordá-lo (aparece uma tela de carregamento). Abra o link uns dois minutos antes da aula. Nenhum dado se perde quando ele dorme.
- **O banco também pausa:** o Neon suspende o banco depois de 5 minutos sem uso e o reativa sozinho na próxima gravação.
- **Limites:** para algumas turmas, o uso fica bem abaixo dos limites gratuitos. Os planos podem mudar; confira as páginas de preços do Render e do Neon.

## Alternativa: colocar na internet com o Firebase

Em vez do Render + Neon, você pode usar o Firebase. Ele não dorme, mas exige mais passos de configuração e não permite que o professor redefina a senha dos alunos no plano gratuito. Quando o campo `firebase` de `public/js/config.js` está preenchido, o sistema passa a usar o Firebase no lugar do servidor local, sem nenhuma outra mudança no código.

O plano gratuito do Firebase (Spark) atende uma turma do tamanho desta pesquisa. Consulte os limites atuais em https://firebase.google.com/pricing.

### 1. Criar o projeto

1. Acesse https://console.firebase.google.com e clique em "Adicionar projeto".
2. Dê um nome (por exemplo, `software-quest`) e conclua. O Google Analytics pode ficar desativado.

### 2. Ativar o login

1. No menu, abra **Authentication** e clique em "Vamos começar".
2. Na aba **Método de login**, ative **E-mail/senha**.
3. Na aba **Modelos**, você pode traduzir e personalizar o e-mail de redefinição de senha dos professores.

Os alunos não usam e-mail. O sistema monta internamente um endereço a partir do código da turma e do nome de usuário (por exemplo, `qx742b.ana_b@alunos.softwarequest.app`), que nunca é exibido nem recebe mensagens.

### 3. Criar o banco de dados

1. No menu, abra **Firestore Database** e clique em "Criar banco de dados".
2. Escolha o local `southamerica-east1 (São Paulo)` e inicie no **modo de produção**.
3. Abra a aba **Regras**, apague o conteúdo, cole todo o arquivo `firestore.rules` e clique em **Publicar**.

### 4. Conectar o sistema ao projeto

1. Em **Configurações do projeto** (ícone de engrenagem), na seção "Seus apps", clique no ícone `</>` para registrar um app da Web.
2. Copie o objeto `firebaseConfig` que aparece.
3. Em `public/js/config.js`, troque `firebase: null` pelo conteúdo desse objeto. Há um exemplo comentado no próprio arquivo: cole só o que está entre as chaves, sem `const firebaseConfig =`.
4. Ainda em `public/js/config.js`, preencha o bloco `privacidade` com o nome do responsável pela plataforma, o e-mail de contato e a data. Esses dados aparecem na política de privacidade.

### 5. Testar no seu computador

Rode `node servidor.js` e acesse `http://localhost:3000`. Com o Firebase preenchido, o servidor só entrega as páginas, e as contas e os dados vão para o Firebase. Crie uma conta de professor, crie uma turma e cadastre um aluno de teste com o código gerado.

### 6. Publicar o site

Com o [Node.js](https://nodejs.org) instalado, rode na pasta do projeto:

```bash
npm install -g firebase-tools
firebase login
firebase use --add        # escolha o projeto criado no passo 1
firebase deploy
```

O endereço aparece no final, no formato `https://software-quest-xxxx.web.app`. Esse é o link da plataforma, para professores e alunos.

**Alternativa com GitHub Pages ou Cloudflare Pages:** publique a pasta do projeto e, em **Authentication > Configurações > Domínios autorizados**, adicione o domínio do site (por exemplo, `seu-usuario.github.io`).

### Como um professor começa a usar

1. Acessa o site, escolhe **Sou professor > Cadastre-se** e cria a conta.
2. No painel, clica em **+ Nova turma**. Se a turma fizer parte de uma pesquisa, marca a opção correspondente.
3. Copia a instrução com o código da turma e envia para os alunos.
4. Os alunos escolhem **Sou aluno > Primeiro acesso**, digitam o código e criam a conta.
5. Quando todos tiverem entrado, o professor pode desmarcar **Aceitar novos cadastros**.

## Dados coletados para a pesquisa

Com o `servidor.js`, os dados ficam em `dados/banco.json` (no computador) ou na tabela `softwarequest_dados` do PostgreSQL (online), com as mesmas regras de acesso aplicadas pelo servidor. No Firebase, ficam nas coleções abaixo:

| Coleção       | Conteúdo                                                                                                      | Quem pode ler                                                                   |
| ------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `professores` | Nome, escola e e-mail do professor                                                                            | O próprio professor                                                             |
| `turmas`      | Nome, escola, código de acesso, se participa de pesquisa e se aceita cadastros                                | O professor dono da turma                                                       |
| `codigos`     | Índice do código de acesso para a turma (usado no cadastro do aluno)                                          | Qualquer pessoa que já saiba o código; a lista completa não pode ser consultada |
| `users`       | Usuário, apelido, turma, personagem, código de pesquisa (se houver), XP, qualidade, lições e missões          | O próprio aluno e o professor da turma                                          |
| `ranking`     | Apelido, turma, XP, nível e número de missões                                                                 | Colegas da mesma turma e o professor dela                                       |
| `eventos`     | Um registro por desafio, lição e missão: tentativas, acerto de primeira, pontos, tempo e se foi uma repetição | Apenas o professor da turma                                                     |

No painel do professor há dois arquivos para exportar:

- **CSV de eventos:** um registro por desafio, lição ou missão, pronto para análise estatística.
- **CSV de resumo:** uma linha por aluno, com pontos, acertos de primeira e tempo em cada missão.

Em turmas de pesquisa, a coluna `codigo_pesquisa` permite cruzar os dados do jogo com os formulários de pré e pós-teste. As estatísticas do painel consideram apenas a primeira vez que cada aluno fez cada desafio; as repetições ficam marcadas com `repeticao = 1` no CSV.

O sistema não coleta nome completo, e-mail nem outros dados pessoais dos alunos, o que ajuda no cumprimento da LGPD. Antes de abrir a plataforma ao público, revise a política de privacidade (em `public/js/views/PrivacidadeView.js`) com apoio jurídico ou da sua instituição.

## Limitações conhecidas

- **Senha esquecida de aluno no Firebase:** no servidor local, o professor redefine pelo painel. No modo Firebase isso não é possível no plano gratuito (exigiria Cloud Functions, do plano Blaze); o aluno pode criar uma conta nova na mesma turma com outro nome de usuário. No Firebase, professores recuperam a senha por e-mail.
- **Servidor local só na rede da escola:** rodando no seu computador, o `servidor.js` usa HTTP simples e serve para a rede interna. Para acesso pela internet, publique no Render (que fornece HTTPS) ou use o Firebase.
- **Contas de professor abertas:** qualquer pessoa pode criar uma conta de professor. Ela só vê as turmas que ela mesma criar, mas não há verificação de que é de fato um professor.
- **Dados editáveis pelo aluno:** um aluno com conhecimento técnico poderia alterar o próprio XP pelo navegador e subir no ranking da turma. Para a pesquisa, use os dados da coleção `eventos`, que não podem ser alterados depois de criados. Validar a pontuação no servidor também exigiria Cloud Functions.
- **Remoção de alunos:** o painel não remove contas. No Firebase, use o console (Authentication, `users` e `ranking`). No servidor local, apague o aluno em `dados/banco.json` com o servidor desligado.
- **Missão abandonada:** se o aluno sair no meio de uma missão, ela recomeça do início. Os desafios já respondidos continuam registrados em `eventos`.
- **Regras de segurança:** teste as regras do `firestore.rules` no **Rules Playground** do console do Firebase (aba Regras) antes de abrir a plataforma ao público.

## Problemas comuns

- **Tela "Inicie o servidor do Software Quest":** o servidor não está rodando ou a página foi aberta direto pelo arquivo. Aperte F5 no VS Code (ou rode `node servidor.js`) e acesse `http://localhost:3000`.
- **Os alunos não conseguem abrir o endereço da rede:** confira se estão no mesmo Wi-Fi e se o firewall do computador permite o Node.js em redes privadas.
- **O Render mostra erro ao iniciar, citando o banco:** confira se a `DATABASE_URL` foi colada completa, de `postgresql://` até `sslmode=require`. Para corrigir, abra o serviço no Render, vá em **Environment**, edite o valor e salve (ele reinicia sozinho). Os detalhes do erro aparecem em **Logs**.
- **No site publicado, o mapa fica em branco depois de entrar:** algum arquivo do jogo não chegou ao GitHub. Rode `npm test`: o teste "nenhum arquivo do site é ignorado pelo Git" aponta quais arquivos estão faltando. Confira também a aba **Actions** do repositório, que mostra ✗ quando isso acontece.
- **O link do Render demora para abrir:** é o servidor acordando depois de 15 minutos sem acesso; espere cerca de um minuto.
- **Tela em branco depois de configurar o Firebase:** confira se o `firebaseConfig` foi colado sem `const firebaseConfig =` e com a vírgula depois da chave de fechamento. Aperte F12 e veja a mensagem em vermelho na aba Console.
- **"Sem permissão para esta ação":** as regras do `firestore.rules` não foram publicadas no passo 3.
- **Mensagem pedindo para criar um índice:** se aparecer no Console (F12) um erro do Firestore com um link para criar um índice, clique no link e confirme. O índice fica pronto em alguns minutos.
- **O login não funciona no site publicado fora do Firebase:** o domínio não foi adicionado em **Authentication > Configurações > Domínios autorizados**.

## Tecnologias

HTML, CSS e JavaScript, sem frameworks nem etapa de compilação. Servidor em Node.js, com dados em arquivo JSON (local) ou PostgreSQL (online, pacote `pg`) e senhas protegidas com scrypt. Opcionalmente, Firebase Authentication e Cloud Firestore para publicar na internet. O mapa do jogo é desenhado com a API Canvas do navegador.
