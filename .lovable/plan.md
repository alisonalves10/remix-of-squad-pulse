

# Melhorias na página de Sprint

## 1. Visão Gerencial com Collapse
Envolver o card da Visão Gerencial em um `Collapsible` (já importado) com estado inicial aberto, permitindo minimizar/expandir clicando no header. O ícone alterna entre `ChevronDown` e `ChevronRight`.

## 2. Coluna Parent com ID numérico
Na tabela de Work Items, trocar o conteúdo da coluna "US/Parent" para exibir o **ID numérico** do parent (ex: `#52497`) em vez do título. Renomear o header para "Parent".

## 3. Ordenar por Parent
Ordenar `filteredItems` por `parent_id` (nulls por último), agrupando visualmente os itens que pertencem ao mesmo parent.

## Arquivos alterados
- **`src/pages/Sprints.tsx`**:
  - Adicionar estado `const [isGerencialOpen, setIsGerencialOpen] = useState(true)` 
  - Envolver o card da Visão Gerencial em `Collapsible` com trigger no header
  - Na coluna Parent: mostrar `item.parent_id` formatado como `#ID` em vez de `parent_title`
  - Ordenar `filteredItems` por `parent_id` ascendente (nulls last)

