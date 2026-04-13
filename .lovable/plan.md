

# Remover sprint E-commerce duplicada e Area Path duplicado

## Problema
- Existem 2 sprints "2026 - Sprint 7" para a squad E-commerce: uma com work items reais (id `59d860f0`) e outra vazia/duplicada (id `3e7b989e`) que mostra o burndown com remaining 138.75
- O array `area_paths` tem "E-commerce" e "E-Commerce" (duplicado com casing diferente)

## Correções

### 1. Migration SQL para limpar dados duplicados
```sql
-- Remover dados da sprint duplicada
DELETE FROM sprint_progress_daily WHERE sprint_id = '3e7b989e-47c7-4d34-84a0-581510d28dcf';
DELETE FROM metrics_snapshot WHERE sprint_id = '3e7b989e-47c7-4d34-84a0-581510d28dcf';
DELETE FROM work_items WHERE sprint_id = '3e7b989e-47c7-4d34-84a0-581510d28dcf';
DELETE FROM sprints WHERE id = '3e7b989e-47c7-4d34-84a0-581510d28dcf';

-- Remover "E-Commerce" duplicado do array area_paths
UPDATE azure_config SET area_paths = array_remove(area_paths, 'E-Commerce');
```

### 2. Nenhuma alteração de código necessária
A correção anterior no `azure-sync` (lookup case-insensitive com `ilike`) já previne futuras duplicações.

