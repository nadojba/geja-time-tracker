# Controles de produtividade — design

## Intenção

Adicionar atalhos de teclado e filtros de produtividade à extensão sem alterar a regra de sessões independentes. O usuário deve conseguir controlar o timer rapidamente e encontrar chamados que precisam de atenção.

## Objetivos

- Iniciar, pausar/retomar e parar o timer por comandos do Chrome.
- Mostrar no relatório diário uma visão visual das horas por dia.
- Permitir filtrar chamados com sessões pendentes ou trabalhados no período atual.
- Reutilizar o estado central do service worker e os dados reais já carregados.

## Fora do escopo

- Backend, sincronização externa ou telemetria.
- Alteração automática de duração ou lançamento no Redmine.
- Novo sistema de permissões.
- Reescrita do domínio de timers.

## Abordagens consideradas

1. Implementar os comandos no popup: simples, mas não funcionaria quando o popup estivesse fechado.
2. Implementar comandos no service worker e filtros no domínio/UI: escolhido, porque respeita o estado central e funciona em qualquer aba.
3. Criar uma camada nova de relatórios no backend: descartada, pois a extensão deve continuar independente.

## Decisão

Usar `commands` do Manifest V3 para atalhos, roteando para as mesmas operações `START_SESSION`, `PAUSE_SESSION`, `RESUME_SESSION` e `STOP_SESSION`. Para filtros, derivar os IDs a partir das sessões locais da conta ativa e aplicar a filtragem antes do agrupamento de chamados. O relatório diário será calculado a partir das sessões pendentes e dos apontamentos retornados pelo Redmine, sem misturar as fontes.

## Critérios de aceite

- Os comandos aparecem no manifesto final e acionam a operação correta.
- Um chamado com sessão pendente pode ser filtrado sem esconder os demais filtros.
- O relatório apresenta uma série diária coerente para hoje/semana/mês.
- Todos os testes, lint, typecheck e build passam.
