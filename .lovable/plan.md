

# Fix: WIQL falha com backslash no início do iteration path

## Problema
A Classification Nodes API retorna paths como `\Webcontinental\2026 - Sprint 8` (com `\` no início). O WIQL do Azure DevOps rejeita paths que começam com backslash (erro `TF51008`). Isso afeta todos os times que usam o fallback de Classification Nodes (Infraestrutura, Arquitetura e Inovação, B2B e Instalação, Segurança da Informação, Pós Venda).

Os times Backoffice, Vendas, Logística, Sellers e Produtos, Dados e Analytics e E-Commerce funcionam porque obtêm o path sem backslash inicial via a API de team settings.

## Solução

**Arquivo: `supabase/functions/azure-sync/index.ts`**

Na função `findNodeByDate` (linha 296), após limpar o path de `\Iteration\`, adicionar remoção do backslash inicial:

```typescript
const cleanPath = rawPath
  .replace(/\\Iteration\\/, "\\")
  .replace(/\\Iteration$/, "")
  .replace(/^\\/, "");  // Remove leading backslash
```

Isso transforma `\Webcontinental\2026 - Sprint 8` em `Webcontinental\2026 - Sprint 8`, que é o formato aceito pelo WIQL.

## Impacto
- Corrige sincronização de 5 times que atualmente falham
- Não afeta times que já funcionam (eles não passam pelo fallback)

