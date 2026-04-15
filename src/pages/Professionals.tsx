import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { KPICard } from "@/components/dashboard/KPICard";
import { VelocityChart } from "@/components/dashboard/VelocityChart";
import { ExportButtons } from "@/components/dashboard/ExportButtons";
import { TrendingUp, CheckCircle, Bug, Clock, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useState, useMemo, useEffect } from "react";
import { useUsers, useNonFutureSprints, useWorkItemsByUser } from "@/hooks/useProfessionalsData";
import { useSquads } from "@/hooks/useSquadsData";
import { useExport } from "@/hooks/useExport";

const Professionals = () => {
  const { exportToPDF, exportToExcel } = useExport();
  const { data: users, isLoading: usersLoading } = useUsers();
  const { data: squads } = useSquads();
  const { data: sprints } = useNonFutureSprints();

  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedSquadFilter, setSelectedSquadFilter] = useState("all");
  const [selectedSprintFilter, setSelectedSprintFilter] = useState("all");

  // Auto-select first user
  useEffect(() => {
    if (users?.length && !selectedUserId) {
      setSelectedUserId(users[0].id);
    }
  }, [users, selectedUserId]);

  const selectedUser = users?.find(u => u.id === selectedUserId);

  const { data: rawWorkItems, isLoading: workItemsLoading } = useWorkItemsByUser(selectedUserId);

  // Build sprint lookup
  const sprintMap = useMemo(() => {
    const map = new Map<string, { name: string; start_date: string; squad_id: string }>();
    sprints?.forEach(s => map.set(s.id, { name: s.name, start_date: s.start_date, squad_id: s.squad_id }));
    return map;
  }, [sprints]);

  // Enrich work items with sprint info, filter out items from future sprints
  const allWorkItems = useMemo(() => {
    if (!rawWorkItems) return [];
    return rawWorkItems
      .filter(wi => sprintMap.has(wi.sprint_id))
      .map(wi => ({
        ...wi,
        sprint_name: sprintMap.get(wi.sprint_id)!.name,
        sprint_start_date: sprintMap.get(wi.sprint_id)!.start_date,
        sprint_squad_id: sprintMap.get(wi.sprint_id)!.squad_id,
      }));
  }, [rawWorkItems, sprintMap]);

  // Filter by squad if selected
  const squadFilteredItems = useMemo(() => {
    if (selectedSquadFilter === "all") return allWorkItems;
    return allWorkItems.filter(wi => wi.sprint_squad_id === selectedSquadFilter);
  }, [allWorkItems, selectedSquadFilter]);

  // Sprints available for filter (from this user's items)
  const availableSprints = useMemo(() => {
    const sprintIds = new Set(squadFilteredItems.map(wi => wi.sprint_id));
    return (sprints || []).filter(s => sprintIds.has(s.id));
  }, [squadFilteredItems, sprints]);

  // Table items filtered by sprint
  const tableItems = useMemo(() => {
    if (selectedSprintFilter === "all") return squadFilteredItems;
    return squadFilteredItems.filter(wi => wi.sprint_id === selectedSprintFilter);
  }, [squadFilteredItems, selectedSprintFilter]);

  // KPIs (based on squad-filtered items, all sprints)
  const kpis = useMemo(() => {
    const totalHours = squadFilteredItems.reduce((acc, wi) => acc + (wi.completed_work || 0), 0);
    const completedItems = squadFilteredItems.filter(wi => ["Done", "Closed"].includes(wi.state)).length;
    const bugsResolved = squadFilteredItems.filter(wi => wi.type === "Bug" && ["Done", "Closed"].includes(wi.state)).length;
    const sprintIds = new Set(squadFilteredItems.map(wi => wi.sprint_id));
    const avgHoursPerSprint = sprintIds.size > 0 ? Math.round(totalHours / sprintIds.size) : 0;
    return { totalHours: Math.round(totalHours * 100) / 100, completedItems, bugsResolved, avgHoursPerSprint };
  }, [squadFilteredItems]);

  // Charts data
  const hoursBySprintData = useMemo(() => {
    const map = new Map<string, { name: string; planned: number; completed: number; start_date: string }>();
    squadFilteredItems.forEach(wi => {
      const existing = map.get(wi.sprint_id) || { name: wi.sprint_name, planned: 0, completed: 0, start_date: wi.sprint_start_date };
      existing.planned += wi.completed_work || 0;
      if (["Done", "Closed"].includes(wi.state)) {
        existing.completed += wi.completed_work || 0;
      }
      map.set(wi.sprint_id, existing);
    });
    return Array.from(map.values()).sort((a, b) => a.start_date.localeCompare(b.start_date));
  }, [squadFilteredItems]);

  const itemsBySprintData = useMemo(() => {
    const map = new Map<string, { name: string; planned: number; completed: number; start_date: string }>();
    squadFilteredItems.forEach(wi => {
      const existing = map.get(wi.sprint_id) || { name: wi.sprint_name, planned: 0, completed: 0, start_date: wi.sprint_start_date };
      existing.planned += 1;
      if (["Done", "Closed"].includes(wi.state)) {
        existing.completed += 1;
      }
      map.set(wi.sprint_id, existing);
    });
    return Array.from(map.values()).sort((a, b) => a.start_date.localeCompare(b.start_date));
  }, [squadFilteredItems]);

  const getTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      "User Story": "bg-primary/10 text-primary border-primary/20",
      "Bug": "bg-destructive/10 text-destructive border-destructive/20",
      "Task": "bg-accent text-accent-foreground border-border",
    };
    return <Badge className={styles[type] || styles["Task"]}>{type}</Badge>;
  };

  const getStateBadge = (state: string) => {
    const styles: Record<string, string> = {
      "Done": "bg-success/10 text-success border-success/20",
      "Closed": "bg-success/10 text-success border-success/20",
      "In Progress": "bg-warning/10 text-warning border-warning/20",
      "Active": "bg-warning/10 text-warning border-warning/20",
      "To Do": "bg-muted text-muted-foreground border-border",
      "New": "bg-muted text-muted-foreground border-border",
    };
    return <Badge className={styles[state] || styles["To Do"]}>{state}</Badge>;
  };

  const exportConfig = {
    title: `Relatório do Profissional - ${selectedUser?.name || ""}`,
    subtitle: `${selectedUser?.role || ""} • Histórico`,
    filename: `profissional-${(selectedUser?.name || "").toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}`,
    columns: [
      { header: "Sprint", key: "sprint_name" },
      { header: "ID", key: "id" },
      { header: "Título", key: "title" },
      { header: "Tipo", key: "type" },
      { header: "Horas", key: "completed_work" },
      { header: "Area Path", key: "area_path" },
      { header: "Estado", key: "state" },
    ],
    data: tableItems,
  };

  const handleExportPDF = () => exportToPDF(exportConfig);
  const handleExportExcel = () => exportToExcel(exportConfig);

  const isLoading = usersLoading || workItemsLoading;

  return (
    <AppLayout
      title="Visão por Profissional"
      description="Análise de performance individual"
      actions={<ExportButtons onExportPDF={handleExportPDF} onExportExcel={handleExportExcel} />}
    >
      <div className="space-y-6">
        {/* Filters */}
        <Card className="shadow-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Profissional</label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um profissional" />
                  </SelectTrigger>
                  <SelectContent>
                    {(users || []).map(u => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} {u.role ? `- ${u.role}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full md:w-[250px]">
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Squad (opcional)</label>
                <Select value={selectedSquadFilter} onValueChange={setSelectedSquadFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as squads" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as squads</SelectItem>
                    {(squads || []).map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full md:w-[250px]">
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Sprint</label>
                <Select value={selectedSprintFilter} onValueChange={setSelectedSprintFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as sprints" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as sprints</SelectItem>
                    {availableSprints.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Professional Info */}
            {selectedUser && (
              <Card className="shadow-card border-l-4 border-l-primary">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-semibold">{selectedUser.name}</h2>
                      <p className="text-muted-foreground">{selectedUser.role || "Sem cargo definido"}</p>
                    </div>
                    {selectedUser.squad_id && squads && (
                      <Badge variant="outline" className="w-fit">
                        {squads.find(s => s.id === selectedUser.squad_id)?.name || ""}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* KPIs */}
            <div className="grid gap-4 md:grid-cols-4">
              <KPICard title="Horas Lançadas" value={kpis.totalHours} subtitle="Total no período" icon={TrendingUp} variant="default" />
              <KPICard title="Itens Concluídos" value={kpis.completedItems} subtitle="Total de itens" icon={CheckCircle} variant="success" />
              <KPICard title="Bugs Resolvidos" value={kpis.bugsResolved} subtitle="Total corrigidos" icon={Bug} variant="warning" />
              <KPICard title="Horas por Sprint" value={kpis.avgHoursPerSprint} subtitle="Média por sprint" icon={Clock} variant="default" />
            </div>

            {/* Charts */}
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="text-lg">Horas por Sprint</CardTitle>
                  <CardDescription>Planejado vs Concluído em horas</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={hoursBySprintData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                      <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                      <Legend />
                      <Bar dataKey="planned" name="Planejado" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="completed" name="Concluído" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="text-lg">Itens por Sprint</CardTitle>
                  <CardDescription>Planejado vs Concluído por sprint</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={itemsBySprintData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                      <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                      <Legend />
                      <Bar dataKey="planned" name="Planejado" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="completed" name="Concluído" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Work Items Table */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-lg">Histórico de Itens</CardTitle>
                <CardDescription>
                  {selectedSprintFilter === "all"
                    ? `Todos os itens atribuídos a ${selectedUser?.name || ""}`
                    : `Itens de ${availableSprints.find(s => s.id === selectedSprintFilter)?.name || ""}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sprint</TableHead>
                      <TableHead>ID</TableHead>
                      <TableHead>Título</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Horas</TableHead>
                      <TableHead>Area Path</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tableItems.length > 0 ? (
                      tableItems.map(item => (
                        <TableRow key={item.pk}>
                          <TableCell className="text-muted-foreground">{item.sprint_name}</TableCell>
                          <TableCell className="font-mono text-sm">{item.id}</TableCell>
                          <TableCell className="max-w-[300px] truncate">{item.title}</TableCell>
                          <TableCell>{getTypeBadge(item.type)}</TableCell>
                          <TableCell className="text-right font-mono">{item.completed_work ?? 0}</TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{item.area_path || "—"}</TableCell>
                          <TableCell>{getStateBadge(item.state)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          Nenhum item encontrado para este profissional
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default Professionals;
