# Catálogo de chamados no board Implementation Plan

**Goal:** Permitir adicionar manualmente ao board chamados de todos os projetos acessíveis ao usuário.

**Architecture:** O App carregará o escopo `all` apenas quando a tela Board estiver ativa. O domínio terá funções separadas para preparar colunas e adicionar cards; a UI usará a lista de chamados como catálogo e o estado persistido do board como fonte de inclusão.

**Tech Stack:** React, TypeScript, WXT, Vitest, Redmine REST API já existente.

**Spec:** `docs/superpowers/specs/2026-10-23-board-issue-catalog-design.md`

## Tasks

- [ ] Criar testes de domínio para preparar colunas sem adicionar chamados e para adicionar um chamado uma única vez.
- [ ] Implementar as funções de domínio e ajustar o carregamento do Board para consultar chamados acessíveis.
- [ ] Substituir o bloco de projetos vinculados por catálogo filtrável com ação explícita de inclusão.
- [ ] Executar typecheck, lint, testes e build; atualizar o status da implementação.
