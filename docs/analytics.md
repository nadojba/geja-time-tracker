# Analytics e métricas do Geja Time Tracker

## Site público

A landing estática em `website/` usa GA4 com o ID `G-QQP34EH110`. A tag é inserida dinamicamente uma única vez somente depois que o visitante escolhe **Aceitar métricas**. O estado de consentimento fica no `localStorage` do site; ao recusar, nenhum script do Google é carregado e os eventos não são enviados. O site não envia API Keys, URLs internas do Redmine, títulos de chamados, nomes ou comentários.

Os eventos públicos são:

| Evento | Momento |
| --- | --- |
| `install_cta_click` | Clique em um link para a Chrome Web Store |
| `github_click` | Clique em um link para o GitHub |
| `documentation_click` | Abertura da documentação de segurança |
| `contact_click` | Abertura da área de issues/contato |

Não existe download direto na landing atualmente; por isso `download_click` não é emitido. Também não existe evento de instalação concluída: o clique apenas abre a Chrome Web Store.

As visualizações são enviadas como `page_view` após o consentimento, com deduplicação pela URL atual. A landing é estática e não possui um roteador de SPA; mudanças de hash também são observadas. O carregamento do script externo possui um único elemento com ID `geja-google-tag`.

## Extensão Chrome

A extensão não inclui GA4, não carrega scripts remotos e não transmite telemetria. Em Configurações > Comportamento existe uma escolha explícita, desativada por padrão, para permitir **métricas locais agregadas**. Quando ativada, são mantidos apenas contadores locais dos eventos candidatos:

- `extension_opened`
- `redmine_connected`
- `timer_started`
- `timer_stopped`
- `time_entry_submitted`
- `api_request_failed`

Os contadores não têm identificador persistente, data/hora, duração, dados de conta ou conteúdo do Redmine. Desativar a opção impede novos incrementos. Não há endpoint próprio nesta versão; portanto não há risco de coletor aberto ou segredo do Measurement Protocol no bundle. Uma falha de armazenamento de telemetria é ignorada e não altera o timer.

## Métricas que não devem ser correlacionadas

Visitantes e cliques da landing vêm do GA4 com consentimento. Instalações, desinstalações, usuários e países devem ser consultados separadamente no **Chrome Web Store Developer Dashboard**, na página da extensão, em Analytics/estatísticas do item. A [documentação oficial de métricas](https://developer.chrome.com/docs/webstore/metrics) descreve instalações/desinstalações, impressões e usuários semanais, com filtros por país, idioma, sistema operacional e período. A Chrome Web Store é a fonte oficial para essas métricas; não se deve alterar a propriedade de Analytics gerenciada pela loja.

Não é possível afirmar que todas as instalações vieram do site. A análise deve separar visitantes únicos aproximados, cliques no CTA, instalações oficiais, desinstalações, usuários ativos estimados e eventos locais consentidos. Sem telemetria externa da extensão, não é possível calcular atribuição site → instalação, retenção por usuário ou conversão ponta a ponta de forma confiável.

## Validação

1. Publique a landing pelo workflow **Publicar landing page** e abra a URL pública em uma janela limpa.
2. Confirme no primeiro acesso que o banner aparece e que não há elemento `script[src*="googletagmanager"]` antes do aceite.
3. Aceite métricas e use o DebugView do GA4 para verificar `page_view` e os quatro eventos públicos. O evento de instalação deve aparecer apenas como `install_cta_click`.
4. Teste recusa, recarregamento e navegação por hash; a recusa não deve criar requests para o Google.
5. Na extensão, deixe a opção local desativada e confirme que o estado não incrementa. Ative-a, abra a extensão e inicie/pare um timer; somente os contadores agregados locais devem aumentar.

## Configuração externa pendente

- Publicar o conteúdo atualizado no GitHub Pages.
- Confirmar no GA4 que o fluxo web usa `G-QQP34EH110` e revisar a política de retenção/consentimento da propriedade.
- Consultar as estatísticas da extensão diretamente no Chrome Web Store Developer Dashboard.
- Publicar uma política de privacidade acessível aos visitantes e usuários, conforme a operação e a jurisdição aplicáveis.
