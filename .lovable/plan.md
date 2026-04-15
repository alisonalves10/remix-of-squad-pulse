

# Fix: Spillover nunca é detectado (bug na referência do IterationPath)

## Problema identificado
Na função `syncToDatabase` (linha 395), o `iterPath` usado para detectar spillover vem do **primeiro work item retornado**:

```typescript
const currentIterPath = workItems[0].fields["System.IterationPath"];
const iterPath = currentIterPath || "Unknown";
```

Para sprints fechadas com `asOf`, o WIQL encontra itens que estavam na sprint naquela data. Mas `fetchWorkItemDetails` retorna os campos **atuais** (sem asOf). Se o primeiro item da lista foi movido para Sprint 8, `iterPath` vira o path da Sprint 8, e **todos os itens** parecem ter o mesmo path → `isSpillover = false` para todos. Pior: a sprint lookup (`azure_iteration_path = iterPath`) pode encontrar/criar a sprint errada.

## Solução
Usar `currentIteration.path` (que contém o path correto da sprint sendo sincronizada) como referência para spillover, em vez do primeiro work item:

```typescript
// ANTES (bugado):
const currentIterPath = workItems[0].fields["System.IterationPath"];
const iterPath = currentIterPath || "Unknown";

// DEPOIS (correto):
const iterPath = currentIteration?.path || 
  (workItems.length > 0 ? workItems[0].fields["System.IterationPath"] : null) || 
  "Unknown";
```

Isso garante que:
1. A sprint correta seja encontrada/criada no banco
2. Itens com IterationPath diferente (movidos para outra sprint) sejam marcados como spillover

## Arquivo alterado
- `supabase/functions/azure-sync/index.ts` — linhas 395-409: priorizar `currentIteration.path`

## Após implementação
Re-sincronizar todas as squads via "Carregar Histórico 2026" para que o spillover seja detectado corretamente.

