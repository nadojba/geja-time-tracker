# Geja Time Tracker - Redmine

Extensão Chrome Manifest V3 para acompanhar tempo em chamados do Redmine, com sessões locais independentes e lançamento confirmado pela API REST.

## Requisitos

- Node.js 20 ou superior.
- Google Chrome 122 ou superior para o Side Panel.
- Redmine com API REST habilitada, usuário com API Key e permissões compatíveis para consultar chamados e lançar horas.

## Instalação e desenvolvimento

```bash
npm install
npm run dev
npm run typecheck
npm test
npm run build
```

O comando de build gera `dist/`, que é a pasta carregável no Chrome. Para instalar localmente:

1. Abra `chrome://extensions`.
2. Ative **Modo do desenvolvedor**.
3. Clique em **Carregar sem compactação**.
4. Selecione a pasta `dist/` deste projeto.

## Configuração

Abra o popup, informe uma URL HTTPS do Redmine e a API Key. O botão **Testar conexão** chama `GET /users/current.json`; a chave fica somente no armazenamento local da extensão e o acesso ao domínio é solicitado de forma opcional.

## Uso

Na aba **Chamados**, pesquise e inicie um chamado. Parar encerra a sessão e a salva em **Horas > Lançamentos pendentes**. Iniciar novamente cria sempre uma sessão nova em `00:00:00`; pausar e retomar continuam a mesma sessão. Revise atividade, duração, data e comentário antes de registrar.

O controle compacto também aparece nas páginas `/issues/:id` do domínio configurado. O Side Panel usa os mesmos componentes e o mesmo estado do popup.

## Segurança e limitações

- A API Key não é enviada a terceiros, não aparece no DOM e não é exposta ao content script.
- O service worker é o único contexto que faz requests autenticados.
- POSTs que terminam em timeout são marcados para reconciliação; não há retry automático cego.
- Sem acesso a um Redmine real nesta sessão, os testes usam mocks. É necessário validar permissões, CORS/host permission e aparência do content script no ambiente da empresa.

Veja também `docs/architecture.md`, `docs/redmine-api.md`, `docs/timer-behavior.md`, `docs/security.md` e `docs/IMPLEMENTATION_STATUS.md`.

## Atribuição da logo

A logo do Redmine utilizada na interface e nos ícones da extensão é a logo oficial disponibilizada pelo projeto Redmine. Ela é atribuída a Martin Herr e licenciada sob Creative Commons Attribution-Share Alike 2.5 Generic, conforme a [página oficial da logo](https://www.redmine.org/projects/redmine/wiki/Logo). O Geja Time Tracker - Redmine não é um produto oficial do projeto Redmine.

