# Status de implementação

Atualizado em 22/10/2026.

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

## Em andamento

- Testes de navegador/visual em um Chrome real.
- Teste manual no Chrome para recusa, revogação, troca de origem e injeção dinâmica em servidor com porta/subdiretório.
- Cobertura adicional para edição/exclusão em lote de pendências e relatórios avançados.

## Ainda depende de validação real

- Conexão contra um servidor Redmine real e permissões específicas do usuário.
- Teste visual do content script em diferentes versões/temas do Redmine.
- Verificação de suporte à API `sidePanel` no Chrome utilizado.
- Validação de POST ambíguo contra a política de reconciliação do Redmine da empresa.

## Limitações conhecidas

- Nenhuma API Key ou servidor Redmine foi fornecido nesta sessão; testes automatizados usam mocks e não criam apontamentos reais.
- O ambiente não permitiu concluir a criação de hooks Git dentro de `.git`; o código foi entregue, mas o diretório Git local ficou sem inicialização válida.

