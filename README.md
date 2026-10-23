<div align="center">

# Geja Time Tracker

**Controle o tempo dos seus chamados e registre horas no Redmine sem sair do navegador.**

Extensão Chrome · Manifest V3 · React · TypeScript · WXT

[Funcionalidades](#funcionalidades) · [Instalação](#instalação) · [Como-usar](#como-usar) · [Arquitetura](#arquitetura) · [Documentação](#documentação)

</div>

---

## Sobre o projeto

O Geja Time Tracker aproxima o controle de tempo da rotina de quem trabalha com chamados no Redmine. Inicie uma sessão, pause quando necessário e revise o lançamento antes de enviá-lo pela API REST.

A extensão oferece popup, painel lateral e um controle integrado à página do chamado. As interfaces compartilham o mesmo estado, com sessões locais independentes e operações centralizadas no service worker.

## Funcionalidades

- **Chamados:** busca e seleção de tarefas do Redmine.
- **Timer:** início, pausa, retomada e encerramento de sessões.
- **Sessões independentes:** iniciar novamente cria uma nova sessão; retomar continua a anterior.
- **Lançamentos pendentes:** revisão de atividade, duração, data e comentário antes do envio.
- **Três formas de acesso:** popup, Side Panel e controle na página do chamado.
- **Separação por conta:** sessões vinculadas ao servidor e usuário Redmine.
- **Persistência local:** armazenamento versionado com mutações serializadas.
- **Reconciliação:** lançamentos com resposta desconhecida exigem revisão, sem repetição automática do POST.

## Tecnologias

| Área | Tecnologias |
| --- | --- |
| Plataforma | Chrome Extensions, Manifest V3, WXT |
| Interface | React 19, TypeScript, Tailwind CSS, Lucide |
| Estado e formulários | Zustand, React Hook Form, Zod |
| Integração | API REST do Redmine |
| Qualidade | Vitest, Testing Library, ESLint, Prettier |

## Instalação

### Requisitos

- Node.js 20 ou superior, em uma versão compatível com as dependências do projeto.
- npm.
- Google Chrome 122 ou superior para o painel lateral.
- Redmine com API REST habilitada.
- API Key de um usuário com permissão para consultar chamados e registrar horas.

### Preparar a extensão

```bash
git clone https://github.com/nadojba/geja-time-tracker.git
cd geja-time-tracker
npm install
npm run build
```

### Carregar no Chrome

1. Abra `chrome://extensions`.
2. Ative o **Modo do desenvolvedor**.
3. Clique em **Carregar sem compactação**.
4. Selecione a pasta `dist/` gerada pelo build.
5. Abra a extensão para configurar a conexão.

## Configuração

1. Informe a URL do seu Redmine, preferencialmente com HTTPS.
2. Informe sua API Key.
3. Autorize o acesso ao domínio solicitado pelo Chrome.
4. Use **Testar conexão** para validar o acesso.

A verificação consulta `GET /users/current.json`. A conta deve ter as permissões exigidas pelo seu servidor Redmine.

## Como usar

1. Na aba **Chamados**, localize a tarefa e inicie o timer.
2. Pause e retome a sessão conforme sua rotina.
3. Pare o timer para salvar uma pendência em **Horas → Lançamentos pendentes**.
4. Revise os dados do apontamento.
5. Confirme o envio ao Redmine.

Um novo início cria uma sessão em `00:00:00`. Pausar e retomar preservam o tempo da sessão atual. O controle integrado pode ser exibido nas páginas `/issues/:id` do servidor autorizado.

## Arquitetura

| Parte | Responsabilidade |
| --- | --- |
| Service worker | Operações de timer, conexão, persistência e requisições autenticadas |
| Popup e Side Panel | Interface React compartilhada e comunicação por mensagens |
| Content script | Controle do chamado atual, isolado com Shadow DOM |
| Domínio | Regras de sessão independentes de React e das APIs do Chrome |
| Repositório local | Estado versionado em `chrome.storage.local` |

Detalhes em [Arquitetura](docs/architecture.md).

## Segurança e permissões

- A API Key fica em `chrome.storage.local`; não é exposta ao DOM ou ao content script.
- As requisições autenticadas são executadas no service worker.
- O acesso ao servidor é solicitado por origem, com permissões de host opcionais.
- HTTPS é o padrão recomendado; HTTP exige confirmação explícita.
- Ao trocar de conta, o histórico é preservado e os lançamentos são restritos à conta correspondente.
- Um POST com resultado desconhecido é marcado para reconciliação antes de qualquer nova tentativa.

Veja a [documentação de segurança](docs/security.md) para o comportamento completo.

## Desenvolvimento

```bash
npm install
npm run dev
```

| Comando | Finalidade |
| --- | --- |
| `npm run dev` | Desenvolvimento com WXT para Chrome |
| `npm run build` | Build da extensão |
| `npm run typecheck` | Verificação de tipos |
| `npm test` | Testes com Vitest |
| `npm run test:watch` | Testes em modo contínuo |
| `npm run lint` | Análise com ESLint |
| `npm run format` | Formatação com Prettier |

## Documentação

- [Arquitetura](docs/architecture.md)
- [Integração com a API do Redmine](docs/redmine-api.md)
- [Comportamento dos timers](docs/timer-behavior.md)
- [Segurança](docs/security.md)
- [Status de implementação e validações pendentes](docs/IMPLEMENTATION_STATUS.md)

## Estado e validação

O repositório documenta testes automatizados com mocks. A integração com um Redmine real, as permissões do servidor e o comportamento visual em diferentes temas ainda precisam ser validados conforme o [status de implementação](docs/IMPLEMENTATION_STATUS.md).

## Créditos

A logo do Redmine utilizada na interface e nos ícones é atribuída a **Martin Herr**, sob **Creative Commons Attribution-Share Alike 2.5 Generic**, conforme a [página oficial da logo](https://www.redmine.org/projects/redmine/wiki/Logo).

O Geja Time Tracker não é um produto oficial do projeto Redmine.

## Autor

**Leonardo Geja**

[GitHub](https://github.com/nadojba) · [LinkedIn](https://www.linkedin.com/in/leonardogeja/)
