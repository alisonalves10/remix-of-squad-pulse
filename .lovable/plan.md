

# Melhorias nos KPIs da Sprint

## 1. Porcentagem de entrega de itens
Adicionar subtitle com a porcentagem de itens concluídos no KPI "Itens Concluídos".

**Em `src/hooks/useSprintDetailData.ts`:**
- Calcular `completionRate = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0`
- Retornar `completionRate` no objeto de retorno

**Em `src/pages/Sprints.tsx`:**
- No KPI "Itens Concluídos", adicionar `subtitle={`${completionRate}% concluídos`}`

## 2. Bugs — verificação dos dados
Os dados estão corretos. A contagem de bugs vem de todos os work_items da sprint onde `type === "Bug"`. Backoffice Sprint 7 realmente tem 0 bugs no banco. Squads como "Arquitetura e Inovação" Sprint 6 têm 19 bugs. O KPI está funcionando — o valor 0/0 significa que não houve bugs nessa sprint.

Para melhorar a visibilidade, vou adicionar também o subtitle no KPI de Bugs mostrando a taxa de resolução quando houver bugs.

## Arquivos alterados
- **`src/hooks/useSprintDetailData.ts`** — adicionar `completionRate` ao retorno
- **`src/pages/Sprints.tsx`** — exibir `completionRate` como subtitle no KPI "Itens Concluídos" e melhorar subtitle do KPI de Bugs

