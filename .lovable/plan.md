

# Gráfico "Itens por Sprint" com Planejado vs Concluído

## Objetivo
Transformar o gráfico de barras simples "Itens por Sprint" em um gráfico com duas barras por sprint: **Planejado** (total de itens atribuídos) e **Concluído** (itens com estado Done/Closed), mostrando a performance real do profissional.

## Mudanças

### `src/pages/Professionals.tsx`
- Alterar o `itemsBySprintData` para calcular dois valores por sprint:
  - `planned`: contagem total de itens na sprint
  - `completed`: contagem de itens com estado "Done" ou "Closed"
- Substituir o `VelocityChart` do "Itens por Sprint" por um gráfico customizado com duas barras (Recharts `BarChart` com dois `Bar`: um azul para Planejado, um verde para Concluído) e uma `Legend`

### `src/components/dashboard/VelocityChart.tsx`
- Não será alterado — o gráfico de "Horas por Sprint" continua usando o componente existente
- O novo gráfico de "Itens por Sprint" será implementado inline na página Professionals (ou como um novo componente) com suporte a duas séries de dados

## Visual
- Barra azul (primary) = Planejado
- Barra verde (success) = Concluído
- Legenda embaixo do gráfico

## Arquivos alterados
- `src/pages/Professionals.tsx` — novo cálculo de dados e gráfico de barras duplas

