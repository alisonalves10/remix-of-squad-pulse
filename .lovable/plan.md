

# Fix: Times ausentes na sincronização e remoção de Area Path não persistindo

## Problemas identificados

### 1. Times Infraestrutura, Arquitetura e Inovação, B2B e Instalação não aparecem
Os logs mostram que o fallback de iteração no nível de projeto retorna **"Sprint 2"** (de agosto 2024) — uma iteração antiga do time padrão do projeto. O WIQL filtra por essa iteração antiga, não encontra work items, retorna `synced: 0`, e nenhuma squad é criada no banco.

A causa raiz: `fetchCurrentIteration` com a URL de projeto usa o time padrão do Azure DevOps, que pode ter uma configuração de iterações diferente/desatualizada.

### 2. Remoção de Area Path não persiste
Quando o usuário remove um Area Path clicando no "X" do badge, o `handleRemoveAreaPath` apenas atualiza o estado local. O usuário precisa clicar "Salvar Configurações" para persistir. Isso não é intuitivo.

## Solução

### 1. Edge function: buscar iteração correta por data (`azure-sync/index.ts`)

Quando o fallback retorna uma iteração cujas datas não cobrem a data atual, listar **todas** as iterações do projeto e encontrar a que corresponde a "hoje":

```typescript
async function fetchCurrentIteration(baseUrl, headers): Promise<IterationInfo | null> {
  // Tentar com $timeframe=current (como hoje)
  const result = await tryFetchIteration(baseUrl, headers);
  if (result && isIterationCurrent(result)) return result;
  
  // Se retornou uma iteração antiga, listar TODAS e buscar pela data
  const allUrl = `${baseUrl}/_apis/work/teamsettings/iterations?api-version=7.0`;
  const allRes = await fetch(allUrl, { headers });
  if (allRes.ok) {
    const data = await allRes.json();
    const today = new Date().toISOString().split("T")[0];
    const current = data.value.find(iter => 
      iter.attributes?.startDate?.split("T")[0] <= today && 
      iter.attributes?.finishDate?.split("T")[0] >= today
    );
    if (current) return { name: current.name, path: current.path, ... };
  }
  return result; // retorna o que tiver, mesmo antigo
}
```

Isso garante que, mesmo quando o time padrão do projeto está desatualizado, a edge function encontra a iteração certa por sobreposição de datas.

### 2. Auto-save dos Area Paths (`src/pages/Settings.tsx`)

Adicionar `useEffect` que salva automaticamente quando `areaPaths` mudam (com debounce para evitar chamadas excessivas):

```typescript
useEffect(() => {
  if (!configId || isLoading) return;
  const timeout = setTimeout(() => {
    handleSaveConfig();
  }, 1000);
  return () => clearTimeout(timeout);
}, [areaPaths]);
```

Alternativa mais simples: chamar `handleSaveConfig()` diretamente dentro de `handleRemoveAreaPath` e `handleToggleAreaPath`.

## Arquivos alterados
- `supabase/functions/azure-sync/index.ts` — melhorar `fetchCurrentIteration` para buscar por data quando o resultado é antigo
- `src/pages/Settings.tsx` — auto-save ao modificar area paths

