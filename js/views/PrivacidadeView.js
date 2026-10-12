/* =================================================================
   VIEW / PRIVACIDADE — política de privacidade e termos de uso
   O texto fica na função conteudo(); os dados do responsável vêm de
   SQ.config.privacidade. Revise este texto com apoio jurídico antes de
   abrir a plataforma ao público.
   ================================================================= */
window.SQ = window.SQ || {};
SQ.views = SQ.views || {};

SQ.views.Privacidade = (function () {
  /* ---------- Conteúdo: cada seção tem um título e parágrafos (texto) ou listas (array) ---------- */
  function conteudo(pv) {
    return [
      {
        titulo: 'Quem somos',
        partes: [
          `O Software Quest é uma plataforma educacional gratuita para o ensino de processos de desenvolvimento de software. O responsável pelo tratamento dos dados é ${pv.responsavel}, que pode ser contatado pelo e-mail ${pv.contato}.`
        ]
      },
      {
        titulo: 'Quais dados coletamos',
        partes: [
          [
            'Professores: nome, escola, e-mail e as turmas que criam.',
            'Alunos: nome de usuário, apelido, turma, cor e especialidade do personagem e, em turmas de pesquisa, o código de participante. Não pedimos nome completo, e-mail, telefone, endereço ou documentos.',
            'Fotos (opcionais): professores podem colocar uma foto na própria conta. Alunos só podem colocar foto no personagem se o professor liberar fotos na turma; a foto aparece no mapa e no ranking da turma. As imagens são reduzidas para 160 x 160 pixels antes de serem salvas.',
            'Uso da plataforma: lições e missões concluídas, respostas aos desafios (acertos, tentativas e tempo), pontuação e data do último acesso.'
          ]
        ]
      },
      {
        titulo: 'Para que usamos os dados',
        partes: [
          [
            'Fazer o jogo funcionar: salvar o progresso, calcular a pontuação e montar o ranking da turma.',
            'Permitir que o professor acompanhe a aprendizagem da própria turma.',
            'Em turmas marcadas como participantes de pesquisa, e apenas com o consentimento previsto no projeto de pesquisa, analisar os dados de forma agregada e sem identificação dos alunos.'
          ]
        ]
      },
      {
        titulo: 'Quem pode ver os dados',
        partes: [
          [
            'O aluno vê os próprios dados e o ranking da sua turma, que mostra apenas apelidos.',
            'O professor vê os dados dos alunos das turmas que ele criou, e de nenhuma outra.',
            'Os dados não são vendidos nem compartilhados com terceiros para fins comerciais. Eles ficam armazenados no servidor da plataforma, que, conforme a instalação, pode ser um computador da escola ou um serviço de hospedagem (como Render e Neon, ou Google Firebase).'
          ]
        ]
      },
      {
        titulo: 'Crianças e adolescentes',
        partes: [
          'A plataforma é usada principalmente por estudantes menores de idade, sempre por meio de uma turma criada por um professor. Seguimos a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), coletando apenas o mínimo necessário e no melhor interesse dos estudantes. Escolas e professores são responsáveis por informar os responsáveis legais sobre o uso da plataforma e, quando necessário, obter o consentimento deles.',
          'As fotos de alunos vêm desativadas em toda turma nova. Recomendamos que o professor só as libere com autorização dos responsáveis e oriente os alunos a usar uma imagem que os represente, não necessariamente uma foto do rosto. O professor pode remover qualquer foto pelo painel, e desativar as fotos da turma remove todas elas.'
        ]
      },
      {
        titulo: 'Seus direitos',
        partes: [
          `Você pode pedir acesso, correção ou exclusão dos seus dados pelo e-mail ${pv.contato}. Alunos também podem fazer o pedido por meio do professor da turma.`
        ]
      },
      {
        titulo: 'Termos de uso',
        partes: [
          [
            'Use apelidos e nomes de usuário respeitosos. Contas com conteúdo ofensivo podem ser removidas.',
            'Não tente acessar dados de outras pessoas nem alterar a pontuação de forma indevida.',
            'A plataforma é oferecida gratuitamente, como está, e pode passar por mudanças e interrupções.'
          ]
        ]
      }
    ];
  }

  /* ---------- Montagem ---------- */
  return function (container, pv, { fechar }) {
    const html = SQ.html;
    const parte = p =>
      Array.isArray(p)
        ? html`<ul>
            ${p.map(item => html`<li>${item}</li>`)}
          </ul>`
        : html`<p>${p}</p>`;
    const secao = s =>
      html`<h3>${s.titulo}</h3>
        ${s.partes.map(parte)}`;

    container.replaceChildren(
      html` <article class="lesson">
        <p class="muted">Última atualização: ${pv.atualizadaEm}</p>
        ${conteudo(pv).map(secao)}
        <div class="actions">
          <button class="btn" onclick=${fechar}>Fechar</button>
        </div>
      </article>`
    );
  };
})();
