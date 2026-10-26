# Status de implementação

Atualizado em 23/10/2026.

## Concluído nesta etapa

- Plano e desenho técnico registrados.
- Núcleo de domínio de sessões independentes, com pausa/retomada e arredondamento por sugestão.
- Projeto WXT + Vite + React + TypeScript configurado para Manifest V3.
- Persistência local versionada com fila de mutações no service worker.
- Isolamento de sessões por URL/usuário Redmine.
- Client Redmine com autenticação, paginação, cache curto, timeout e erros tipados.
- Popup e Side Panel compartilhando a mesma aplicação React.
- Abas Timer, Chamados, Horas e Configurações com preferências funcionais.
- Lançamentos pendentes editáveis e lançamento individual via `POST /time_entries.json`.
- Controle integrado em páginas `/issues/:id`, com Shadow DOM e montagem idempotente.
- README e documentação de arquitetura, API, timers e segurança.
- `dist/` normalizado para carregamento direto no Chrome.
- Entrypoint do service worker corrigido em `src/entrypoints/background.ts`; o manifest agora declara `background.js`.
- Permissões de host revisadas: sem `host_permissions` obrigatório, com concessão dinâmica por origem e content script registrado em runtime apenas no Redmine autorizado.
- Permissão `tabs` removida; `scripting` mantida somente para o registro dinâmico do content script.
- HTTP permitido apenas após confirmação explícita do risco; HTTPS continua sendo o caminho recomendado.
- Janela flutuante independente do popup, com reuso da mesma janela, abertura manual ou automática ao iniciar e posicionamento inicial no canto da janela Chrome em foco.
- Controle integrado com botão para abrir/reexibir a janela flutuante sem sair da página do chamado.
- Indicador de timer no ícone da extensão, com badge resumido e tooltip com duração completa.
- Abertura manual do Side Panel pelo popup, reutilizando a mesma aplicação e o mesmo estado do timer.
- Chamados com escopo explícito de “Meus chamados” ou “Todos acessíveis”, pesquisa por número/assunto, filtros por projeto/status/prioridade, ordenação por prioridade, fixação do chamado ativo/acompanhado e agrupamento opcional por versão.
- Consulta paginada de projetos e apontamentos reais do usuário no Redmine, com histórico separado das sessões locais.
- Relatório para impressão/PDF com fontes locais e servidor separadas, sem somar os valores ambiguamente.
- Primeira versão do módulo Relatórios, com períodos hoje/semana/mês, métricas separadas e detalhamento por projeto e chamado usando dados reais do Redmine.
- Relatórios com período personalizado e detalhamento adicional por atividade.
- Relatório com série diária visual, mantendo horas confirmadas no Redmine separadas de sessões locais pendentes.
- Filtros de chamados por sessões pendentes e trabalhados hoje.
- Atalhos de teclado no Manifest V3 para iniciar/retomar, pausar e parar o timer.
- Atalho padrão de pausa ajustado para `Alt+Shift+J` por conflito observado com `Alt+Shift+P` no Chrome.
- Visualização diária do relatório simplificada para barras horizontais compactas, sem rolagem horizontal.
- Backup local de sessões e preferências por conta, sem API Key, com confirmação e bloqueio de importação entre contas.
- Diagnóstico manual de conta, permissão de host, sessões pendentes, sessão ativa e versão do schema local.
- Relatórios filtráveis por projeto e chamado, com exportação CSV mantendo as origens separadas.
- Board Kanban pessoal em janela separada, com cards de chamados reais, colunas iniciais derivadas dos status, colunas locais criáveis/renomeáveis/removíveis e drag-and-drop sem alterar status no Redmine.
- Board com busca, filtros por projeto/prioridade/pendência/ativo, cores e reordenação de colunas.
- Notificações configuráveis para pausa e timer ativo por período prolongado.
- Reconciliação manual de sessões após timeout, consultando apontamentos compatíveis antes de permitir novo envio.

## Em andamento

- Testes de navegador/visual em um Chrome real.
- Teste manual no Chrome para recusa, revogação, troca de origem e injeção dinâmica em servidor com porta/subdiretório.
- Evolução visual dos relatórios, exportações adicionais e cobertura E2E em navegador.

## Ainda depende de validação real

