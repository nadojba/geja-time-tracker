# Comportamento dos timers

`startSession` cria uma entidade nova, mesmo para o mesmo chamado. `pauseSession` fecha o segmento atual e mantém a sessão pausada; `resumeSession` adiciona um segmento novo à mesma sessão. `stopSession` fecha definitivamente a sessão e a marca como `pending`.

Cada sessão guarda conta, chamado, projeto, usuário, timestamps, duração, segmentos e estado de lançamento. O relógio visual recalcula o período ativo a partir do timestamp; não depende de um intervalo persistente. Após reinício do worker, o estado é hidratado do armazenamento e nenhum período encerrado é mesclado automaticamente.

