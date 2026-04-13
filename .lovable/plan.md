

# Fix: Edge function timeout ao sincronizar 12 Area Paths

## Problema

A edge function `azure-sync` processa todos os Area Paths sequencialmente em uma única chamada. Com 12 times, cada um fazendo 4+ chamadas HTTP ao Azure DevOps (iteration, WIQL, work items, OData backfill), a função excede o timeout padrão de ~60s e retorna "Failed to send a request to the edge function".

## Solução

Duas mudanças complementares:

### 1. Aumentar timeout da edge function (`supabase/config.toml`)
Adicionar configuração para a function `azure-sync` com `wall_clock_limit` de 300s (máximo permitido).

```toml
[functions.azure-sync]
verify_jwt = false
wall_clock_limit = 300
```

### 2. Frontend: chamar a edge function com timeout estendido (`src/pages/Settings.tsx`)
Substituir `supabase.functions.invoke()` por um `fetch` direto com timeout de 5 minutos via `AbortController`, já que o SDK tem timeout interno menor. Isso garante que o frontend não cancele a requisição antes da function terminar.

```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 min

const response = await fetch(
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/azure-sync`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify({ areaPaths }),
    signal: controller.signal,
  }
);
clearTimeout(timeoutId);
const data = await response.json();
```

### Arquivos alterados
- `supabase/config.toml` — adicionar bloco `[functions.azure-sync]`
- `src/pages/Settings.tsx` — substituir `supabase.functions.invoke` por `fetch` com timeout estendido