- Conexão contra um servidor Redmine real e permissões específicas do usuário.
- Teste visual do content script em diferentes versões/temas do Redmine.
- Verificação de suporte à API `sidePanel` no Chrome utilizado.
- Validação de POST ambíguo contra a política de reconciliação do Redmine da empresa.
- A API padrão de extensões do Chrome não permite exigir `alwaysOnTop` de forma confiável; a janela pode ficar acima das abas, mas não é garantido que permaneça acima de outros aplicativos ou janelas do sistema.

## Limitações conhecidas

- Nenhuma API Key ou servidor Redmine foi fornecido nesta sessão; testes automatizados usam mocks e não criam apontamentos reais.
- O ambiente não permitiu concluir a criação de hooks Git dentro de `.git`; o código foi entregue, mas o diretório Git local ficou sem inicialização válida.

### Catálogo de chamados no board — 23/10/2026

- Concluído: o Board consulta o escopo de chamados acessíveis (`all`) sem alterar o filtro padrão da aba Chamados.
- Concluído: removido o fluxo de seleção por “Projetos vinculados” como mecanismo de inclusão.
- Concluído: catálogo filtrável por texto, projeto, status e prioridade.
- Concluído: inclusão explícita por chamado com estado visual `No board` e prevenção de duplicidade.
- Concluído: abertura do board não adiciona automaticamente chamados novos aos cards existentes.
- Validação: 14 arquivos de teste e 43 testes passaram; typecheck, lint, build e `git diff --check` passaram.
- Validação pendente: confirmar em uma instância Redmine real que o usuário possui permissão para consultar chamados acessíveis.
### Compatibilidade dos boards legados — 23/10/2026

- Corrigido: boards migrados do formato antigo voltam a exibir os chamados que já eram carregados automaticamente quando ainda não possuíam cards persistidos.
- Preservado: boards novos continuam com inclusão manual pelo catálogo de chamados.
- Testes: 14 arquivos e 44 testes passaram; typecheck, lint e build passaram.
### Board único — 23/10/2026

- Concluído: removida da interface a seleção e criação de múltiplos boards.
- Concluído: a tela usa exclusivamente `state.board` como board persistido.
- Concluído: chamados acessíveis são carregados automaticamente no board por `GET_ISSUES` com escopo `all`.
- Concluído: chamados novos retornados pela API são incorporados sem criar outro board.
- Concluído: colunas e organização local continuam editáveis.
- Validação: 14 arquivos e 44 testes passaram; typecheck, lint, build e `git diff --check` passaram.
### Correção de chamados ausentes no board único — 23/10/2026

- Causa identificada: cards persistidos em `state.boards` não eram copiados para `state.board` quando a versão de board único carregava o estado.
- Corrigido: o repositório usa o board ativo antigo como fallback quando `state.board` está vazio.
- Corrigido: a tela do board único continua incorporando chamados retornados pela API e persistindo o resultado.
- Teste de regressão adicionado para a migração dos cards.
- Validação: 14 arquivos e 45 testes passaram; typecheck, lint, build e `git diff --check` passaram.
### Escopo dos chamados do board — 23/10/2026

- Corrigido: o board consulta chamados atribuídos ao usuário (`assigned_to_id=me`) em todos os projetos, em vez da listagem global (`scope: all`) que podia retornar vazio conforme as permissões do Redmine.
### Notificações configuráveis — 23/10/2026

- Concluído: aviso ao pausar com ação `Retomar`.
- Concluído: aviso ao salvar sessão pendente com ações `Lançar agora` e `Abrir chamado`.
- Concluído: aviso de timer longo com ações `Pausar` e `Abrir chamado`.
- Concluído: aviso de falha com resultado desconhecido/reconciliação com acesso aos lançamentos pendentes.
- Concluído: preferências separadas para pausa, sessão pendente e reconciliação.
- Mantido: notificações locais, sem telemetria ou envio a terceiros.
- Validação: 14 arquivos e 46 testes passaram; typecheck, lint, build e `git diff --check` passaram.
### Diagnóstico e carregamento resiliente do Board — 23/10/2026

- Concluído: indicador visível de carregamento e quantidade de chamados retornados.
- Concluído: botão para atualizar chamados manualmente.
- Concluído: fallback para chamados acessíveis quando a consulta de atribuídos retorna vazia.
- Concluído: mensagem orientando atribuição/permissão quando nenhuma tarefa é retornada.
- Validação: 14 arquivos e 46 testes passaram; typecheck, lint, build e `git diff --check` passaram.
### Confirmação de tempo sem carregamento infinito — 26/10/2026

