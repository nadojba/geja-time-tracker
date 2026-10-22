# Redmine Time Tracker — Design

## Decisões

O WXT foi escolhido porque mantém entrypoints MV3 explícitos e integra a configuração do Manifest ao Vite sem exigir bundler customizado. O service worker é o único contexto que possui acesso à API Key e executa requests ao Redmine. Popup, Side Panel e content script usam o mesmo protocolo de mensagens.

Sessões são entidades independentes. Uma sessão contém segmentos de execução para que pausas não alterem a identidade nem confundam o período encerrado. `stop` grava `pending`; somente confirmação de sucesso do POST transforma em `submitted`. Falhas ambíguas transformam em `reconciliation_required`.

O armazenamento usa `chrome.storage.local` para a primeira versão porque o volume é pequeno, a API é disponível em todos os contextos MV3 e o limite é suficiente para histórico operacional. O repositório usa envelope com versão e fila de mutações no service worker; uma futura migração para IndexedDB fica isolada atrás da mesma interface.

## Fluxo de conta

`accountId = sha256(normalizedRedmineUrl + ':' + currentUser.id)` é persistido na configuração. Sessões e time entries locais carregam esse identificador. Alterar URL/API Key mantém sessões antigas, mas a UI só permite lançar sessões cujo `accountId` corresponde à conta autenticada atual.

## Referência analisada

O projeto CrawlerCode/redmine-time-tracking usa WXT, entrypoints separados, queries paginadas, armazenamento local, agrupamento por projeto/target version, filtros, timer injetado e Side Panel. A implementação própria reaproveita esses limites funcionais, mas não copia código e corrige o agregado de timer para o modelo de sessões independentes exigido neste projeto.

