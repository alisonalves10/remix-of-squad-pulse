

# Botão de re-sincronização manual na tela de Sprint

## O que será feito

Adicionar um botão "Sincronizar" na barra de ações da tela de detalhes da sprint (ao lado dos botões de exportação e do seletor de sprint). Ao clicar, o sistema chamará a edge function `azure-sync` passando o Area Path da squad atual, forçando a atualização dos dados históricos de burndown/burnup. Mostrará feedback via toast (sucesso/erro) e invalidará o cache do TanStack Query para recarregar os gráficos automaticamente.

## Alterações

**`src/pages/Sprints.tsx`**
- Importar `Button`, `RefreshCw` (lucide), `supabase` client, `useQueryClient`, `toast`
- Adicionar estado `isSyncing`
- Criar função `handleResync` que:
  1. Chama `supabase.functions.invoke("azure-sync", { body: { areaPaths: [sprint.squadName] } })`
  2. Mostra toast de sucesso/erro
  3. Invalida queries do TanStack Query para recarregar dados
- Inserir o botão com ícone `RefreshCw` (animação de spin durante loading) na `actions` area, ao lado de `ExportButtons`

Nenhuma alteração de backend necessária — a edge function já aceita `areaPaths` no body.