- Corrigido: mensagens entre popup/Side Panel e service worker agora possuem timeout de 20 segundos e tratam `chrome.runtime.lastError`.
- Corrigido: o botão de registrar horas mostra `Registrando…`, bloqueia cliques repetidos e volta ao estado normal após sucesso ou erro.
- Corrigido: a reconciliação mostra `Verificando…` durante a consulta.
- Preservado: falha ou timeout não remove a sessão local; ela permanece pendente ou em reconciliação.
- Validação: 15 arquivos e 52 testes passaram; typecheck, lint, build e `git diff --check` passaram.
### Confirmação ao sair sem salvar — 26/10/2026

- Concluído: fechar ou clicar em `Depois` no modal de lançamento pergunta se os dados alterados devem ser descartados.
- Concluído: cancelar a edição manual da duração do timer pergunta se a alteração deve ser descartada.
- Concluído: tentativa de sair/recarregar a página com lançamento alterado usa o aviso nativo de alterações não salvas quando suportado pelo navegador.
- Validação: 15 arquivos e 52 testes passaram; typecheck, lint, build e `git diff --check` passaram.
### Confirmação antes de parar timer — 26/10/2026

- Concluído: popup, Side Panel e Board confirmam antes de parar uma sessão com tempo acumulado.
- Concluído: widget injetado no Redmine usa a mesma confirmação.
- Concluído: cancelar mantém a sessão ativa, sem gravar ou zerar o contador.
- Concluído: sessões em `00:00:00` podem ser paradas sem confirmação.
- Validação: 15 arquivos e 52 testes passaram; typecheck, lint, build e `git diff --check` passaram.
### Service worker sem resposta no lançamento — 26/10/2026

- Corrigido: listener de notificações agora verifica a existência do evento antes de registrar o callback.
- Corrigido: fila do repositório se recupera depois de uma mutação que falhou, sem bloquear operações futuras.
- Mantido: timeout do popup e preservação da sessão em caso de resposta desconhecida.
- Teste de regressão adicionado para recuperação da fila.
- Validação: 15 arquivos e 53 testes passaram; typecheck, lint, build e `git diff --check` passaram.
### Detalhes do chamado no Kanban — 26/10/2026

- Concluído: clicar no título de um card abre modal com detalhes completos obtidos por `GET /issues/{id}.json`.
- Concluído: modal exibe descrição, projeto, tracker, status, prioridade e conclusão.
- Concluído: modal oferece iniciar timer e abrir chamado no Redmine.
- Concluído: arrastar cards continua funcionando; o clique no título é a ação de detalhes.
- Validação: 15 arquivos e 53 testes passaram; typecheck, lint, build e `git diff --check` passaram.
### Apontamentos do chamado no Kanban — 26/10/2026

- Concluído: modal do Kanban consulta os apontamentos do chamado com `GET /time_entries.json?issue_id=...`.
- Concluído: exibição do total de horas registradas e histórico por data, atividade, duração e comentário.
- Concluído: consulta autenticada permanece centralizada no service worker.
- Teste de regressão adicionado para filtro de apontamentos por chamado.
- Validação: 15 arquivos e 54 testes passaram; typecheck, lint, build e `git diff --check` passaram.
### Etiquetas de prioridade no Kanban — 26/10/2026

- Concluído: cards exibem a prioridade em uma etiqueta colorida.
- Concluído: destaque lateral diferencia baixa, normal, alta e urgente/imediata.
- Concluído: classificação usa o nome localizado retornado pelo Redmine, sem depender de IDs fixos.
- Concluído: cores possuem variantes para tema claro e escuro.
- Validação: 15 arquivos e 54 testes passaram; typecheck, lint, build e `git diff --check` passaram.
### Refinamento da modal do Kanban — 26/10/2026

- Concluído: modal com contraste reforçado nos temas claro e escuro.
- Concluído: histórico de horas passou a ser uma seção recolhível, fechada por padrão.
- Concluído: total de horas permanece visível sem ocupar espaço com a lista completa.
- Concluído: histórico expande e recolhe com controle acessível (`aria-expanded`).
- Validação: 15 arquivos e 54 testes passaram; typecheck, lint, build e `git diff --check` passaram.
### Cor da coluna aplicada aos cards — 26/10/2026

- Concluído: a cor do card agora segue a cor da coluna atual.
- Concluído: ao mover um card para outra coluna, a borda lateral muda automaticamente para a nova cor.
- Mantido: prioridade continua visível como etiqueta textual neutra, sem competir com a cor da coluna.
- Validação: 15 arquivos e 54 testes passaram; typecheck, lint, build e `git diff --check` passaram.
### Contraste e refinamento visual da modal do Kanban — 26/10/2026

