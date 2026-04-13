

# Carregar histórico de todas as sprints de 2026

## Problema atual
A edge function `azure-sync` tem dois blocos que impedem manter histórico:
1. **Linhas 348-368**: Apaga sprints "stale" — qualquer sprint com iteration path diferente da atual é removida junto com seus work items, métricas e progresso diário
2. **Só sincroniza a iteração corrente** — não há mecanismo para solicitar sprints passadas

## Solução

### 1. Remover a limpeza de sprints antigas (`azure-sync/index.ts`)
Remover completamente o bloco que deleta sprints com iteration path diferente (linhas 348-368). Isso preserva dados históricos.

### 2. Adicionar modo de sincronização histórica (`azure-sync/index.ts`)
Aceitar um parâmetro opcional `syncAllIterations: true` no body da requisição. Quando ativado:
- Usar a Classification Nodes API para listar **todas** as iterações de 2026 (filtrar por nome contendo "2026")
- Para cada iteração encontrada, executar a mesma lógica de sync (WIQL + work items + backfill)
- Cada iteração cria/atualiza sua própria sprint no banco

A função `syncAreaPath` será refatorada para aceitar uma iteração específica como parâmetro opcional. Quando fornecida, usa essa iteração em vez de buscar a corrente.

### 3. Adicionar botão "Sincronizar Histórico" na UI (`src/pages/Settings.tsx`)
Um botão secundário ao lado do botão de sync atual que envia `{ areaPaths: [...], syncAllIterations: true }`. Isso dispara a carga de todas as sprints 2026 para todos os times configurados.

### 4. Listar todas as iterações do projeto
Nova função `findAllIterations2026` que usa a Classification Nodes API, percorre a árvore e retorna todas as iterações cujo nome começa com "2026".

## Fluxo técnico

```text
Request: { areaPaths: ["Backoffice", ...], syncAllIterations: true }
                    │
    ┌───────────────┴───────────────┐
    │  Para cada areaPath:          │
    │  1. Classification Nodes API  │
    │  2. Filtrar iterações "2026"  │
    │  3. Para cada iteração:       │
    │     - WIQL com iteration path │
    │     - Fetch work items        │
    │     - Upsert sprint/items     │
    │     - Backfill OData          │
    └───────────────────────────────┘
```

## Arquivos alterados
- `supabase/functions/azure-sync/index.ts` — remover cleanup de sprints stale; adicionar `syncAllIterations`; refatorar `syncAreaPath` para aceitar iteração específica; nova função `findAllIterations2026`
- `src/pages/Settings.tsx` — botão "Carregar Histórico 2026"

## Observações
- O sync normal (sem `syncAllIterations`) continua funcionando igual, mas sem deletar sprints antigas
- O histórico é carregado uma vez; syncs subsequentes atualizam apenas a sprint corrente
- Sprints passadas terão `is_closed: true` se a end_date for anterior a hoje

