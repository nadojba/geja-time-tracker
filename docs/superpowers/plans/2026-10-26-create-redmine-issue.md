# Cadastro de chamados no Redmine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Criar chamados no Redmine a partir de uma modal na Sidebar.

**Architecture:** O formulário permanece no React compartilhado, envia uma mensagem tipada ao service worker, e o client centralizado executa o POST autenticado. Após sucesso, o App recarrega os chamados e oferece abertura do novo chamado.

**Tech Stack:** WXT, React, TypeScript, React Hook Form, Zod, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-26-create-redmine-issue-design.md`

## Global Constraints

- A API Key não sai do contexto confiável da extensão.
- Chamados só podem ser criados na conta Redmine atualmente conectada.
- O usuário precisa confirmar explicitamente o envio.
- Não enviar requisições reais nos testes.

## Review Focus

- Projeto ausente ou inválido deve impedir o POST.
- Assunto vazio deve mostrar erro sem perder a descrição.
- `403` e `422` devem aparecer como erro compreensível.
- Servidor sem opções de tracker/status/prioridade deve continuar permitindo criação com os campos opcionais vazios.
- Sucesso deve atualizar a lista sem duplicar o chamado localmente.

### Task 1: Client e protocolo

**Files:** `src/services/redmine/client.ts`, `src/services/messaging/protocol.ts`, `src/background.ts`, `tests/services/redmine-client.test.ts`

- [ ] Escrever teste falho para `RedmineClient.createIssue` validando método, endpoint, payload e retorno.
- [ ] Executar o teste e confirmar falha por método ausente.
- [ ] Implementar `createIssue` e a mensagem `CREATE_ISSUE` no service worker, validando host e conta conectada.
- [ ] Executar o teste focal e a suíte.

### Task 2: Modal e integração da Sidebar

**Files:** `src/shared/App.tsx`, `src/styles/app.css`

- [ ] Adicionar botão `Novo chamado` na aba Chamados.
- [ ] Criar modal com React Hook Form/Zod e carregar projetos ao abrir.
- [ ] Enviar a mensagem tipada, mostrar estados de envio/erro/sucesso e atualizar chamados.
- [ ] Adicionar contraste, foco, responsividade e suporte ao tema escuro.

### Task 3: Documentação e validação

**Files:** `README.md`, `docs/IMPLEMENTATION_STATUS.md`

- [ ] Documentar o fluxo e permissões necessárias.
- [ ] Executar typecheck, lint, testes, build e `git diff --check`.
- [ ] Gerar e validar o ZIP da extensão quando o build estiver verde.
