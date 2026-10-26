# Edição inline da duração do timer no widget do Redmine

## Intenção

Permitir que um duplo clique no tempo exibido pelo widget injetado no Redmine
troque o relógio por campos `HH:MM:SS`, para corrigir a duração da sessão sem
sair da página do chamado.

## Escopo

- O recurso fica disponível somente quando o widget representa a sessão ativa
  do chamado atual.
- A edição terá horas, minutos e segundos, com validação de valores não
  negativos, minutos e segundos entre 0 e 59.
- `Enter`/confirmação salva; `Esc` cancela; clicar fora não salva
  implicitamente.
- O valor editado será persistido pelo service worker, mantendo a sessão e o
  status atuais.
- Em sessão pausada, a duração persistida será ajustada diretamente.
- Em sessão em execução, o segmento atual será recalculado para que o relógio
  continue avançando a partir da nova duração.

## Fora do escopo

- Alterar horário de início/fim, data, chamado ou atividade.
- Editar sessões já encerradas/pedentes por este widget.
- Criar uma nova dependência ou substituir o modal de lançamento existente.

## Abordagens consideradas

- Modal: reutiliza a ideia do lançamento, mas não atende tão bem à edição
  diretamente no cronômetro.
- Edição inline com mensagem específica ao service worker: preserva o widget
  compacto, a autoridade de estado existente e permite manter a atualização
  por segundo. Esta é a abordagem escolhida.

## Decisões de implementação

- Adicionar uma operação de domínio para ajustar a duração da sessão ativa e
  uma mensagem de runtime correspondente.
- O content script manterá apenas o estado transitório dos inputs; o estado
  oficial continuará vindo do service worker.
- Após salvar ou receber erro, o widget sairá do modo de edição e exibirá o
  valor confirmado pelo próximo refresh.
- Serão adicionados testes de domínio para sessões pausadas/em execução e
  testes do fluxo de validação/renderização se a infraestrutura atual permitir.

