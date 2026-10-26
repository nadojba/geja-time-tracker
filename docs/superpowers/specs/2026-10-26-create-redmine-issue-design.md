# Cadastro de chamados na Sidebar

## Objetivo

Permitir criar um chamado no Redmine diretamente pela Sidebar da extensão, sem expor a API Key ao contexto visual ou ao content script.

## Escopo

- Modal acessível na aba **Chamados** da Sidebar.
- Projeto e assunto obrigatórios.
- Descrição, tipo, status e prioridade opcionais.
- Projetos carregados pelo endpoint existente `GET /projects.json`.
- Envio autenticado pelo service worker via `POST /issues.json`.
- Mensagens claras para falta de permissão, validação e erros da API.
- Atualização da lista de chamados após criação e ação para abrir o novo chamado.

## Decisões

- Reutilizar o `App` e o protocolo de mensagens existentes; não criar uma segunda regra de negócio para a Sidebar.
- Manter campos opcionais vazios quando o servidor não fornecer opções compatíveis, permitindo que o Redmine use seus padrões.
- Usar React Hook Form e Zod apenas na modal, mantendo a API Key restrita ao service worker.
- Não criar chamados automaticamente nem alterar o status de tarefas existentes.

## Fora do escopo

- Anexos, watchers, relações entre chamados e criação em lote.
- Alteração de chamados após a criação.
- Backend próprio ou persistência adicional local para rascunhos.
