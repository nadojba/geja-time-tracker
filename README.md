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

Na aba **Chamados**, o botão **Novo chamado** abre uma modal para criar tarefas no Redmine. Projeto e assunto são obrigatórios; descrição, tipo, status e prioridade são opcionais quando as opções estão disponíveis na consulta atual. A criação usa `POST /issues.json` pelo service worker e, após o sucesso, a lista é atualizada sem criar um registro local separado.

Em **Configurações > Geral**, escolha `Automático`, `Português (Brasil)` ou `English`. O idioma automático usa o idioma do Chrome e volta para português quando não há tradução. A mesma seção possui **Novidades**, com o changelog das versões, e um convite para avaliar a extensão na Chrome Web Store.

O controle compacto também aparece nas páginas `/issues/:id` do domínio configurado. O Side Panel usa os mesmos componentes e o mesmo estado do popup.
Enquanto houver uma sessão ativa, o ícone da extensão exibe um resumo do tempo e seu tooltip mostra a duração completa. O botão **Painel** abre o Side Panel do Chrome, que pode permanecer aberto durante a navegação entre abas.
Ao fixar o Geja Time Tracker na barra do Chrome, clicar no ícone abre o Side Panel diretamente.
Na aba **Chamados**, o padrão é consultar apenas chamados atribuídos ao usuário. O seletor **Todos acessíveis** amplia a consulta explicitamente e habilita filtros por projeto, status e prioridade. Na aba **Horas**, sessões locais pendentes e apontamentos já confirmados no Redmine aparecem em blocos separados.
A aba **Relatórios** apresenta hoje, semana e mês, separando horas confirmadas no Redmine de sessões locais pendentes, com detalhamento por projeto e chamado e geração de PDF. Ela também exibe a distribuição diária das horas, com fontes separadas para Redmine e pendências locais.
Os relatórios podem ser filtrados por projeto ou chamado e exportados em PDF ou CSV. O CSV mantém uma coluna de origem para diferenciar lançamentos confirmados no Redmine de sessões pendentes locais.
Na aba **Chamados**, use os filtros de sessões pendentes e trabalhados hoje para localizar rapidamente o que precisa de revisão. Os atalhos `Alt+Shift+S`, `Alt+Shift+J` e `Alt+Shift+X` iniciam/retomam, pausam e param o timer. O início por atalho funciona quando a aba ativa está em um chamado do Redmine configurado; os atalhos podem ser alterados em `chrome://extensions/shortcuts`.
Em **Configurações > Backup e diagnóstico**, é possível exportar sessões e preferências da conta atual sem incluir a API Key, importar um backup compatível após confirmação e verificar permissão, sessões pendentes e estado do timer.
O ícone de board abre um Kanban pessoal em uma janela separada. Os cards são chamados reais do Redmine, mas as colunas e a posição dos cards ficam somente na extensão; mover um card não altera o status do chamado no Redmine. Novas colunas podem ser criadas, renomeadas ou removidas localmente.
O board possui busca, filtros por projeto/prioridade, filtro de pendências, destaque do chamado ativo, cores de coluna e reordenação por arrastar.
As notificações do timer podem ser ativadas nas configurações. A extensão pode avisar quando uma sessão é pausada e quando um timer permanece ativo por muitas horas.
Quando um POST termina com resultado desconhecido, a sessão fica em reconciliação. O botão **Verificar no Redmine** consulta o chamado e a data antes de marcar a sessão como lançada ou permitir nova tentativa.

## Segurança e limitações

- A API Key não é enviada a terceiros, não aparece no DOM e não é exposta ao content script.
- O service worker é o único contexto que faz requests autenticados.
- POSTs que terminam em timeout são marcados para reconciliação; não há retry automático cego.
- Sem acesso a um Redmine real nesta sessão, os testes usam mocks. É necessário validar permissões, CORS/host permission e aparência do content script no ambiente da empresa.

Veja também `docs/architecture.md`, `docs/redmine-api.md`, `docs/timer-behavior.md`, `docs/security.md` e `docs/IMPLEMENTATION_STATUS.md`.

## Landing page pública

A apresentação pública do projeto fica em [`website/`](website/), em HTML/CSS/JavaScript estático, sem dependências externas. Ela pode ser visualizada com `python3 -m http.server 4173 -d website` e publicada pelo workflow [`pages.yml`](.github/workflows/pages.yml): em **Settings > Pages**, selecione **GitHub Actions** como fonte. A página possui conteúdo em português e inglês e persiste o idioma escolhido no navegador. Consulte [`website/README.md`](website/README.md) para os passos completos.

## Atribuição da logo

A logo do Redmine utilizada na interface e nos ícones da extensão é a logo oficial disponibilizada pelo projeto Redmine. Ela é atribuída a Martin Herr e licenciada sob Creative Commons Attribution-Share Alike 2.5 Generic, conforme a [página oficial da logo](https://www.redmine.org/projects/redmine/wiki/Logo). O Geja Time Tracker - Redmine não é um produto oficial do projeto Redmine.

