// Mock data for development and demonstration purposes

export const mockSquads = [
  { id: "1", name: "Squad Alpha", velocity: 42, commitment: 89, spillover: 8, trend: "up" as const },
  { id: "2", name: "Squad Beta", velocity: 38, commitment: 76, spillover: 18, trend: "down" as const },
  { id: "3", name: "Squad Gamma", velocity: 51, commitment: 92, spillover: 5, trend: "up" as const },
  { id: "4", name: "Squad Delta", velocity: 35, commitment: 68, spillover: 28, trend: "stable" as const },
  { id: "5", name: "Squad Epsilon", velocity: 44, commitment: 85, spillover: 12, trend: "up" as const },
];

export const mockVelocityBySquad = [
  { name: "Alpha", velocity: 42 },
  { name: "Beta", velocity: 38 },
  { name: "Gamma", velocity: 51 },
  { name: "Delta", velocity: 35 },
  { name: "Epsilon", velocity: 44 },
];

export const mockVelocityTrend = [
  { name: "Sprint 1", velocity: 35, commitment: 40 },
  { name: "Sprint 2", velocity: 38, commitment: 42 },
  { name: "Sprint 3", velocity: 41, commitment: 45 },
  { name: "Sprint 4", velocity: 39, commitment: 43 },
  { name: "Sprint 5", velocity: 44, commitment: 48 },
  { name: "Sprint 6", velocity: 42, commitment: 46 },
];

export const mockBurndownData = [
  { date: "Dia 1", remaining: 50, ideal: 50 },
  { date: "Dia 2", remaining: 48, ideal: 45 },
  { date: "Dia 3", remaining: 42, ideal: 40 },
  { date: "Dia 4", remaining: 38, ideal: 35 },
  { date: "Dia 5", remaining: 35, ideal: 30 },
  { date: "Dia 6", remaining: 28, ideal: 25 },
  { date: "Dia 7", remaining: 22, ideal: 20 },
  { date: "Dia 8", remaining: 18, ideal: 15 },
  { date: "Dia 9", remaining: 12, ideal: 10 },
  { date: "Dia 10", remaining: 5, ideal: 5 },
];

export const mockBurnupData = [
  { date: "Dia 1", completed: 0, scope: 50 },
  { date: "Dia 2", completed: 5, scope: 50 },
  { date: "Dia 3", completed: 12, scope: 52 },
  { date: "Dia 4", completed: 18, scope: 52 },
  { date: "Dia 5", completed: 25, scope: 52 },
  { date: "Dia 6", completed: 32, scope: 52 },
  { date: "Dia 7", completed: 38, scope: 55 },
  { date: "Dia 8", completed: 42, scope: 55 },
  { date: "Dia 9", completed: 48, scope: 55 },
  { date: "Dia 10", completed: 52, scope: 55 },
];

export const mockSprints = [
  { 
    id: "sp1", 
    name: "Sprint 24", 
    squadId: "1",
    squadName: "Squad Alpha",
    startDate: "2024-11-18", 
    endDate: "2024-12-01", 
    plannedPoints: 50, 
    completedPoints: 45,
    commitment: 90,
    spillover: 8,
    isClosed: true
  },
  { 
    id: "sp2", 
    name: "Sprint 25", 
    squadId: "1",
    squadName: "Squad Alpha",
    startDate: "2024-12-02", 
    endDate: "2024-12-15", 
    plannedPoints: 48, 
    completedPoints: 42,
    commitment: 87,
    spillover: 10,
    isClosed: true
  },
  { 
    id: "sp3", 
    name: "Sprint 26", 
    squadId: "1",
    squadName: "Squad Alpha",
    startDate: "2024-12-16", 
    endDate: "2024-12-29", 
    plannedPoints: 52, 
    completedPoints: 28,
    commitment: 54,
    spillover: 0,
    isClosed: false
  },
];

export const mockWorkItems = [
  { id: 1001, type: "User Story", title: "Implementar login com SSO", state: "Done", assignee: "João Silva", points: 8, createdAt: "2024-12-02", completedAt: "2024-12-05" },
  { id: 1002, type: "User Story", title: "Dashboard de métricas", state: "Done", assignee: "Maria Santos", points: 13, createdAt: "2024-12-02", completedAt: "2024-12-08" },
  { id: 1003, type: "Bug", title: "Correção de cache em produção", state: "Done", assignee: "Pedro Oliveira", points: 3, createdAt: "2024-12-04", completedAt: "2024-12-05" },
  { id: 1004, type: "User Story", title: "API de relatórios", state: "In Progress", assignee: "Ana Costa", points: 8, createdAt: "2024-12-02", completedAt: null },
  { id: 1005, type: "Task", title: "Configurar CI/CD", state: "Done", assignee: "Carlos Lima", points: 5, createdAt: "2024-12-03", completedAt: "2024-12-06" },
  { id: 1006, type: "Bug", title: "Memory leak no componente", state: "To Do", assignee: "João Silva", points: 5, createdAt: "2024-12-10", completedAt: null },
  { id: 1007, type: "User Story", title: "Filtros avançados de busca", state: "In Progress", assignee: "Maria Santos", points: 8, createdAt: "2024-12-05", completedAt: null },
];

export const mockProfessionals = [
  { id: "u1", name: "João Silva", role: "Senior Developer", squad: "Squad Alpha", completedPoints: 156, completedItems: 24, bugsResolved: 8 },
  { id: "u2", name: "Maria Santos", role: "Tech Lead", squad: "Squad Alpha", completedPoints: 189, completedItems: 28, bugsResolved: 5 },
  { id: "u3", name: "Pedro Oliveira", role: "Developer", squad: "Squad Beta", completedPoints: 124, completedItems: 21, bugsResolved: 12 },
  { id: "u4", name: "Ana Costa", role: "Senior Developer", squad: "Squad Gamma", completedPoints: 145, completedItems: 22, bugsResolved: 6 },
  { id: "u5", name: "Carlos Lima", role: "DevOps", squad: "Squad Delta", completedPoints: 98, completedItems: 18, bugsResolved: 3 },
];

export const mockProfessionalTrend = [
  { name: "Sprint 21", points: 21, items: 4 },
  { name: "Sprint 22", points: 26, items: 5 },
  { name: "Sprint 23", points: 18, items: 3 },
  { name: "Sprint 24", points: 32, items: 6 },
  { name: "Sprint 25", points: 28, items: 5 },
  { name: "Sprint 26", points: 31, items: 6 },
];
