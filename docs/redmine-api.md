# API do Redmine

O client usa `X-Redmine-API-Key` e chama `GET /users/current.json`, `/projects.json`, `/issues.json`, `/issues/:id.json`, `/enumerations/time_entry_activities.json`, `/time_entries.json` e `POST /time_entries.json`.

Listagens usam `limit=100` e `offset` até `total_count`. Há timeout de 15 segundos, cache de 30 segundos para atividades e mensagens específicas para 401, 403, 404, 422, 429 e 5xx. O Redmine pode esconder atividades ou apontamentos por permissão; a UI deve exibir o erro retornado e não inventar dados.

