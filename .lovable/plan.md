

# Visão hierárquica de Work Items + Painel de Épicos/Features/US

## Resumo
Adicionar campo `parent_id` nos work items para registrar a hierarquia do Azure DevOps (Epic → Feature → US → Task/Bug). Criar um painel de visão gerencial mostrando Épicos, Features e User Stories em árvore antes da tabela de work items. Na tabela, Tasks e Bugs passam a exibir a US pai relacionada.

## Alterações

### 1. Migração: adicionar `parent_id` à tabela `work_items`
```sql
ALTER TABLE work_items ADD COLUMN parent_id integer;
```

### 2. Edge function: capturar `parent_id` das relations (`azure-sync/index.ts`)
A API já retorna `$expand=relations`. Extrair o parent de cada work item a partir dos links de hierarquia (`System.LinkTypes.Hierarchy-Reverse`), que aponta para o pai. Salvar o `parent_id` no insert do work item.

```text
relations.filter(r => r.rel === "System.LinkTypes.Hierarchy-Reverse")
  → extrair ID da URL → parent_id
```

### 3. Hook: expor dados hierárquicos (`useSprintDetailData.ts`)
- Construir um mapa `id → work item` para lookup de parent
- Separar itens em dois grupos:
  - **Visão Gerencial**: Epics, Features, User Stories — organizados em árvore (Epic → Feature → US)
  - **Work Items**: Tasks, Bugs, Issues, Speed — cada um com referência ao parent (US ou Issue)
- Retornar ambos os grupos no resultado

### 4. UI: Painel de Visão Gerencial (`Sprints.tsx`)
Novo card antes da tabela de work items exibindo a hierarquia:
- **Épicos** como cabeçalhos colapsáveis
- **Features** aninhadas sob o Épico
- **User Stories** aninhadas sob a Feature
- Cada item com badge de tipo, estado e título
- Itens órfãos (sem parent na sprint) aparecem no nível raiz

### 5. UI: Tabela de Work Items atualizada (`Sprints.tsx`)
- Filtrar para mostrar apenas Task, Bug, Issue, Speed
- Nova coluna "US/Parent" que mostra o título da User Story (ou Issue) pai
- Manter filtros e busca existentes

## Arquivos alterados
- **Migração SQL** — `ALTER TABLE work_items ADD COLUMN parent_id integer`
- **`supabase/functions/azure-sync/index.ts`** — extrair parent_id das relations e salvar
- **`src/hooks/useSprintDetailData.ts`** — construir hierarquia e separar grupos
- **`src/pages/Sprints.tsx`** — novo painel de visão gerencial + coluna parent na tabela

## Observação
Após aprovar e implementar, será necessário re-sincronizar os dados (botão "Carregar Histórico 2026") para que o `parent_id` seja preenchido nos work items existentes.

