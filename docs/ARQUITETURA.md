# Arquitetura do Software Quest

Este documento explica como o código está organizado e mostra, passo a passo, como fazer as alterações mais comuns. Para instalar e publicar, veja o [README](../README.md).

## Visão geral

O sistema tem duas partes:

- **O site (pasta `js/`)**, que roda no navegador, organizado no padrão MVC.
- **O servidor (`servidor.js` e pasta `servidor/`)**, que guarda contas e dados. Em vez dele, também é possível usar o Firebase.

```
 NAVEGADOR                                                        DADOS
┌──────────────────────────────────────────────────────┐
│  Views  ──ações──▶  Controllers  ──usa──▶  Models    │
│  (tela)  ◀─dados──  (coordenam)            (regras)  │
│                                               │      │
│                                        Repositorio   │
└───────────────────────────────────────────────┼──────┘
                                                │ fetch /api/...
                          ┌─────────────────────┴──────────────┐
                          ▼                                    ▼
                 servidor.js (Node.js)                  Firebase (opcional)
                 dados/banco.json ou PostgreSQL         Authentication + Firestore
```

## As três camadas do site

| Camada         | Pasta             | O que faz                                                                                                         | O que **não** faz                      |
| -------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| **Model**      | `js/models/`      | Guarda o conteúdo, aplica as regras do jogo (XP, níveis, correção dos desafios, recomendações) e acessa os dados. | Não mexe na tela.                      |
| **View**       | `js/views/`       | Desenha a tela e avisa o controller quando o usuário clica, digita ou toca.                                       | Não decide nada e não acessa os dados. |
| **Controller** | `js/controllers/` | Recebe as ações das views, consulta e atualiza os models e manda as views se atualizarem.                         | Não desenha elementos diretamente.     |

Regra prática: se a dúvida é **"o que acontece?"**, o lugar é um model; **"como aparece?"**, uma view; **"quando e em que ordem?"**, um controller.

### Mapa dos arquivos do site

```
js/
├── config.js                 configuração (Firebase opcional, pontuação, níveis, privacidade)
├── main.js                   ponto de partida
├── core/                     utilitários sem regra de negócio
│   ├── util.js               códigos de turma, validações, CSV, filtro de palavras, personagens
│   ├── html.js               templates HTML seguros usados por todas as telas (SQ.html)
│   ├── dom.js                avatar (foto ou inicial), avisos e janelas sobrepostas
│   └── imagem.js             recorta e reduz fotos para 160 x 160 antes de enviar
├── models/
│   ├── dados/                CONTEÚDO EDITÁVEL
│   │   ├── trilha.js         lições
│   │   ├── missoes.js        missões, personagens e desafios
│   │   └── mapa.js           mapa do escritório
│   ├── PerfilModel.js        XP, níveis, salas, missões e lições concluídas, recomendações
│   ├── MissaoModel.js        uma missão em andamento: correção, tentativas, pontos, estrelas
│   ├── MundoModel.js         posição no mapa, colisões, portas, caminhos
│   ├── PainelModel.js        estatísticas da turma e arquivos CSV
│   └── Repositorio.js        acesso aos dados (servidor ou Firebase, mesma interface)
├── views/
│   ├── Componentes.js        peças reaproveitadas: seletor de foto, de cor e de especialidade
│   ├── AppView.js            telas de carregamento e de erro
│   ├── LoginView.js          entrada e cadastro
│   ├── AlunoView.js          estrutura da tela do aluno (barra, painel lateral, diálogos)
│   ├── MundoView.js          desenho do mapa no canvas, teclado e toque
│   ├── MissaoView.js         desafios e resumo da missão
│   ├── TrilhaView.js         lista de módulos e lição
│   ├── ColecoesView.js       diário de missões, mochila e ranking
│   ├── PerfilView.js         "Meu personagem" (foto, cor, especialidade)
│   ├── ContaView.js          "Minha conta" do professor
│   ├── PainelView.js         painel do professor
│   └── PrivacidadeView.js    política de privacidade
└── controllers/
    ├── AppController.js      inicia e escolhe a tela conforme quem está logado
    ├── AuthController.js     valida login e cadastro
    ├── ProfessorController.js  turmas, dados da turma, conta, fotos e exportação
    └── aluno/                a experiência do aluno, dividida por área
        ├── AlunoController.js     monta tudo e cria o contexto compartilhado (ctx)
        ├── MundoController.js     andar e conversar
        ├── MissaoController.js    jogar uma missão
        ├── TrilhaController.js    estudar as lições
        ├── ColecoesController.js  diário, mochila e ranking
        └── PerfilController.js    foto, cor e especialidade
```

### Como as telas são escritas

