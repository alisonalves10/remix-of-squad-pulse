

# Trazer responsáveis pelas Tasks, Issues, Bugs e Speed

## Problema
O campo `assigned_to_user_id` está sempre `null` em todos os work items porque a edge function `azure-sync` não extrai o campo `System.AssignedTo` do Azure DevOps, e a tabela `users` está vazia.

## Solução

### 1. `supabase/functions/azure-sync/index.ts`
Na função `syncToDatabase`, após processar os work items:

- Extrair `System.AssignedTo` de cada work item (contém `displayName`, `uniqueName`, `id`)
- Coletar todos os `uniqueName` distintos do batch
- Para cada pessoa, fazer upsert na tabela `users` usando `azure_devops_unique_name` como chave de match (buscar existente com `ilike`, criar se não existir)
- Mapear `uniqueName → user.id` e gravar `assigned_to_user_id` no insert do work_item

Campos do Azure DevOps disponíveis em `System.AssignedTo`:
- `displayName` → `users.name`
- `uniqueName` → `users.email` e `users.azure_devops_unique_name`

### 2. Nenhuma mudança no frontend
O hook `useSprintDetailData` já faz join com a tabela `users` e popula `assigned_to_name`. A tabela de work items operacionais já tem a coluna "Responsável". Basta que o dado exista no banco.

## Arquivos alterados
- `supabase/functions/azure-sync/index.ts` — extrair AssignedTo, upsert users, gravar assigned_to_user_id

## Após implementação
Re-sincronizar para que os responsáveis sejam populados.

