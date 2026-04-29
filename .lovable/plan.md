## Problema

A task **57464** (Sustentação Ubaldo) está marcada como **Closed** no Azure DevOps, mas no menu Profissionais aparece como **Active**.

Investigação:
- Banco: `state = 'Active'`, `completed_at = null`, sprint = "2026 - Sprint 8" (Backoffice, 13/04 → 24/04, já terminada).
- A sprint terminou em 24/04 — hoje é 27/04, então é considerada "fechada".
- A função `azure-sync` aplica um snapshot histórico (`asOf = sprintEndDate T23:59:59Z`) ao puxar itens de sprints encerradas, para preservar a foto de scope no fim da sprint (importante para spillover/burndown).
- O efeito colateral é que o **estado** também é congelado naquele momento. Se o item foi fechado depois de 24/04, a sincronização continua escrevendo `Active` no banco.

Em outras palavras: o `asOf` é correto para `total_scope_points`/spillover, mas errado para o `state` atual de cada item.

## Solução

Separar as duas leituras na sincronização de sprints encerradas:

1. **Leitura "asOf"** (atual) — mantida apenas para calcular o snapshot histórico de scope (`metrics_snapshot`, `sprint_progress_daily`, detecção de spillover).
2. **Leitura "atual"** (nova) — fazer um segundo fetch dos mesmos work items SEM `asOf`, pegando os campos vivos: `System.State`, `Microsoft.VSTS.Common.ClosedDate`, `Microsoft.VSTS.Scheduling.CompletedWork`, `RemainingWork`, `OriginalEstimate`, `AssignedTo`.
3. Ao gravar em `work_items`, usar os valores da leitura "atual" para `state`, `completed_at`, `completed_work`, `remaining_work`, `original_estimate` e `assigned_to_user_id`. Manter o flag `is_spillover` derivado da comparação entre as duas leituras (item presente no asOf mas com IterationPath diferente hoje continua sendo spillover).

Para sprints **em andamento** ou **futuras**, nada muda — já é a leitura atual.

## Arquivos alterados

- **`supabase/functions/azure-sync/index.ts`**
  - Quando `isClosedSprint`, executar uma segunda chamada `workitemsbatch` (mesmos IDs, sem `asOf`) e fazer merge: campos de progresso/estado vêm da leitura atual; cálculo de scope/spillover continua usando o snapshot.
  - Itens que já não existem mais (raros) caem de volta para a leitura asOf.

- **Backfill / re-sync**: depois do deploy, rodar manualmente o `azure-sync` para o squad Backoffice (sprint 2026 - Sprint 8) para corrigir a 57464 e os demais itens fechados após 24/04.

Sem mudanças em schema, RLS ou frontend.
