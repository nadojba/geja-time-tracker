# Plano técnico: Analytics e telemetria privada

## Escopo

1. Ajustar a landing estática para GA4 com consentimento, page views sem duplicidade e eventos de negócio sem dados pessoais.
2. Adicionar uma camada de telemetria somente local à extensão, desativada por padrão e controlada por uma preferência visível.
3. Documentar métricas, limites de correlação, configuração externa e validação no GA4/Chrome Web Store.
4. Executar testes, lint, typecheck e build sem alterar permissões ou inserir scripts remotos na extensão.

## Critérios de segurança

- A extensão não carregará Google Analytics nem fará requests de telemetria externa.
- A telemetria local armazenará apenas contadores agregados por tipo de evento.
- API Keys, dados de conta, URLs Redmine, chamados, projetos, comentários, horários e durações nunca entram nos eventos.
- O timer não dependerá da telemetria; falhas de registro local serão ignoradas.
