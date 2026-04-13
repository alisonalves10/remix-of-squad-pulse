

# Fix: Capturar work items que estiveram na sprint (spillover)

## Problema
Quando um item é movido de Sprint 7 para Sprint 8 no Azure DevOps, o WIQL da sincronização não o encontra mais na Sprint 7 — porque a query busca o estado **atual** dos items, e o `IterationPath` agora aponta para Sprint 8. Resultado: US 52497 sumiu da Sprint 7 apesar de ter estado lá.

## Causa raiz
1. A WIQL API por padrão retorna o estado atual. Items movidos não aparecem na sprint original.
2. A tabela `work_items` usa `id` (Azure ID) como PK — um item só pode existir em uma sprint.

## Solução

### 1. Migração: permitir mesmo item em múltiplas sprints
- Trocar a PK de `id` para um UUID gerado (`pk`)
- Manter `id` como coluna normal (Azure DevOps ID)
- Adicionar constraint `UNIQUE(id, sprint_id)` para evitar duplicatas dentro da mesma sprint

### 2. Edge function `azure-sync/index.ts`: usar `asOf` no WIQL para sprints fechadas
- Para sprints com `isClosed = true`, adicionar o parâmetro `asOf: endDate` no body da WIQL request
- Isso faz a API retornar os items como estavam na data de encerramento da sprint — incluindo items que depois foram movidos
- Items que estavam na Sprint 7 no dia que ela fechou aparecem no resultado, mesmo que hoje estejam na Sprint 8
- Fetch dos detalhes continua pegando o estado atual (horas, state) — que é o desejado

### 3. Ajustar `syncToDatabase` para lidar com a nova PK
- O `DELETE FROM work_items WHERE sprint_id = X` continua funcionando normalmente
- O `INSERT` não precisa de mudança pois a PK agora é UUID auto-gerado
- Marcar items que têm `IterationPath` diferente da sprint sendo sincronizada como `is_spillover = true`

## Arquivos alterados
- **Migração SQL** — nova PK UUID + unique constraint (id, sprint_id)
- **`supabase/functions/azure-sync/index.ts`** — `asOf` no WIQL + detecção de spillover
- **`src/hooks/useSprintDetailData.ts`** — nenhuma mudança necessária (já filtra por sprint_id)

## Após implementação
Será necessário re-sincronizar ("Carregar Histórico 2026") para que os items movidos sejam capturados com `asOf`.

