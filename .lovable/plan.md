

# Três melhorias: Spillover na tabela, Burndown no detalhe da sprint, Filtro de tipos na Squads

## 1. Indicador de Spillover na tabela de Work Items (Sprints.tsx)

**Arquivo:** `src/pages/Sprints.tsx` (linhas 434-456)
- Adicionar uma coluna "Spillover" na tabela de work items ou exibir um badge inline ao lado do título/ID quando `item.is_spillover === true`
- Usar um Badge laranja similar ao já existente na visão gerencial (linha 494-497): `border-orange-400 text-orange-600`
- Abordagem: adicionar o badge ao lado do título na célula existente (sem coluna extra, mais limpo)

## 2. Gráfico de Burndown na página de detalhe da sprint

**Arquivo:** `src/pages/Sprints.tsx`
- O burndown já existe na página! (linhas 330-344) — já renderiza `BurndownChart` e `BurnupChart`
- Verificar se o pedido se refere a outro local. Caso seja a página de **Squads** (`/squads`), que não tem burndown, será necessário:
  - Buscar dados de `sprint_progress_daily` para a sprint selecionada
  - Computar burndown data (remaining vs ideal) e renderizar o `BurndownChart` existente
  
**Decisão:** Como a página Sprints já tem burndown, vou adicionar o burndown na página **Squads** para a sprint atual/selecionada.

**Arquivo:** `src/pages/Squads.tsx`
- Importar `BurndownChart` de `@/components/dashboard/BurndownChart`
- Buscar `sprint_progress_daily` no hook `useSquadsData` ou inline com uma query adicional
- Computar `burndownData` (remaining + ideal) similar ao `useSprintDetailData`
- Renderizar o gráfico após os KPIs

## 3. Não listar Features e Épicos na tabela de Work Items da página Squads

**Arquivo:** `src/pages/Squads.tsx` (linhas 60-68)
- Filtrar `tableWorkItems` para excluir tipos "Epic", "Feature" e "User Story"
- Manter apenas tipos operacionais: Task, Bug, Issue, Speed
- Alterar o `useMemo` de `tableWorkItems` adicionando `.filter(wi => !["Epic", "Feature", "User Story"].includes(wi.type))`

## Arquivos alterados
- `src/pages/Sprints.tsx` — badge de spillover na tabela de work items
- `src/pages/Squads.tsx` — filtrar tipos operacionais na tabela + adicionar burndown chart
- `src/hooks/useSquadsData.ts` — possivelmente buscar dados de progresso diário para burndown

