

# 4 ajustes: gráficos de pizza, sidebar, dashboard KPI, filtro de sprint nos work items

## 1. Gráficos de pizza — mostrar só valores, aumentar tamanho

**Arquivo:** `src/pages/Squads.tsx` (linhas 190-222)

- Trocar `label={({ name, value }) => \`${name}: ${value}\`}` por `label={({ value }) => value}` em ambos os PieCharts
- Aumentar `outerRadius` de 90 para 110 e `height` de 280 para 320

## 2. Indicador de sprint atual na sidebar

**Arquivo:** `src/components/layout/AppSidebar.tsx`

- Importar `useSprintsBySquad` ou criar query simples para buscar a sprint ativa (date-based)
- No `SidebarFooter`, acima do botão "Sair", exibir um badge/texto com o nome da sprint em andamento (ex: "Sprint 8 em andamento" com ícone Calendar)
- Usar `getCurrentSprint` de `sprint-utils` para determinar qual sprint mostrar
- Buscar todas as sprints sem filtro de squad e encontrar a ativa

## 3. Dashboard geral — trocar "Velocidade Média" por "Horas Lançadas"

**Arquivo:** `src/pages/Index.tsx` (linhas 119-124)

- Trocar título "Velocidade Média" por "Horas Lançadas"
- Trocar `value={avgVelocity}h` por total de horas (soma, não média)
- Trocar subtitle "Horas por sprint" por "Total na sprint selecionada"

**Arquivo:** `src/hooks/useDashboardData.ts`

- Expor `totalVelocity` (já calculado na linha 100, é a soma de `completed` hours) no retorno, renomeado como `totalHoursLogged`
- Manter `avgVelocity` para não quebrar outros usos, mas adicionar o campo total

## 4. Filtro de sprint manual na tabela de work items

**Arquivo:** `src/pages/Squads.tsx`

- Adicionar estado `selectedWorkItemsSprintId` (default = `currentSprint?.id`)
- No header do card "Work Items", adicionar um `Select` com as sprints não-futuras da squad
- Filtrar `workItems` pelo sprint selecionado no select (em vez de fixo no `currentSprint`)
- Atualizar título e descrição do card para refletir a sprint escolhida

## Arquivos alterados
- `src/pages/Squads.tsx` — labels dos pies, tamanho, filtro de sprint nos work items
- `src/components/layout/AppSidebar.tsx` — indicador de sprint ativa
- `src/pages/Index.tsx` — trocar KPI "Velocidade Média" por "Horas Lançadas"
- `src/hooks/useDashboardData.ts` — expor total de horas

