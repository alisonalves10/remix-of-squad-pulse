

# Rateio de demanda entre múltiplas Squads

## Problema atual
A tabela `roadmap_items` tem um único campo `squad_id`, permitindo apenas uma squad por demanda. O usuário quer selecionar várias squads e definir o valor rateado para cada uma.

## Mudanças

### 1. Nova tabela: `roadmap_item_squads`
Tabela de junção para associar uma demanda a múltiplas squads com valor rateado:

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid PK | |
| roadmap_item_id | uuid | Ref roadmap_items |
| squad_id | uuid | Ref squads |
| cost_share | numeric | Valor alocado para essa squad (R$) |

RLS: leitura para autenticados, escrita para admins (mesmo padrão de `roadmap_items`).

### 2. Formulário de criação (`src/pages/Roadmap.tsx`)
- Substituir o select único de Squad por uma lista de checkboxes/multi-select com as squads disponíveis
- Para cada squad selecionada, exibir um campo de valor (R$) ao lado
- Mostrar o total rateado vs. custo estimado para validação visual
- No submit: inserir o `roadmap_item` (sem `squad_id`) e depois inserir N registros em `roadmap_item_squads`

### 3. Hook de dados (`src/hooks/useRoadmapData.ts`)
- Adicionar hook `useRoadmapItemSquads()` para buscar a tabela de junção com joins em squads
- Ajustar `useRoadmapItems` para incluir os dados de rateio via join ou query separada

### 4. Visualizações afetadas (`src/pages/Roadmap.tsx`)
- **Tabela de demandas**: mostrar as squads associadas como badges em vez de uma única squad
- **Visão por Squad**: recalcular investimento por squad usando `cost_share` da tabela de junção
- **Filtro por Squad**: filtrar demandas que tenham a squad selecionada na tabela de junção

### 5. Campo `squad_id` legado
- Manter o campo `squad_id` em `roadmap_items` por compatibilidade, mas deixar de usá-lo no formulário (usar a nova tabela)

## Arquivos alterados
- **Migration SQL** — criar tabela `roadmap_item_squads` com RLS
- **`src/pages/Roadmap.tsx`** — formulário multi-squad com rateio, tabela com badges, filtro ajustado
- **`src/hooks/useRoadmapData.ts`** — novo hook para buscar rateio por squad

