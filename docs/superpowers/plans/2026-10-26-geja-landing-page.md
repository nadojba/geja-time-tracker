# Geja Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Criar uma landing page estática, bilíngue e publicável no GitHub Pages para apresentar o Geja Time Tracker - Redmine.

**Architecture:** A página ficará isolada em `website/`, sem participar do bundle WXT. O HTML contém a estrutura semântica, o CSS define o visual responsivo e o JavaScript alterna as mensagens entre português brasileiro e inglês, persistindo a escolha em `localStorage`.

**Tech Stack:** HTML semântico, CSS moderno, JavaScript vanilla, SVG/CSS para demonstrações visuais e asset local da logo do Redmine.

**Spec:** Aprovação do usuário para uma landing estática na raiz do repositório, com funcionalidades, descrição, instalação, links públicos e seletor de idioma.

## Global Constraints

- Não adicionar dependências ao projeto da extensão.
- Não carregar scripts, fontes, imagens ou telemetria de terceiros.
- Não expor API Keys ou dados reais de usuários.
- Manter o build WXT da extensão independente da landing.
- Português brasileiro deve ser o idioma inicial; inglês deve estar disponível.
- A preferência de idioma deve sobreviver ao fechamento e reabertura da página.

## Review Focus

- GitHub Pages servido em subcaminho: links e assets devem usar caminhos relativos.
- JavaScript desabilitado: conteúdo em português deve continuar legível.
- Seletor de idioma: todas as mensagens marcadas devem trocar sem recarregar e persistir.
- Mobile estreito: não deve haver rolagem horizontal.
- Links externos e instalação: devem apontar para o repositório e Chrome Web Store reais.

### Task 1: Estrutura e conteúdo da landing

**Files:**
- Create: `website/index.html`
- Create: `website/assets/redmine-logo.svg`
- Modify: `README.md` com instruções de publicação

- [ ] Criar a estrutura semântica com hero, recursos, fluxo, segurança, instalação, changelog e CTA.
- [ ] Usar texto em português como fallback estático e atributos `data-i18n` para traduções.
- [ ] Verificar presença dos links públicos e ausência de credenciais.

### Task 2: Visual responsivo

**Files:**
- Create: `website/styles.css`

- [ ] Implementar tokens de cor, superfícies claras/escuras, grids responsivos e demonstrações de UI.
- [ ] Garantir foco visível, contraste adequado e ausência de overflow horizontal.
- [ ] Manter o estilo próprio da Geja, sem copiar layouts de terceiros.

### Task 3: Tradução e interação

**Files:**
- Create: `website/script.js`

- [ ] Implementar dicionário PT-BR/English para navegação, seções, CTAs e metadados.
- [ ] Persistir o idioma em `localStorage` com fallback seguro.
- [ ] Implementar menu mobile e ano atual sem dependências externas.

### Task 4: Validação e documentação

**Files:**
- Create: `website/README.md`
- Modify: `docs/IMPLEMENTATION_STATUS.md`

- [ ] Validar JavaScript, referências locais, textos essenciais e links.
- [ ] Executar os gates existentes da extensão para comprovar que nada foi quebrado.
- [ ] Documentar publicação por GitHub Pages e limitações da landing.
