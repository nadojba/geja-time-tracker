# Landing page do Geja Time Tracker

Esta pasta contém a landing page estática do Geja Time Tracker - Redmine. Ela não faz parte do bundle da extensão e não precisa de Node, Vite ou dependências externas para funcionar.

## Visualizar localmente

A partir da raiz do repositório, use qualquer servidor HTTP estático, por exemplo:

```bash
python3 -m http.server 4173 -d website
```

Depois abra <http://localhost:4173> no navegador. Usar HTTP local evita diferenças de comportamento com caminhos relativos e `localStorage` quando o arquivo é aberto diretamente.

## Publicar no GitHub Pages

O repositório já possui o workflow [`.github/workflows/pages.yml`](../.github/workflows/pages.yml), que publica automaticamente a pasta `website/` quando ela recebe alterações na branch `main` ou `master`.

No GitHub:

1. Envie o projeto para `https://github.com/nadojba/geja-time-tracker`.
2. Abra **Settings > Pages**.
3. Em **Build and deployment > Source**, selecione **GitHub Actions**.
4. Faça um push na branch principal ou execute manualmente o workflow **Publicar landing page** na aba **Actions**.
5. Aguarde a execução terminar; o endereço aparecerá no resumo do workflow e em **Settings > Pages**.

A página usa somente assets relativos, portanto funciona em URLs com subcaminho, como `https://nadojba.github.io/geja-time-tracker/`.

## Conteúdo

- Apresentação do produto e demonstração visual do timer.
- Recursos de sessões, chamados, lançamentos, relatórios, Kanban e widget.
- Explicação de segurança e permissões.
- Links da Chrome Web Store, GitHub, releases e issues.
- Seletor Português (Brasil)/English persistido no `localStorage`.

A landing usa o Google Analytics 4 com o ID `G-8QSG7CH74K` para medir o uso da página pública. Ela não envia API Keys nem dados do Redmine; a extensão Chrome continua sem telemetria.

O arquivo `website/index.html` também contém a metatag de verificação do Google Search Console. Ela deve permanecer publicada para que a propriedade continue verificada.
