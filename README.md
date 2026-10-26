# Geja Time Tracker — Redmine

Uma extensão Chrome para acompanhar o tempo trabalhado em chamados do Redmine, com sessões independentes, lançamentos revisáveis e sincronização entre popup, Side Panel e páginas de chamados.

<p>
  <a href="https://chromewebstore.google.com/detail/geja-time-tracker-redmine/cijcdkdpmnhcbfadlnhkjmbpjknffhkb?authuser=0&hl=pt-BR">Instalar no Chrome</a> ·
  <a href="https://nadojba.github.io/geja-time-tracker/">Ver landing page</a> ·
  <a href="https://github.com/nadojba/geja-time-tracker/issues">Reportar problema</a>
</p>

## O que a extensão faz

- Cronometra sessões independentes por chamado.
- Permite pausar, retomar e encerrar sem misturar períodos anteriores.
- Consulta chamados atribuídos ao usuário e organiza por projeto.
- Insere um timer compacto diretamente nas páginas do Redmine.
- Oferece popup, Side Panel, janela auxiliar e Kanban pessoal.
- Mantém lançamentos pendentes para revisão antes do envio.
- Permite editar duração, atividade, data e comentário.
- Gera relatórios por período, projeto e chamado.
- Diferencia horas já registradas no Redmine de sessões locais pendentes.
- Suporta português brasileiro e inglês.

## Instalação para uso

Instale pela [Chrome Web Store](https://chromewebstore.google.com/detail/geja-time-tracker-redmine/cijcdkdpmnhcbfadlnhkjmbpjknffhkb?authuser=0&hl=pt-BR), configure a URL da sua instância Redmine e informe a API Key quando solicitado.

## Desenvolvimento local

Requisitos: Node.js 20 ou superior e Google Chrome 122 ou superior para o Side Panel.

```bash
npm install
npm run dev
npm run typecheck
npm run lint
npm test
npm run build
```

O build gera `dist/`, que pode ser carregado em `chrome://extensions` com **Modo do desenvolvedor > Carregar sem compactação**.

## Segurança

- A API Key fica somente no armazenamento local da extensão.
- O content script nunca recebe a credencial.
- Requisições autenticadas são feitas exclusivamente pelo service worker.
- O acesso ao domínio Redmine é solicitado sob demanda.
- Timeouts de POST não são reenviados automaticamente; sessões ficam disponíveis para reconciliação.
- A extensão não possui backend próprio nem telemetria; o Google Analytics está restrito à landing pública.

Consulte [`docs/security.md`](docs/security.md) para os detalhes técnicos.

## Landing page

A landing page pública fica em [`website/`](website/). Ela é estática, responsiva, bilíngue e possui seletor de idioma persistido no navegador.

Para visualizar localmente:

```bash
python3 -m http.server 4173 -d website
```

Para publicação, o workflow [`.github/workflows/pages.yml`](.github/workflows/pages.yml) envia somente `website/` para o GitHub Pages.

## Documentação

- [`docs/architecture.md`](docs/architecture.md) — arquitetura da extensão.
- [`docs/redmine-api.md`](docs/redmine-api.md) — integração com a API REST.
- [`docs/timer-behavior.md`](docs/timer-behavior.md) — regras de sessões e timers.
- [`docs/security.md`](docs/security.md) — credenciais, permissões e reconciliação.
- [`docs/IMPLEMENTATION_STATUS.md`](docs/IMPLEMENTATION_STATUS.md) — histórico de implementação e limitações.
- [`website/README.md`](website/README.md) — como publicar a landing page.

## Projeto

O Geja Time Tracker — Redmine é um projeto independente e não é um produto oficial do Redmine.

- [Repositório no GitHub](https://github.com/nadojba/geja-time-tracker)
- [Chrome Web Store](https://chromewebstore.google.com/detail/geja-time-tracker-redmine/cijcdkdpmnhcbfadlnhkjmbpjknffhkb?authuser=0&hl=pt-BR)
- [Issues](https://github.com/nadojba/geja-time-tracker/issues)

### Atribuição da logo

A logo utilizada na extensão é a logo oficial disponibilizada pelo projeto Redmine, atribuída a Martin Herr e licenciada sob Creative Commons Attribution-Share Alike 2.5 Generic, conforme a [página oficial da logo](https://www.redmine.org/projects/redmine/wiki/Logo).
