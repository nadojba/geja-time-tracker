# Segurança

O projeto prioriza HTTPS, solicita somente a origem Redmine informada em uma ação explícita e não usa host permission fixa ou content script automático em todos os sites. HTTP só pode ser usado depois de uma confirmação explícita do risco de transmitir a API Key sem criptografia. A API Key é armazenada em `chrome.storage.local`, nunca em página, DOM, logs ou content script. O client autenticado só é instanciado no service worker.

O manifesto final mantém `storage`, `sidePanel`, `windows` e `scripting`. A permissão `tabs` foi removida porque o código usa somente `chrome.tabs.create`, que não exige acesso aos dados sensíveis das abas. As permissões de host ficam em `optional_host_permissions` para HTTPS e HTTP; o Chrome só concede a origem configurada pelo usuário.

O content script é construído pelo WXT, mas não é declarado com `matches` no manifesto. O service worker registra dinamicamente `content-scripts/content.js` somente para a origem autorizada, quando `showCurrentIssueTimer` está habilitado. Ao trocar o servidor, revogar a permissão ou desabilitar a preferência, o registro anterior é removido.

Antes de cada chamada autenticada, o service worker verifica `chrome.permissions.contains`. Se a permissão tiver sido recusada ou revogada, nenhuma requisição HTTP é iniciada e o usuário recebe uma mensagem orientando a autorizar novamente o domínio.

Sessões carregam `accountId`, derivado da URL normalizada e do ID do usuário autenticado. Trocar conta preserva o histórico, mas o worker rejeita lançamentos cujo `accountId` não seja o da conta atual. Um POST com resposta desconhecida não é repetido automaticamente: a sessão é marcada `reconciliation_required` para revisão do usuário.

## Telemetria opcional

A extensão não carrega a tag do Google Analytics e não transmite eventos para um endpoint externo. Em Configurações, o usuário pode ativar explicitamente métricas locais agregadas; a opção vem desativada por padrão. Nesse modo, o service worker guarda somente contadores por tipo de evento (`extension_opened`, conexão, início/parada de timer, lançamento confirmado e falha genérica de API), sem timestamps, duração, IDs, títulos, projetos, comentários, nomes, e-mails, URLs internas, API Keys ou tokens.

O registro local é best-effort: falhas de armazenamento são ignoradas e nunca interrompem timers ou lançamentos. Desativar a opção impede novos incrementos; não existe sincronização pelo Chrome Sync nem envio posterior. Qualquer telemetria externa futura exige avaliação independente de LGPD, política da Chrome Web Store, consentimento e infraestrutura autenticada antes de ser habilitada.

