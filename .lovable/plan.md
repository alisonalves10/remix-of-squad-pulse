
# Adicionar colunas de horas estimada, restante e concluída

## Contexto
Na página **Profissionais**, a tabela "Histórico de Itens" hoje exibe apenas uma coluna **Horas** (que mostra `completed_work`). O usuário precisa ver as três métricas de horas separadamente para cada item.

## Mudanças

### 1. Hook `useWorkItemsByUser` (`src/hooks/useProfessionalsData.ts`)
Adicionar `original_estimate` e `remaining_work` ao `select` da query (hoje só busca `completed_work`). Atualizar a interface `ProfessionalWorkItem` com esses dois campos numéricos.

### 2. Tabela "Histórico de Itens" (`src/pages/Professionals.tsx`)
Substituir a coluna única **Horas** por três colunas alinhadas à direita:

| Coluna | Campo | Observação |
|---|---|---|
| Estimada | `original_estimate` | Estimativa inicial |
| Restante | `remaining_work` | Trabalho ainda pendente |
| Concluída | `completed_work` | Já realizado (valor atual) |

Valores nulos exibidos como `0`. Formatação numérica consistente com a coluna atual.

### 3. Exportações PDF/Excel
Atualizar `exportConfig.columns` para incluir as três novas colunas no lugar da coluna "Horas" única, mantendo a ordem da tabela.

## Não muda
- KPIs continuam usando `completed_work` (sem alteração de fórmulas).
- Gráficos "Horas por Sprint" continuam baseados em `completed_work`.
- Filtros (profissional, squad, sprint) inalterados.
