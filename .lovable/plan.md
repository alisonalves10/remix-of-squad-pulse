

# Ajustar página Squads: Gráficos de pizza + filtrar work items por sprint atual

## Problemas

1. **"Por Tipo" e "Por Estado"** são listas simples — devem ser gráficos de pizza (PieChart do Recharts). Excluir itens com estado "Closed" de ambos os agrupamentos.
2. **Work Items e KPIs** usam `useWorkItemsBySquad` que busca TODOS os work items da squad (sem filtro de sprint). Devem mostrar apenas os itens da sprint corrente.

## Mudanças

### `src/hooks/useSquadsData.ts`
- Alterar `useWorkItemsBySquad` para aceitar um `sprintId` opcional e filtrar por `sprint_id` quando fornecido.
- Alternativa: manter o hook como está e filtrar no componente (mais simples, sem breaking change).

### `src/pages/Squads.tsx`

**1. Filtrar work items pela sprint atual:**
- Identificar `currentSprint` com `getCurrentSprint(sprints)`
- Filtrar `workItems` por `wi.sprint_id === currentSprint.id` para KPIs e tabela

**2. Excluir "Closed" dos agrupamentos por tipo e estado:**
- Antes de agrupar `byType` e `byState`, filtrar itens cujo `state !== "Closed"`

**3. Trocar listas por PieChart (Recharts):**
- Importar `PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend` de `recharts`
- Substituir as divs de lista nos cards "Por Tipo" e "Por Estado" por gráficos de pizza
- Definir paleta de cores para as fatias (ex: azul, vermelho, amarelo, verde, roxo)
- Cada fatia mostra o tipo/estado e a quantidade

**4. Remover coluna "Pontos"** da tabela de work items (o projeto não usa story points)

## Arquivos alterados
- `src/pages/Squads.tsx` — gráficos de pizza, filtro por sprint atual, remover "Pontos"

