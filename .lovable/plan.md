

# Adicionar Tooltip na tabela "Performance das Squads"

Adicionar um ícone de informação (?) ao lado do título "Performance das Squads" com um tooltip explicando o significado da seção.

## Mudanças

### `src/components/dashboard/SquadsTable.tsx`
- Importar `Tooltip, TooltipTrigger, TooltipContent, TooltipProvider` de `@/components/ui/tooltip`
- Importar `Info` de `lucide-react`
- No `CardTitle`, adicionar um ícone `Info` envolvido por um Tooltip com texto explicativo, ex: "Métricas consolidadas da última sprint fechada de cada squad: velocidade (horas concluídas), comprometimento (planejado vs entregue), spillover (itens replanejados) e bugs (criados vs resolvidos)."

### `src/pages/Index.tsx`
- Envolver o componente com `TooltipProvider` (se ainda não estiver no layout)

