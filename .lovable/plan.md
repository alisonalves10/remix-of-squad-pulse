

# Fix: Nome incorreto do Area Path + auto-save + fallback de iteração

## Problemas

1. **"B2B e Instalacoes"** está salvo no banco com grafia errada. Ao adicionar o nome correto via UI, o `handleAddAreaPath` não persiste no banco — só atualiza estado local.
2. **Infraestrutura e Arquitetura e Inovação**: o fallback `findIterationByDate` usa `teamsettings/iterations` que retorna apenas 2 sprints de 2024. Precisa usar Classification Nodes API que lista TODAS as iterações.

## Mudanças

### 1. `src/pages/Settings.tsx` — auto-save no `handleAddAreaPath`
Adicionar persistência imediata ao banco (igual já existe em `handleRemoveAreaPath` e `handleToggleAreaPath`):
```typescript
const handleAddAreaPath = () => {
  // ... validação existente ...
  const updated = [...areaPaths, trimmed];
  setAreaPaths(updated);
  setNewAreaPath("");
  if (configId) {
    supabase.from("azure_config").update({ 
      area_paths: updated, 
      updated_at: new Date().toISOString() 
    }).eq("id", configId);
  }
};
```

### 2. `supabase/functions/azure-sync/index.ts` — fallback via Classification Nodes API
Quando `findIterationByDate` (que usa `teamsettings/iterations`) não encontra iteração para hoje, adicionar segundo fallback:
```
GET /{org}/{project}/_apis/wit/classificationnodes/Iterations?$depth=10&api-version=7.0
```
Percorrer a árvore recursivamente para encontrar a iteração cujas datas cobrem hoje. Esta API retorna todas as iterações do projeto independente de team settings.

## Arquivos alterados
- `src/pages/Settings.tsx` — auto-save no handleAddAreaPath
- `supabase/functions/azure-sync/index.ts` — adicionar `findIterationByClassificationNodes` como fallback final

## Ação manual necessária
Após o deploy, remover o Area Path "B2B e Instalacoes" (errado) e adicionar "B2B e Instalação" ou o nome exato do Azure. Usar o botão "Buscar Area Paths do Azure DevOps" para confirmar a grafia correta.