Cada tela é escrita como **HTML dentro do JavaScript**, com o utilitário `SQ.html` (arquivo `js/core/html.js`). Assim, quem abre o arquivo enxerga a estrutura da tela como ela aparece, sem precisar montar a página de cabeça.

```js
SQ.views.Conta = function (container, { prof }, handlers) {
  const html = SQ.html;

  /* ---------- Montagem ---------- */
  const tela = html` <form class="form-grid" onsubmit=${enviar}>
    <div class="field">
      <label for="conta-nome">Nome</label>
      <input id="conta-nome" value="${prof.nome}" data-ref="nome" />
    </div>
    <p class="error-msg" role="alert" data-ref="erro"></p>
    <button class="btn" type="submit">Salvar</button>
  </form>`;
  const refs = html.refs(tela);
  container.replaceChildren(tela);

  /* ---------- Eventos ---------- */
  async function enviar(evento) {
    evento.preventDefault();
    try {
      await handlers.salvar({ nome: refs.nome.value });
    } catch (x) {
      refs.erro.textContent = x.message;
    }
  }
};
```

O que cada parte faz:

| No template                               | O que acontece                                                                                                   |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `${texto}`                                | o texto é **escapado**: um apelido como `<b>Ana</b>` aparece literalmente, nunca vira HTML                       |
| `onclick=${funcao}`                       | a função vira o tratamento do clique; vale para qualquer evento (`onchange`, `oninput`, `onsubmit`, `onkeydown`) |
| `${elemento}` ou `${lista}`               | um componente (como `SQ.dom.avatar(...)`) ou uma lista de templates é inserido no lugar                          |
| `${condicao ? html`...` : null}`          | parte opcional: `null`, `undefined` e `false` não aparecem                                                       |
| `${html.atributos({ disabled: true })}`   | atributos opcionais (`true` vira atributo sem valor; `false` e `null` somem)                                     |
| `data-ref="nome"` + `html.refs(tela)`     | dá acesso ao elemento depois (`refs.nome`) para ler valores ou atualizar a tela                                  |
| `data-campo="nome"` (só na tela de login) | o campo recebe o foco quando o erro de validação é dele                                                          |

Todas as telas seguem a mesma ordem dentro do arquivo: **Montagem** (o HTML), **Eventos** (o que acontece em cada clique) e, quando a tela muda durante o uso, **Atualização** (funções que redesenham uma parte). Telas grandes, como o painel do professor, são divididas em funções menores com nomes que descrevem cada parte (`cartaoTurma`, `tabelaAlunos`, `graficos`), cada uma com seu próprio template.

**Espaços e quebras de linha.** Entre duas tags, a quebra de linha e a indentação do template são ignoradas, então dá para indentar o HTML à vontade. Com texto de um dos lados, a quebra vira um espaço, como no HTML comum. Isso permite que o Prettier formate os templates sem mudar o que aparece na tela.

### O contexto compartilhado do aluno (`ctx`)

O `AlunoController` cria um objeto `ctx` com tudo o que as áreas do aluno compartilham e entrega esse objeto a cada controller da pasta `aluno/`.

| Em `ctx`                                              | O que é                                                           |
| ----------------------------------------------------- | ----------------------------------------------------------------- |
| `perfil`                                              | o progresso do aluno (o mesmo objeto que é salvo)                 |
| `view`, `mundoView`, `mundoModel`                     | a tela do aluno, o desenho do mapa e as regras do mapa            |
| `salvar()`, `evento()`                                | salvar o progresso e registrar um evento de pesquisa              |
| `atualizarTudo()`                                     | redesenhar barra, painel lateral e mapa                           |
| `mundo`, `missao`, `trilha`, `colecoes`, `personagem` | as ações de cada área (por exemplo, `ctx.trilha.abrir('testes')`) |

Assim, a missão pode abrir a trilha (`ctx.trilha.abrir`) sem conhecer os detalhes de como a trilha funciona.

## O servidor

```
servidor.js                  ponto de partida: junta os módulos e inicia
servidor/
├── config.js                porta, banco, limites (variáveis de ambiente)
├── erros.js                 erro com status HTTP (Falha) e atalhos
├── util.js                  validações puras (códigos, usuário, e-mail, foto)
├── armazenamento.js         arquivo JSON ou PostgreSQL, com a mesma interface
├── banco.js                 dados em memória e gravação agrupada
├── seguranca.js             senhas (scrypt), sessões, limites e regras de acesso
├── http.js                  roteador da API, leitura do corpo, arquivos do site
├── comandos.js              terminal: redefinir-senha, exportar, importar
└── rotas/
    ├── sessao.js            /api/saude, /api/sessao, /api/sair
    ├── professores.js       cadastro, login e "Minha conta"
    ├── turmas.js            turmas e código de acesso
    ├── alunos.js            cadastro, login, perfil, foto, eventos, ranking
    └── painel.js            dados da turma, nova senha e remoção de foto
```

