

# Fix: Duplicação de squad e perda de Area Paths

## Problemas identificados

1. **Squad "E-commerce" duplicada**: Existem duas squads — "E-commerce" e "E-Commerce" — porque o `upsert` no `onConflict: "name"` é case-sensitive. Quando o Azure DevOps retorna o Area Path com capitalização diferente, o sistema cria uma nova squad.

2. **Area Paths desaparecendo**: A configuração salva no banco tem apenas 6 paths. Os 6 extras foram selecionados na UI mas não foram salvos antes de clicar em "Sincronizar". Ao recarregar, voltou ao estado salvo.

## Correções

### 1. Merge e remoção da squad duplicada (SQL via migration)
- Migrar work_items, sprints, metrics_snapshot e sprint_progress_daily da squad "E-Commerce" para "E-commerce"
- Deletar a squad "E-Commerce" duplicada

### 2. Edge function `azure-sync` — normalização de nome
- No `syncToDatabase`, antes do upsert, normalizar o nome da squad com `trim()` e comparação case-insensitive: buscar squad existente com `ilike` antes de criar nova.

### 3. Settings — salvar automaticamente antes de sincronizar
- No `handleSync` em `Settings.tsx`, chamar `handleSaveConfig()` automaticamente antes de invocar a edge function, garantindo que os Area Paths selecionados sejam persistidos.

### 4. Atualizar azure_config com os 12 Area Paths corretos
- Usar insert tool para atualizar o array `area_paths` com todos os 12 paths que o usuário selecionou.

## Detalhes técnicos

**Edge function** — trecho da mudança no `syncToDatabase`:
```typescript
// Buscar squad existente com case-insensitive
const { data: existingSquad } = await supabase
  .from("squads")
  .select("id, name")
  .ilike("name", squadName)
  .maybeSingle();

if (existingSquad) {
  squadId = existingSquad.id;
  // Atualizar descrição se necessário
} else {
  // Criar nova squad
}
```

**Settings.tsx** — auto-save antes do sync:
```typescript
const handleSync = async () => {
  await handleSaveConfig(); // Salvar config primeiro
  // ... resto do sync
};
```

