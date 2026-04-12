
Diagnóstico confirmado: o problema não é só visual.

- A sprint da E-commerce vai de 30/03 até 10/04.
- O dado real existente em `sprint_progress_daily` está em `2026-04-12` com `remaining=73.5`, `completed=258.75` e `scope=270.5`.
- O hook atual monta o gráfico só entre `start_date` e `end_date`, então esse ponto fica fora do eixo e é descartado.
- Além disso, a lógica atual preenche dias sem snapshot com valores artificiais, o que mascara o comportamento real.

Plano de correção:

1. Ajustar a transformação dos dados no frontend
- Arquivo: `src/hooks/useSprintDetailData.ts`
- Fazer a timeline do gráfico ir até a maior data entre `sprint.end_date` e a última data real de `sprint_progress_daily`.
- Parar de inventar série “real” antes do primeiro snapshot: usar `null` para `remaining`, `completed` e `scope` até existir dado real.
- Manter a linha ideal baseada no período oficial da sprint.
- Resultado esperado: o ponto de `73.5h` passa a aparecer no burndown mesmo estando hoje fora do intervalo oficial.

2. Melhorar a visualização para casos com poucos pontos
- Arquivo: `src/components/dashboard/BurnupChart.tsx`
- Adicionar marcador visível (`dot` / `activeDot`) para a série real do burnup, porque com apenas 1 snapshot o gráfico de área pode parecer vazio.
- Se necessário, aplicar o mesmo cuidado no traço de escopo para não parecer “sumido” quando houver poucos registros.

3. Corrigir a geração da data no sync
- Arquivo: `supabase/functions/azure-sync/index.ts`
- Quando a sincronização rodar após o fim da sprint, gravar o snapshot em `min(data_atual, end_date_da_sprint)` em vez de sempre usar `today`.
- Isso evita continuar criando pontos fora da janela da sprint e impede que o gráfico volte a quebrar depois.

4. Corrigir os dados já gravados
- Fazer uma correção pontual no banco para mover registros de `sprint_progress_daily` que estejam depois de `sprints.end_date` para a data final da sprint correspondente.
- Assim a sprint da E-commerce já fica correta imediatamente, sem depender de uma nova sincronização futura.

5. Validação
- Reabrir `/sprints/59d860f0-412a-4f42-a9a5-60a0741ff927` e confirmar:
  - Burndown mostrando `73.5h` restantes
  - Burnup mostrando `258.75h` concluídas e `270.5h` de escopo
- Testar também uma sprint ainda em andamento para garantir que o ajuste não quebrou o comportamento normal.

Detalhe técnico
- Não precisa mudar schema nem RLS.
- A correção envolve 2 arquivos de frontend + 1 ajuste na função de sincronização + 1 correção de dados já existentes.
