

# Roadmap Executivo — Visão para Diretoria/Presidência

## Contexto
Criar um módulo novo de **Roadmap** com visão estratégica para executivos, incluindo unidades de negócio, squads, investimentos e visões de mercado comuns em ferramentas como Jira Align, Azure DevOps Plans, Productboard e Aha!.

## Novas tabelas no banco

### `business_units` — Unidades de Negócio
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid PK | |
| name | text | Nome da unidade (ex: "Varejo", "Corporate") |
| description | text | Descrição opcional |
| created_at | timestamptz | |

### `squad_business_unit` — Associação Squad ↔ Unidade
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid PK | |
| squad_id | uuid | Ref squad |
| business_unit_id | uuid | Ref unidade |

### `roadmap_items` — Itens do Roadmap
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid PK | |
| title | text | Nome da iniciativa |
| description | text | Detalhamento |
| business_unit_id | uuid | Unidade de negócio |
| squad_id | uuid | Squad responsável (opcional) |
| status | text | "planned", "in_progress", "done", "cancelled" |
| priority | text | "critical", "high", "medium", "low" |
| start_date | date | Início previsto |
| end_date | date | Fim previsto |
| invested_hours | numeric | Horas investidas (pode ser calculado) |
| estimated_cost | numeric | Custo estimado (R$) |
| category | text | "feature", "tech_debt", "infrastructure", "compliance" |
| created_at | timestamptz | |

RLS: leitura para autenticados, escrita para admins.

## Nova página: `/roadmap`

### Visões planejadas (inspiradas no mercado)

1. **Timeline / Gantt View** — Visão temporal das iniciativas por trimestre, com barras coloridas por status. Padrão de mercado (Aha!, Productboard, Jira Align).

2. **Visão por Unidade de Negócio** — Cards agrupados por BU mostrando: quantidade de iniciativas, horas investidas, custo total, % concluído. Comum em dashboards executivos (SAFe Portfolio).

3. **Visão por Squad** — Quais squads estão alocados em quais iniciativas, carga de trabalho e investimento por squad. Referência: Azure DevOps Plans.

4. **Investimento por Categoria** — Gráfico de pizza/donut mostrando distribuição de investimento entre: Features, Dívida Técnica, Infraestrutura, Compliance. Métrica padrão de CTO dashboards.

5. **KPIs Executivos** — Cards no topo:
   - Total investido (R$)
   - Iniciativas em andamento
   - % entregue no prazo
   - Distribuição por prioridade

6. **Tabela de Iniciativas** — Lista com filtros por BU, Squad, Status, Prioridade, Categoria. Com export PDF/Excel.

## Navegação
- Novo item "Roadmap" no sidebar com ícone `Map` (lucide), no grupo "Analytics"
- Posicionado após "Ranking"

## Arquivos a criar/alterar
- **Migration SQL** — tabelas `business_units`, `squad_business_unit`, `roadmap_items` com RLS
- **`src/pages/Roadmap.tsx`** — Página principal com as 6 visões em tabs
- **`src/hooks/useRoadmapData.ts`** — Hook para buscar dados do roadmap
- **`src/components/layout/AppSidebar.tsx`** — Adicionar item "Roadmap"
- **`src/App.tsx`** — Adicionar rota `/roadmap`

## Visões de mercado incorporadas
- **Gantt/Timeline**: padrão em Aha!, Monday.com, Asana — traduz cronograma em barras visuais
- **Portfolio Investment Mix**: prática SAFe — mostra % de investimento por tipo (feature vs tech debt)
- **Capacity Allocation**: mostra carga por squad, evitando over-allocation — comum em Jira Align
- **Business Value Tracking**: KPIs de ROI e delivery rate — referência Productboard

