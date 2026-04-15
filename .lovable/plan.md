

# Alinhar Dashboard Geral com a lógica das Sprints

## Problema
O Dashboard Geral usa `metrics_snapshot` para bugs (bugs_created/bugs_resolved), enquanto a página de Sprint calcula bugs diretamente dos `work_items` (type === "Bug", estado Done/Closed = resolvido). Isso pode gerar divergências.

## Mudanças em `src/hooks/useDashboardData.ts`

### 1. Bugs — usar work_items (como na sprint)
Substituir a lógica de bugs baseada em `metrics_snapshot` por contagem direta dos `work_items` da sprint mais recente de cada squad:
- `bugsCreated` = work_items com `type === "Bug"`
- `bugsResolved` = work_items com `type === "Bug"` e `state in ["Done", "Closed"]`
- `bugRate` = bugsCreated > 0 ? `Math.round((bugsResolved / bugsCreated) * 100)` : 0
- Inverter a semântica: mostrar **taxa de resolução** (não de criação), consistente com sprint

### 2. Completion Rate — adicionar ao dashboard
Calcular `completionRate` global (itens Done/Closed vs total) da sprint mais recente de cada squad, igual à sprint:
- Total de itens e concluídos (state in ["Done", "Closed"]) somados across squads
- Exibir como subtitle no KPI de "Squads Monitoradas" ou como novo KPI

### 3. Spillover — manter (já consistente)
Já usa `work_items.is_spillover`, igual à sprint.

### 4. Velocity e Commitment — manter (já consistente)
Já usa `metrics_snapshot.completed_hours/planned_hours`, igual à sprint.

## Mudanças em `src/pages/Index.tsx`

### KPI de Bugs
- Mudar label para "Bugs" com valor `bugsCreated/bugsResolved` (ex: "5/3")
- Subtitle: taxa de resolução (ex: "60% resolvidos")
- Variant: `bugsCreated === 0 ? "success" : bugsResolved >= bugsCreated ? "success" : "danger"`

### KPI de Completion Rate
- Adicionar subtitle no KPI "Squads Monitoradas" com `completionRate% entregue` ou trocar por um KPI dedicado de "Entrega"

### Squad Table — adicionar coluna de bugs
- Incluir `bugsCreated` e `bugsResolved` por squad no `squadTableData`

## Arquivos alterados
- **`src/hooks/useDashboardData.ts`** — recalcular bugs via work_items, adicionar completionRate global
- **`src/pages/Index.tsx`** — atualizar KPIs de bugs e adicionar completion rate