- Concluído: título dos cards recebeu contraste reforçado no tema claro e escuro.
- Concluído: título da modal ganhou hierarquia tipográfica e truncamento seguro no cabeçalho.
- Concluído: projeto, status, prioridade e conclusão agora aparecem em metadados com chips de alto contraste.
- Concluído: descrição e histórico de horas receberam espaçamento e separação visual refinados.
- Validação: 15 arquivos e 54 testes passaram; typecheck, lint, build e `git diff --check` passaram.
### Formatação das descrições Redmine no Kanban — 26/10/2026

- Concluído: descrições dos chamados agora interpretam headings Textile (`h1.` até `h6.`), parágrafos e quebras de linha.
- Concluído: listas ordenadas e não ordenadas, incluindo níveis aninhados como `*`, `**` e `#`, são renderizadas com a hierarquia visual correspondente.
- Concluído: suporte a negrito, itálico, sublinhado, código inline e links HTTPS na descrição.
- Concluído: renderização segura com nós React, sem executar HTML arbitrário recebido do Redmine.
- Teste de regressão adicionado para o formato do exemplo de componentes do chamado.
- Validação: 15 arquivos e 55 testes passaram; typecheck, lint, build e `git diff --check` passaram.
### Botão de fechar da modal do Kanban — 26/10/2026

- Concluído: botão de fechar ampliado para uma área de clique de 40 × 40 px.
- Concluído: contraste reforçado nos temas claro e escuro, com ícone Lucide, hover, foco acessível e estado desabilitado durante o carregamento.
- Validação: typecheck, lint, build e `git diff --check` passaram.
### Cadastro de chamados na Sidebar — 26/10/2026

- Concluído: botão **Novo chamado** disponível na aba Chamados da Sidebar e do popup.
- Concluído: modal com projeto, assunto, descrição e campos opcionais de tipo, status e prioridade.
- Concluído: projetos carregados por `GET /projects.json` e opções complementares derivadas dos chamados consultados.
- Concluído: validação com React Hook Form e Zod, estados de carregamento, erro e envio.
- Concluído: criação autenticada centralizada no service worker via `POST /issues.json`.
- Concluído: após o sucesso, a modal fecha, a lista é recarregada e o usuário recebe o número do chamado criado.
- Mantido: API Key não é exposta à Sidebar, content script ou DOM.
- Teste de regressão adicionado para método, endpoint, payload e retorno do client de criação.
- Validação: 15 arquivos e 56 testes passaram; typecheck, lint, build e `git diff --check` passaram. O build emite apenas avisos do Rollup sobre comentários `@__PURE__` internos do Zod, removidos automaticamente do bundle.
### Refinamento visual da modal de cadastro — 26/10/2026

- Concluído: modal deixou de usar um fundo branco chapado e recebeu superfície clara com borda, sombra e separação visual no cabeçalho.
- Concluído: inputs e selects receberam fundo, bordas, placeholders e estados de foco com contraste adequado no tema claro.
- Concluído: tema escuro recebeu superfície própria, campos menos escuros e estados de hover/foco coerentes.
- Concluído: campos opcionais passaram a ficar agrupados visualmente e a modal se adapta melhor à largura reduzida da Sidebar.
- Validação: 15 arquivos e 56 testes passaram; typecheck, lint, build e `git diff --check` passaram.
### Seções recolhíveis por projeto na lista de chamados — 26/10/2026

- Concluído: chamados agora aparecem dentro de seções de projeto visualmente destacadas.
- Concluído: cada seção mostra nome do projeto, quantidade de chamados e, quando habilitado, a versão de destino.
- Concluído: seções podem ser expandidas ou recolhidas com controle acessível (`aria-expanded` e `aria-controls`).
- Concluído: as seções começam abertas e preservam o estado durante a navegação pelos filtros.
- Validação: 15 arquivos e 56 testes passaram; typecheck, lint, build e `git diff --check` passaram.
### Idioma, changelog e avaliação da extensão — 26/10/2026

