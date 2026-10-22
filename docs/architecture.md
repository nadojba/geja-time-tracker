# Arquitetura

WXT cria quatro entrypoints: service worker, popup, Side Panel e content script. O domínio em `src/domain` não conhece Chrome nem React. `StateRepository` encapsula `chrome.storage.local` e serializa atualizações no worker; o envelope possui `schemaVersion` para migrações futuras e a interface permite substituir a implementação por IndexedDB sem alterar a UI.

O service worker é a autoridade para operações de timer, conexão e lançamento. Contextos de interface consultam e alteram estado por mensagens. O content script só conhece o ID do chamado e o snapshot público do timer.

