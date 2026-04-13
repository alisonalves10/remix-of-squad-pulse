
Objetivo: corrigir o deslocamento de 1 dia nos gráficos de burndown e burnup de todas as squads, para que a linha do tempo mostre exatamente 30/03 a 10/04, e não 29/03 a 09/04.

Diagnóstico confirmado:
- Os dados no banco estão corretos para a sprint da E-commerce: `2026-03-30` até `2026-04-10`.
- O erro está no frontend, na montagem das datas do gráfico em `src/hooks/useSprintDetailData.ts`.
- Hoje o código usa `new Date(sprint.start_date)`, `new Date(sprint.end_date)` e depois combina isso com:
  - `toLocaleDateString("pt-BR", ...)`
  - `toISOString().split("T")[0]`
- Esse padrão causa deslocamento por fuso/parse de data sem timezone explícito. Resultado: o eixo e o lookup diário ficam 1 dia antes em alguns ambientes.

Implementação proposta:
1. Criar um parser de data sem timezone
- Adicionar uma função utilitária local para converter `YYYY-MM-DD` em `Date` de forma segura, usando construção explícita da data, sem `new Date(string)`.
- A função deve gerar a data no calendário correto, sem sofrer ajuste de timezone.

2. Refatorar a geração da timeline
- Substituir:
  - `const start = new Date(sprint.start_date)`
  - `const end = new Date(sprint.end_date)`
- Passar a usar o parser seguro para `start` e `end`.

3. Corrigir a chave usada para buscar no `dailyMap`
- Hoje a chave é montada com `d.toISOString().split("T")[0]`, que também pode mudar o dia.
- Trocar por um formatador local estável para `YYYY-MM-DD`, baseado no mesmo parser/formatter seguro.

4. Manter o range oficial da sprint
- Preservar a lógica já corrigida que limita o gráfico ao `end_date`.
- Garantir que o loop continue gerando exatamente os dias da sprint, inclusive o último dia.

5. Validar em todas as squads
- Conferir que os gráficos passam a renderizar:
  - início em `30/03`
  - fim em `10/04`
- Validar especialmente squads com:
  - histórico completo
  - apenas 1 snapshot
  - sprint encerrada

Arquivos envolvidos:
- `src/hooks/useSprintDetailData.ts`
- opcionalmente um utilitário compartilhado em `src/lib/` se eu preferir reaproveitar o parser

Resultado esperado:
- Todos os gráficos de burndown e burnup passam a respeitar exatamente as datas oficiais da sprint.
- O eixo X e os pontos reais deixam de aparecer 1 dia antes.
- A correção vale para todas as squads, não só E-commerce.

Detalhe técnico:
- Não precisa alterar banco, sincronização nem backend.
- O problema é de parsing/serialização de datas no cliente.
- A causa mais provável é a combinação de `new Date("YYYY-MM-DD")` com `toISOString()` e timezone do navegador.