- Concluído: dicionário local de tradução com português brasileiro e inglês, sem dependência externa.
- Concluído: preferência `Auto`, `Português (Brasil)` e `English` persistida em Configurações > Geral.
- Concluído: textos principais de navegação, Timer, Chamados, Relatórios, criação de chamados, configurações e widget integrado usam o idioma selecionado.
- Concluído: modal **Novidades** com changelog bilíngue das versões `0.1.4` e `0.1.3`.
- Concluído: seção de avaliação com link direto para a página da extensão na Chrome Web Store.
- Testes de regressão adicionados para resolução automática de idioma, troca de traduções e changelog.
- Validação: 16 arquivos e 59 testes passaram; typecheck, lint, build e `git diff --check` passaram.
- Corrigido: card de referência do Redmine nas Configurações agora usa traduções próprias para a versão, descrição e ação de reportar issue em inglês.
- Validação da cobertura adicional: 16 arquivos e 59 testes passaram; typecheck, lint, build e `git diff --check` passaram.
- Revisão ampliada: traduções aplicadas também aos filtros, Board/Kanban, lançamentos pendentes, relatórios, notificações do service worker, tooltips e confirmações do widget integrado.
- Concluído: preferência de idioma validada com teste de persistência no repositório; a seleção sobrevive ao fechamento e reabertura da extensão quando salva.
- Validação final: 16 arquivos e 60 testes passaram; typecheck, lint, build e `git diff --check` passaram.
- Corrigido: ao trocar o idioma no seletor, a Sidebar/popup agora atualiza imediatamente; o botão **Salvar configurações** continua persistindo a escolha para a próxima abertura.
- Validação da correção: 16 arquivos e 59 testes passaram; typecheck, lint, build e `git diff --check` passaram.
- Concluído: modal de Novidades recebeu cabeçalho com destaque, badges de versão, datas e cards de release com contraste refinado nos temas claro e escuro.
- Validação: 16 arquivos e 59 testes passaram; typecheck, lint, build e `git diff --check` passaram.
- Ajuste adicional: labels dos inputs receberam contraste reforçado e peso tipográfico maior nos temas claro e escuro.

### Persistência imediata do idioma — 26/10/2026

- Corrigido: alterar o idioma agora grava imediatamente a preferência no armazenamento local da extensão, sem depender do botão geral **Salvar configurações**.
- Mantido: a seleção atualiza a interface na hora e o botão geral continua salvando as demais preferências.
- Causa corrigida: o seletor anterior alterava somente o estado React; a persistência só acontecia no salvamento completo.
- Validação: typecheck, lint, 60 testes, build de produção e `git diff --check` passaram.

### Landing page pública — 26/10/2026

- Concluído: landing page estática em `website/`, sem dependências de build e adequada para GitHub Pages em subcaminho.
- Concluído: hero, demonstração visual do timer, recursos, fluxo de uso, segurança, instalação, changelog e links públicos da Chrome Web Store/GitHub.
- Concluído: seletor Português (Brasil)/English com tradução de todas as mensagens da página e persistência no `localStorage`.
- Concluído: layout responsivo, menu mobile, foco visível, `prefers-reduced-motion` e ausência de rolagem horizontal em telas estreitas.
- Concluído: logo local reutilizada em `website/assets/redmine-logo.svg`; nenhuma API Key é incluída e o único script remoto é o Google Analytics explicitamente solicitado para a landing pública.
- Concluído: workflow `.github/workflows/pages.yml` publica somente `website/` como artefato do GitHub Pages, sem expor o restante do repositório no site.
- Concluído: Google Analytics 4 adicionado somente à landing pública com o ID `G-QQP34EH110`; a extensão continua sem telemetria.
- Concluído: consentimento explícito implementado para a landing, com carregamento único da tag, consent mode padrão negado, `page_view` sem duplicidade e eventos `click_install_extension`, `click_github`, `click_documentation` e `click_contact`.
- Concluído: metatag do Google Search Console adicionada ao `<head>` da landing para verificar `https://nadojba.github.io/geja-time-tracker/`.
- Concluído: arquivo `website/googled298e025a6729a6a.html` adicionado para o método alternativo de verificação por arquivo HTML.
- Concluído: landing refinada com visual mais simples, removendo glows, chips flutuantes e rotação decorativa; cards, espaçamento, contraste e leitura mobile foram ajustados.
- Validação: referências de tradução, assets e links verificadas; JavaScript validado com `node --check`; gates da extensão mantidos.

### Release 0.1.5 — 26/10/2026

- Concluído: versão da extensão atualizada para `0.1.5` no package, lockfile, WXT e manifesto gerado.
- Concluído: modal **Novidades** atualizada com changelog bilíngue da nova versão.
- Concluído: changelog da landing atualizado para refletir a publicação e a documentação revisadas.
