# Catálogo de chamados no board

## Intenção

Permitir que cada board pessoal seja montado manualmente a partir de uma lista de chamados acessíveis nos projetos do usuário. Abrir ou atualizar a lista não deve inserir chamados automaticamente no board.

## Escopo

- O Board consulta chamados no escopo `all`, respeitando as permissões do Redmine.
- A tela do board mostra busca, projeto, status e prioridade para localizar chamados.
- Cada chamado fora do board possui a ação `Adicionar ao board`.
- Chamados já adicionados ficam identificados como `No board`.
- O board continua local, independente por board e sem alterar status no Redmine.
- As colunas iniciais continuam podendo ser derivadas dos status, mas sem criar cards automaticamente.

## Fora do escopo

- Criar ou alterar chamados no Redmine.
- Alterar o filtro padrão da aba Chamados.
- Sincronizar a organização local do board com outros usuários.

## Decisão

Usar o mesmo endpoint existente de chamados acessíveis (`GET_ISSUES` com `scope: all`) e manter a inclusão como uma operação explícita no domínio. Isso evita duplicar o cliente/API e elimina a ambiguidade entre “chamados disponíveis” e “chamados já organizados”.
