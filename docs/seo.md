# SEO do site oficial

## Alterações realizadas

- Title principal: `Redmine Time Tracker Chrome Extension | Geja Time Tracker`.
- Meta description em inglês, com a proposta real da extensão e sem repetição artificial de palavras-chave.
- Conteúdo inicial em inglês para priorizar buscas internacionais; o seletor existente continua oferecendo português brasileiro no mesmo endereço.
- URL canônica única: `https://nadojba.github.io/geja-time-tracker/`.
- `hreflang="x-default"` para a URL única. Não foram criadas versões `en`/`pt-BR` falsas, pois não existem URLs separadas por idioma.
- Open Graph e Twitter Cards com títulos, descrição, URL e asset visual existentes.
- JSON-LD `SoftwareApplication` com nome, descrição, Chrome como plataforma, URL pública, link real da Chrome Web Store e organização responsável. Não foram incluídos ratings, número de usuários ou valores não verificados.
- `sitemap.xml` com a única URL pública indexável.
- `robots.txt` permitindo rastreamento público e apontando para o sitemap.
- Seções rastreáveis sobre o que é o produto, recursos, funcionamento, instalação, conexão da API Key, sessões pendentes e FAQ.
- CTA principal `Add to Chrome — Free` apontando para a página real da Chrome Web Store.
- O evento GA4 `install_cta_click` continua sendo emitido uma vez por clique, somente quando o visitante consentiu com métricas. O clique não é tratado como instalação concluída.

## URLs que devem ser indexadas

Neste momento existe uma única página pública:

- `https://nadojba.github.io/geja-time-tracker/`

Não devem ser indexados como páginas do site: o repositório GitHub, a Chrome Web Store, os arquivos de verificação, `robots.txt` ou `sitemap.xml`. Links externos continuam acessíveis para usuários e rastreadores conforme as políticas dos respectivos serviços.

## Checklist do Google Search Console

1. Confirme que `https://nadojba.github.io/geja-time-tracker/` está publicada pelo workflow do GitHub Pages.
2. Mantenha o arquivo de verificação e a meta tag existentes na raiz pública.
3. Adicione a propriedade do prefixo de URL `https://nadojba.github.io/geja-time-tracker/`.
4. Envie `https://nadojba.github.io/geja-time-tracker/sitemap.xml` em **Sitemaps**.
5. Use **Inspeção de URL** para solicitar a indexação da página inicial depois de cada mudança relevante.
6. Confirme no teste de resultados avançados que o JSON-LD é válido e que o HTML renderizado contém title, description, canonical e headings.
7. Acompanhe Core Web Vitals, usabilidade móvel, páginas indexadas e problemas de cobertura.

## Como verificar consultas e desempenho

- Em **Desempenho > Resultados da pesquisa**, filtre por consultas relacionadas a `redmine time tracker extension chrome`, `redmine time tracking chrome extension`, `redmine timer extension`, `chrome extension for redmine`, `redmine time logging`, `redmine issue time tracker` e `track working hours in redmine`.
- Compare impressões, cliques, CTR médio e posição média por consulta e país.
- Separe tráfego orgânico do tráfego vindo da Chrome Web Store ou do GitHub.
- No GA4, use `install_cta_click` para medir cliques no CTA consentidos. Esse evento não confirma instalação; instalações oficiais devem ser consultadas no Developer Dashboard da Chrome Web Store.

## Pendências externas

- Publicar as alterações na branch usada pelo GitHub Pages.
- Enviar o sitemap no Search Console e solicitar uma nova inspeção da URL.
- Confirmar no Search Console a leitura da versão publicada, não apenas dos arquivos locais.
- Validar o evento `install_cta_click` no DebugView/tempo real do GA4 após consentimento.
- Aguardar o rastreamento do Google; mudanças de título, conteúdo e consultas não aparecem instantaneamente.
