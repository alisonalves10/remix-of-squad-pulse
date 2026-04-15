

# Profissionais: só nome no select + edição de atribuição

## Mudanças

### 1. Select de profissional — mostrar só o nome
**Arquivo:** `src/pages/Professionals.tsx` (linha 177)
- Remover `{u.role ? \`- ${u.role}\` : ""}` do `SelectItem`, exibindo apenas `{u.name}`

### 2. Card do profissional — adicionar edição de atribuição (role)
**Arquivo:** `src/pages/Professionals.tsx` (linhas 222-237)
- No card de info do profissional (abaixo dos filtros), adicionar um campo editável para a atribuição/cargo
- Implementar como um input inline ou um select com opções comuns (ex: Desenvolvedor, QA, Tech Lead, Product Owner, Designer, Scrum Master) + opção de texto livre
- Ao alterar, fazer `UPDATE` na tabela `users` no campo `role` via Supabase
- Mostrar toast de confirmação ao salvar

### Detalhes técnicos
- Usar um `Select` do shadcn com opções pré-definidas de cargos + opção "Outro" com input de texto
- Chamar `supabase.from("users").update({ role }).eq("id", userId)` ao confirmar
- Invalidar a query `["users"]` após salvar para atualizar o select e o card
- Importar `useQueryClient` do TanStack para invalidação

## Arquivos alterados
- `src/pages/Professionals.tsx` — remover role do select, adicionar edição de atribuição no card