Cada arquivo de rota exporta uma função que recebe `rota(metodo, caminho, funcao)` e registra suas rotas. A função de cada rota recebe `{ s, corpo, params, query, ip }`, onde `s` é a sessão de quem fez o pedido (ou `null`), e devolve o objeto que vai como resposta. Para recusar, chame `falha(status, codigo, mensagem)`.

## Fluxos do começo ao fim

### O aluno responde a um desafio

1. `MissaoView` coleta a resposta e chama `avaliar(resposta)`, que vem do `MissaoController`.
2. O controller pede ao `MissaoModel` para corrigir. Se errou, chama `PerfilModel.registrarErro` (a qualidade cai).
3. Quando o desafio termina, o controller registra o evento (`ctx.evento`), que o `Repositorio` envia para `POST /api/eventos`.
4. A view recebe o resultado e mostra o feedback.

### O aluno troca a foto do personagem

1. `PerfilView` usa `componentes.seletorFoto`, que reduz a imagem com `SQ.imagem.reduzir`.
2. O `PerfilController` chama `Repositorio.definirFoto`, que envia `PUT /api/perfil/foto`.
3. No servidor, `rotas/alunos.js` confere se a turma permite fotos e se a imagem é válida.
4. O controller atualiza a barra superior e o mapa (`mundoView.atualizarAvatar`).

### O professor cria uma turma

1. `PainelView` envia o formulário ao `ProfessorController`, que valida o nome.
2. `Repositorio.criarTurma` envia `POST /api/turmas`; o servidor gera o código e guarda a turma.
3. O controller recarrega os dados e a view mostra o cartão da turma com o código.

## Guias para alterações comuns

### Adicionar uma lição à trilha

Edite `js/models/dados/trilha.js`. No módulo desejado, acrescente um objeto à lista `licoes`, com `id` único, `titulo`, `minutos`, `blocos` e `verificacao`. Os tipos de bloco são `p`, `lista`, `exemplo`, `dica` e `codigo`. Para que ela só apareça depois da missão, use `aprofundamento: true`. Nenhum outro arquivo precisa mudar.

### Adicionar um desafio a uma missão

Edite `js/models/dados/missoes.js`. Na lista `desafios` da missão, acrescente um objeto com `id` único e um destes tipos:

| Tipo          | Campos principais                                                                                         |
| ------------- | --------------------------------------------------------------------------------------------------------- |
| `escolha`     | `enunciado`, `opcoes` (marque a certa com `correta: true` e explique cada uma em `porque`)                |
| `classificar` | `enunciado`, `categorias`, `itens` (cada item com `texto`, `correta` e `porque`), `explicacao`            |
| `selecionar`  | `enunciado`, `capacidade`, `itens` (com `id`, `texto`, `pontos`), `esperado` (ids corretos), `explicacao` |
| `ordenar`     | `enunciado`, `itens` na ordem correta, `explicacao`                                                       |

A correção já é feita pelo `MissaoModel`, e o painel do professor passa a mostrar o novo desafio sozinho.

### Criar um novo tipo de desafio

1. **Model:** em `MissaoModel.js`, acrescente o tipo ao objeto `verificadores`, devolvendo `{ ok, ...detalhes }`.
2. **View:** em `MissaoView.js`, crie a função que desenha o tipo e chama `handlers.avaliar(resposta)`, e registre-a no objeto de tipos no fim de `desafio()`.
3. Use o tipo novo em `missoes.js`.

### Criar uma tela nova no jogo do aluno

1. **View:** crie `js/views/MinhaTelaView.js` com uma função que recebe `(container, dados, handlers)` e desenha a tela com `SQ.html`, seguindo a ordem Montagem, Eventos e Atualização. Use outra view parecida como modelo.
2. **Controller:** crie `js/controllers/aluno/MinhaTelaController.js` no formato `SQ.controllers.aluno.MinhaTela = function (ctx) { ... return { abrir } }`.
3. Em `AlunoController.js`, registre-o em `ctx` e, se quiser um botão, acrescente-o ao menu em `AlunoView.js` e ao `onMenu`.
4. Inclua os dois arquivos no `index.html`, respeitando a ordem: views antes dos controllers, e os controllers da pasta `aluno/` antes do `AlunoController.js`.

### Criar uma rota nova no servidor

1. Escreva a rota no arquivo de `servidor/rotas/` do assunto, usando `seg.exigirAluno(s)` ou `seg.exigirProfessor(s)` para controlar o acesso.
2. Em `js/models/Repositorio.js`, acrescente o método correspondente ao objeto `Servidor` (e, se usar Firebase, ao objeto `Firebase`, com a regra equivalente em `firestore.rules`).
3. Chame o método a partir de um controller.

