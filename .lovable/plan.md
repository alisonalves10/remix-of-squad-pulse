

# Ranking: filtro por Atribuição

## Mudança

### `src/pages/Ranking.tsx`
- Adicionar um novo `Select` de filtro "Atribuição" ao lado dos filtros existentes (Squad, Sprint)
- Extrair a lista de atribuições únicas dos dados de `rankings` (valores distintos de `userRole`)
- Filtrar o array `sorted` pelo `userRole` selecionado antes de renderizar o gráfico e a tabela

### `src/hooks/useRankingData.ts`
- Sem alterações — o campo `userRole` já é retornado nos dados

## Detalhes
- Estado: `roleFilter` com valor default `"all"`
- Opções do select: "Todas as atribuições" + lista única de roles extraída dos rankings
- Aplicar filtro no `useMemo` do `sorted`, antes do sort

## Arquivo alterado
- `src/pages/Ranking.tsx`

