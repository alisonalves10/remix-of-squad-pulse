

# Profissionais: dados reais do banco + ajustes de métricas

## Resumo
Substituir todos os dados mock da página Profissionais por dados reais (tabelas `users`, `work_items`, `sprints`, `squads`). Trocar "Story Points" por "Horas" em todos os lugares. Adicionar coluna `area_path` na tabela `work_items`. Adicionar filtro por sprint no topo e trazer histórico do ano inteiro.

## Mudanças no banco de dados

### Migration: adicionar `area_path` à tabela `work_items`
```sql
ALTER TABLE work_items ADD COLUMN area_path text;
```

### Atualizar Azure Sync (`supabase/functions/azure-sync/index.ts`)
- Na inserção de work_items (linha ~508), adicionar `area_path: wi.fields["System.AreaPath"] || null`

## Novo hook: `src/hooks/useProfessionalsData.ts`
- `useProfessionals()` — busca todos os `users` com seus dados
- `useWorkItemsByUser(userId, year)` — busca work_items filtrados por `assigned_to_user_id` e sprints do ano (2026), com join em sprints para obter nome da sprint. Não trazer sprints futuras.
- Cálculos de KPIs: total de horas (`SUM(completed_work)`), itens concluídos, bugs resolvidos, média de horas por sprint

## Página `src/pages/Professionals.tsx` — reescrever com dados reais

### Filtros (topo)
- **Profissional**: Select populado com `users` reais
- **Sprint**: Select com todas as sprints não-futuras do ano (default "Todas"), filtra a tabela de histórico
- Manter filtro de Squad opcional

### KPIs (4 cards)
- **Horas Lançadas** (antes "Story Points") — `SUM(completed_work)` dos itens do profissional no ano
- **Itens Concluídos** — contagem de itens
- **Bugs Resolvidos** — contagem de itens tipo Bug com estado Done/Closed
- **Média por Sprint** → "Horas por Sprint" — total horas / número de sprints com atividade

### Gráficos
- **"Horas por Sprint"** (antes "Story Points por Sprint") — bar chart com `completed_work` agrupado por sprint
- **"Itens por Sprint"** — mantém, agrupado por sprint

### Tabela "Histórico de Itens"
- Trazer todos os itens do ano (sprints de 2026), filtrável pelo select de sprint no topo
- Colunas: Sprint | ID | Título | Tipo | **Horas** (antes "Points") | **Area Path** (nova) | Estado
- Ordenar por sprint (mais recente primeiro)

## Arquivos alterados
- **Migration SQL** — `area_path` em `work_items`
- **`supabase/functions/azure-sync/index.ts`** — gravar `area_path`
- **`src/hooks/useProfessionalsData.ts`** — novo hook com queries reais
- **`src/pages/Professionals.tsx`** — reescrever com dados reais, trocar SP por horas, filtro de sprint, coluna area_path