### Mudar a pontuação ou os níveis

Edite `js/config.js` (`pontosPorTentativa`, `maxTentativas`, `perdaQualidadePorErro`, `xpLicao`, `xpVerificacao`, `niveis`). Se mudar os níveis, atualize também `NIVEIS` em `servidor/config.js`, usado no ranking.

## Os estilos (pasta `css/`)

O CSS é dividido em camadas, da mais geral para a mais específica, seguindo a metodologia ITCSS. O `index.html` carrega os arquivos nessa ordem, e cada camada pode sobrescrever as anteriores:

```
css/
├── 01-tokens.css        decisões de design em variáveis: cores (claro e escuro), fontes, cantos, sombras, camadas
├── 02-base.css          elementos HTML puros: reset, tipografia, foco do teclado
├── 03-layout.css        estrutura das páginas: largura, grades das telas, linhas de botões
├── componentes/         peças reaproveitadas: botões, formulários, cartões, avatar, barra superior,
│                        mapa, diálogo, janela, aviso, tabela, questões e indicadores
├── telas/               o que é exclusivo de uma tela: login, missão, trilha, coleções, painel
└── 04-utilitarios.css   classes de propósito único (.hidden, .sr-only), carregadas por último
```

- **Use os tokens.** Em vez de escrever `border-radius: 14px` ou `color: #6b3fd6`, use `var(--raio-lg)` e `var(--line)`. Para mudar a cara do jogo inteiro, basta alterar `01-tokens.css`.
- **Uma declaração por linha**, com as media queries logo abaixo das regras que elas alteram, no mesmo arquivo.
- **Nomes de classe** em minúsculas, separados por hífen (o Stylelint confere).
- **Media queries no formato `(max-width: 720px)`.** O formato mais novo, `(width <= 720px)`, não funciona em iPhones com iOS anterior ao 16.4, comuns entre estudantes; por isso o Stylelint está configurado para exigir o formato tradicional.

## Qualidade e testes

| Ferramenta           | Arquivo de configuração    | O que garante                                                                                       |
| -------------------- | -------------------------- | --------------------------------------------------------------------------------------------------- |
| Prettier             | `.prettierrc.json`         | a mesma formatação em todos os arquivos                                                             |
| ESLint               | `eslint.config.js`         | ausência de erros comuns no JavaScript (variáveis não usadas, comparações frouxas, erros engolidos) |
| Stylelint            | `.stylelintrc.json`        | CSS válido e consistente                                                                            |
| EditorConfig         | `.editorconfig`            | indentação, quebras de linha e codificação iguais em qualquer editor                                |
| Testes (`node:test`) | `test/`                    | as regras do jogo e o servidor continuam funcionando                                                |
| GitHub Actions       | `.github/workflows/ci.yml` | tudo isso roda sozinho a cada envio ao GitHub                                                       |

Os testes ficam em dois arquivos:

- **`test/regras.test.js`** carrega os models do site dentro do Node, sem navegador, e confere pontuação, estrelas, níveis, a consequência na manutenção, recomendações, movimento no mapa e estatísticas do painel.
- **`test/servidor.test.js`** inicia servidores reais, cada um com dados temporários próprios, e confere contas, permissões entre professores e turmas, proteção dos arquivos, fotos, redefinição de senha e persistência depois de reiniciar.

Para acrescentar um teste, copie um bloco `it(...)` parecido no arquivo do assunto e rode `npm test`. Ao corrigir um defeito, escreva primeiro um teste que reproduz o problema; assim ele não volta.

## Convenções

- **Nomes em português**, iguais aos usados na interface (missão, trilha, turma, perfil).
- **Namespaces globais:** `SQ.models`, `SQ.views`, `SQ.controllers`, `SQ.dados`, `SQ.util`, `SQ.dom`. Os arquivos são scripts comuns, carregados em ordem pelo `index.html`, sem etapa de compilação.
- **Cabeçalho em todo arquivo**, dizendo em que camada ele está e o que faz.
- **Telas com `SQ.html`**, nunca montando HTML com concatenação de textos (`'<p>' + nome + '</p>'`), que deixaria a página vulnerável a códigos digitados pelos usuários.
- **Antes de enviar ao GitHub**, rode `npm run check`.
- **Erros mostrados ao usuário** são sempre frases completas em português. Nas views de formulário, o controller lança `Error` com `campo`, e a view foca esse campo.
- **Conteúdo separado do código:** tudo em `js/models/dados/` pode ser editado por professores sem conhecimento do resto do sistema.
