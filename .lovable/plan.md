

# Rateio de investimento entre múltiplas Unidades de Negócio

## Contexto
Já planejamos permitir múltiplas BUs por demanda via tabela de junção `roadmap_item_business_units`. Agora, quando mais de uma BU é selecionada, o usuário precisa também distribuir o valor investido entre elas (mesmo padrão já usado para squads).

## Mudanças

### 1. Schema — adicionar coluna de rateio
Migration na tabela `roadmap_item_business_units` (a ser criada):

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid PK | |
| roadmap_item_id | uuid | Ref `roadmap_items` (ON DELETE CASCADE) |
| business_unit_id | uuid | Ref `business_units` |
| **cost_share** | **numeric NOT NULL DEFAULT 0** | **Valor alocado para essa BU (R$)** |

RLS: SELECT autenticados / INSERT-UPDATE-DELETE admins. UNIQUE em `(roadmap_item_id, business_unit_id)`.

### 2. Formulário (`src/pages/Roadmap.tsx`)
- Substituir o select único de BU por **lista de checkboxes** (mesmo visual das squads)
- Quando uma BU é marcada, exibir ao lado um campo de valor (R$) — idêntico ao padrão de squads
- Quando **apenas 1 BU** estiver marcada: ocultar o campo de valor e atribuir automaticamente 100% do `estimated_cost` para ela (não exige rateio manual)
- Quando **2+ BUs** marcadas: exibir os campos de valor + indicador visual "Total rateado: R$ X de R$ Y" comparando com `estimated_cost`
- Estado: `selectedBUs: Record<string, number>` (busId → cost_share)
- Pré-popular ao editar a partir da junção
- Ao salvar: deletar entradas antigas da junção e inserir N novas com `cost_share`

### 3. Hook (`src/hooks/useRoadmapData.ts`)
Adicionar `useRoadmapItemBusinessUnits()` que retorna a junção com `cost_share` e join em `business_units(name)`.

### 4. Visualizações afetadas
- **Tabela de demandas**: coluna "Unidade de Negócio" mostra múltiplos badges (nome da BU + valor rateado quando há rateio)
- **Visão por BU (`buData`)**: somar `cost_share` da junção em vez de somar `estimated_cost` por `business_unit_id`. Para itens sem entrada na junção, fallback ao comportamento legado (`estimated_cost` total → `business_unit_id`)
- **Filtro por BU**: filtrar demandas pela presença na junção
- **Cards de resumo de investimento por BU**: usar a soma dos `cost_share` em vez de `estimated_cost` integral

### 5. Compatibilidade
Manter `business_unit_id` em `roadmap_items` apontando para a primeira BU selecionada (legado). Fonte de verdade para investimento por BU passa a ser `roadmap_item_business_units.cost_share`.

## Arquivos alterados
- **Migration SQL** — criar `roadmap_item_business_units` com coluna `cost_share`, RLS e UNIQUE constraint
- **`src/hooks/useRoadmapData.ts`** — novo hook `useRoadmapItemBusinessUnits`
- **`src/pages/Roadmap.tsx`** — checkboxes de BU com campo de rateio condicional, badges com valor na tabela, recálculo de `buData` usando `cost_share`

