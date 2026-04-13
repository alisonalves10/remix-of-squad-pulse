

# Fix: Times ausentes e burndown de Dados e Analytics

## Problemas identificados

### 1. Times ausentes (Infraestrutura, Arquitetura e Inovação, B2B e Instalação)
A edge function `azure-sync` usa o Area Path como nome de **Team** na URL da API Azure DevOps:
```
https://dev.azure.com/org/project/B2B e Instalação/_apis/work/teamsettings/iterations
```
O Azure retorna erro 404: *"The team with id 'B2B e Instalação' does not exist"*. Esses Area Paths não correspondem a um Team no Azure DevOps, então tanto a busca de iteração quanto o WIQL falham silenciosamente.

### 2. Burndown de Dados e Analytics
Os dados existem no banco (11 registros em `sprint_progress_daily`). É provável que o gráfico esteja renderizando, mas o usuário pode não ter navegado até essa sprint. Vou verificar se há algum problema de renderização adicional.

## Solução

### Edge function `azure-sync/index.ts` — fallback para API de projeto

Modificar `syncAreaPath` para:

1. **Iteração**: Se a busca por team falhar (404), buscar iterações no nível do projeto (`/project/_apis/work/teamsettings/iterations`) usando o time padrão, ou extrair o iteration path via WIQL.

2. **WIQL**: Se o WIQL com contexto de team falhar, repetir usando a URL base do projeto (sem o team no path):
   ```
   https://dev.azure.com/org/project/_apis/wit/wiql
   ```
   O filtro `[System.AreaPath] UNDER` já garante que só work items do Area Path correto são retornados.

3. **Iteração via WIQL alternativo**: Quando não há team, buscar a iteração corrente consultando um work item existente no Area Path e extraindo seu `System.IterationPath`, ou usar uma query WIQL sem `@CurrentIteration` e sim com filtro temporal baseado nas datas do sprint.

### Mudança concreta no `syncAreaPath`:

```text
syncAreaPath():
  1. Tentar buscar iteração com teamAzureBase (como hoje)
  2. Se falhar (404), tentar com azureBase (nível projeto) usando o time padrão do projeto
  3. Se ambos falharem, usar WIQL alternativo:
     - Query sem @CurrentIteration, filtrando por AreaPath e 
       IterationPath UNDER o caminho raiz das iterações
  4. WIQL: se falhar com teamAzureBase, repetir com azureBase
```

### Arquivos alterados
- `supabase/functions/azure-sync/index.ts` — adicionar fallback na busca de iteração e WIQL

Nenhuma migration necessária.

## Detalhes técnicos

A mudança principal está em duas funções:

**`fetchCurrentIteration`**: Aceitar um fallback URL e tentar ambos (team → project level).

**`syncAreaPath`**: 
- Construir `fallbackBase = azureBase` (sem team no path)
- Se `fetchCurrentIteration(teamAzureBase)` retornar null, tentar `fetchCurrentIteration(fallbackBase)` 
- Se WIQL com `teamAzureBase` falhar, repetir com `fallbackBase`
- Substituir `@CurrentIteration` por iteração explícita quando obtida via fallback

