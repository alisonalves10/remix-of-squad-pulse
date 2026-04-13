

# Navegação de Sprints com histórico por Squad

## Situação atual
- A página `/sprints` recebe um `id` opcional via URL e mostra um único seletor que mistura todas as squads e sprints
- Ao acessar sem ID, mostra a primeira sprint da lista (ordenada por data desc)
- O botão "Sincronizar" sempre aparece habilitado
- Só existem 8 sprints no banco (1 por squad), mas conforme novas sprints forem criadas pela sincronização, o histórico se acumulará

## Mudanças planejadas

### 1. Reestruturar navegação com dois seletores (Sprints.tsx)
- **Seletor de Squad**: lista todas as squads. Default = "Backoffice"
- **Seletor de Sprint**: filtra sprints da squad selecionada, ordenadas por data desc. Default = sprint mais recente (vigente)
- Ao trocar de squad, selecionar automaticamente a sprint vigente (não fechada) ou a mais recente
- Ao trocar de sprint, atualizar a visualização sem mudar de squad

### 2. Botão Sincronizar condicional
- Mostrar o botão "Sincronizar" apenas quando a sprint selecionada **não está fechada** (`is_closed !== true` e `end_date >= hoje`)
- Para sprints passadas/fechadas, ocultar ou desabilitar o botão

### 3. Atualizar hook useSprintDetailData
- Aceitar `sprintId` como parâmetro (já aceita) — manter como está
- Retornar também a lista de squads e sprints agrupadas para os seletores

### 4. Gerenciar estado via URL
- Manter a rota `/sprints/:id` para deep linking
- Ao acessar `/sprints` sem ID, resolver para sprint vigente de Backoffice

## Arquivos alterados
- `src/pages/Sprints.tsx` — substituir o seletor único por dois seletores (squad + sprint), lógica de default para Backoffice, condicional no botão sincronizar
- `src/hooks/useSprintDetailData.ts` — ajustar para retornar squads e sprints agrupadas por squad nos dados de retorno

## Detalhes técnicos

No hook, adicionar query de squads e agrupar `allSprints` por `squad_id`:
```typescript
// Retornar squads e sprints agrupadas
squads: squadsData,
sprintsBySquad: sprints grouped by squad_id
```

Na página, gerenciar dois estados: `selectedSquadId` e o sprint ID via URL:
```typescript
const [selectedSquadId, setSelectedSquadId] = useState<string | null>(null);
// Ao carregar dados, se não há squad selecionada, usar Backoffice
// Ao trocar squad, navegar para sprint vigente dessa squad
```

Botão sincronizar:
```typescript
const isSprintActive = !sprint.is_closed && sprint.end_date >= todayStr;
// Renderizar botão apenas se isSprintActive
```

