

# Fix: Visão gerencial deve incluir itens relacionados de outras sprints

## Problema
A visão gerencial (hierarquia Epic → Feature → US) só mostra work items cujo `sprint_id` é igual à sprint selecionada. Porém, no Azure DevOps, uma Feature pode estar na Sprint 7 enquanto suas User Stories filhas estão na Sprint 8 (ou vice-versa). Exemplo concreto: Feature 51638 está na Sprint 7 do Backoffice, mas a US 52497 (filha dela) está na Sprint 8 — e não aparece na árvore.

Há pelo menos 12 itens nessa situação só para a Sprint 7 do Backoffice.

## Solução

### `src/hooks/useSprintDetailData.ts`

Após buscar os work items da sprint, fazer uma segunda query para buscar itens relacionados (pais e filhos) que estejam em **outras sprints do mesmo squad**:

1. Coletar todos os `parent_id` dos itens da sprint que não têm o parent presente na sprint
2. Coletar todos os `id` dos itens management (Epic/Feature/US) para buscar filhos em outras sprints
3. Fazer uma query adicional: `work_items WHERE (id IN [...parent_ids] OR parent_id IN [...management_ids]) AND sprint_id != current_sprint_id AND squad_id = current_squad_id`
4. Mesclar esses itens "cross-sprint" no `managementItems` antes de construir a árvore
5. Marcar esses itens com um flag `crossSprint: true` para exibir visualmente que pertencem a outra sprint

### `src/pages/Sprints.tsx`

Na renderização do `HierarchyNode`, exibir um badge discreto (ex: "Sprint 8") nos itens que vieram de outra sprint, para o gestor saber que o item está sendo tocado em outra iteração.

## Arquivos alterados
- `src/hooks/useSprintDetailData.ts` — query adicional para buscar itens cross-sprint e incluí-los na árvore
- `src/pages/Sprints.tsx` — badge indicando sprint de origem nos itens cross-sprint

## Impacto
- A árvore gerencial passa a mostrar a hierarquia completa, independente de em qual sprint cada item foi alocado
- O gestor consegue ver todas as US vinculadas a uma Feature, mesmo que estejam em sprints diferentes

