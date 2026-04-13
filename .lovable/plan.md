

# Fix: Token expira durante sincronização histórica longa

## Problema
A sincronização histórica de 23 times × ~8 iterações cada leva muito tempo. O access token do usuário expira durante o processo, causando:
- **"Failed to fetch"** nos primeiros times (timeout de 5 minutos excedido por time com 8+ iterações)
- **"Unauthorized"** nos times seguintes (token expirado)

## Solução

### 1. Refresh do token antes de cada requisição (`src/pages/Settings.tsx`)
No loop do `handleSync`, chamar `supabase.auth.getSession()` antes de cada chamada para garantir um token fresco:

```typescript
for (let i = 0; i < areaPaths.length; i++) {
  // Refresh token before each call
  const { data: { session: freshSession } } = await supabase.auth.getSession();
  // use freshSession.access_token in the fetch
}
```

### 2. Usar service role no edge function para chamadas históricas (`supabase/functions/azure-sync/index.ts`)
Alternativa mais robusta: quando `syncAllIterations` é true, o edge function já usa o service role client para queries. O problema é apenas a **autenticação inicial** do usuário. O token precisa ser válido apenas na hora da chamada HTTP.

O refresh no frontend resolve isso — o `getSession()` do Supabase automaticamente renova tokens expirados.

## Arquivo alterado
- `src/pages/Settings.tsx` — mover `getSession()` para dentro do loop, antes de cada `fetch`

