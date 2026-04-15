import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KPICard } from "@/components/dashboard/KPICard";
import { BurndownChart } from "@/components/dashboard/BurndownChart";
import { ExportButtons } from "@/components/dashboard/ExportButtons";
import { Link } from "react-router-dom";
import { ArrowRight, TrendingUp, Target, Package, Bug, Loader2 } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useSquads, useSprintsBySquad, useMetricsBySquad, useWorkItemsBySquad } from "@/hooks/useSquadsData";
import { getCurrentSprint, isSprintActive, isSprintFuture } from "@/lib/sprint-utils";
import { useExport } from "@/hooks/useExport";
import { format, eachDayOfInterval, parseISO } from "date-fns";
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--destructive))",
  "hsl(38, 92%, 50%)",
  "hsl(142, 71%, 45%)",
  "hsl(270, 60%, 55%)",
  "hsl(200, 70%, 50%)",
];

const Squads = () => {
  const { exportToPDF, exportToExcel } = useExport();
  const { data: squads, isLoading: squadsLoading } = useSquads();
  const [selectedSquadId, setSelectedSquadId] = useState<string>("");

  const activeSquadId = selectedSquadId || squads?.[0]?.id || "";
  const squad = squads?.find(s => s.id === activeSquadId);

  const { data: sprints, isLoading: sprintsLoading } = useSprintsBySquad(activeSquadId);
  const { data: metrics } = useMetricsBySquad(activeSquadId);
  const { data: workItems } = useWorkItemsBySquad(activeSquadId);

  const currentSprint = useMemo(() => {
    if (!sprints) return undefined;
    return getCurrentSprint(sprints) || sprints[0];
  }, [sprints]);

  // Fetch burndown data for current sprint
  const { data: progressDaily } = useQuery({
    queryKey: ["sprint_progress_daily", currentSprint?.id],
    queryFn: async () => {
      if (!currentSprint) return [];
      const { data, error } = await supabase
        .from("sprint_progress_daily")
        .select("*")
        .eq("sprint_id", currentSprint.id)
        .order("date");
      if (error) throw error;
      return data;
    },
    enabled: !!currentSprint?.id,
  });

  const burndownData = useMemo(() => {
    if (!currentSprint || !progressDaily || progressDaily.length === 0) return [];
    const start = parseISO(currentSprint.start_date);
    const end = parseISO(currentSprint.end_date);
    const days = eachDayOfInterval({ start, end });
    const totalScope = progressDaily[0]?.total_scope_points || progressDaily[0]?.remaining_points || 0;
    const idealDecrement = days.length > 1 ? Number(totalScope) / (days.length - 1) : 0;

    return days.map((day, i) => {
      const dateStr = format(day, "yyyy-MM-dd");
      const snapshot = progressDaily.find(p => p.date === dateStr);
      return {
        date: format(day, "dd/MM"),
        remaining: snapshot ? Number(snapshot.remaining_points) : null,
        ideal: Math.max(0, Number(totalScope) - idealDecrement * i),
      };
    });
  }, [currentSprint, progressDaily]);

  const nonFutureSprints = useMemo(() => {
    if (!sprints) return [];
    return sprints.filter(sp => !isSprintFuture(sp));
  }, [sprints]);

  const [selectedWorkItemsSprintId, setSelectedWorkItemsSprintId] = useState<string>("");

  // Reset selected sprint when squad changes
  useEffect(() => {
    setSelectedWorkItemsSprintId(currentSprint?.id || "");
  }, [currentSprint?.id]);

  const activeWorkItemsSprintId = selectedWorkItemsSprintId || currentSprint?.id || "";
  const activeWorkItemsSprint = sprints?.find(s => s.id === activeWorkItemsSprintId);

  // Filter work items to current sprint for KPIs/charts
  const currentWorkItems = useMemo(() => {
    if (!workItems || !currentSprint) return [];
    return workItems.filter(wi => wi.sprint_id === currentSprint.id);
  }, [workItems, currentSprint]);

  // Filter work items to selected sprint for table
  const excludedTypes = ["Epic", "Feature"];
  const tableWorkItems = useMemo(() => {
    if (!workItems || !activeWorkItemsSprintId) return [];
    return workItems.filter(wi => wi.sprint_id === activeWorkItemsSprintId && !excludedTypes.includes(wi.type));
  }, [workItems, activeWorkItemsSprintId]);

  // Compute KPIs from current sprint work items
  const kpis = useMemo(() => {
    if (!currentWorkItems.length || !metrics || !sprints) return null;

    const completedStates = ["Done", "Closed"];
    const totalItems = currentWorkItems.length;
    const completedItems = currentWorkItems.filter(wi => completedStates.includes(wi.state)).length;
    const totalPoints = currentWorkItems.reduce((sum, wi) => sum + (wi.story_points || 0), 0);
    const completedPoints = currentWorkItems
      .filter(wi => completedStates.includes(wi.state))
      .reduce((sum, wi) => sum + (wi.story_points || 0), 0);
    const bugs = currentWorkItems.filter(wi => wi.type === "Bug").length;
    const bugsResolved = currentWorkItems.filter(wi => wi.type === "Bug" && completedStates.includes(wi.state)).length;

    // Exclude "Closed" for distribution charts
    const chartItems = currentWorkItems.filter(wi => wi.state !== "Closed");

    const byType: Record<string, number> = {};
    chartItems.forEach(wi => { byType[wi.type] = (byType[wi.type] || 0) + 1; });

    const byState: Record<string, number> = {};
    chartItems.forEach(wi => { byState[wi.state] = (byState[wi.state] || 0) + 1; });

    const commitment = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    return { totalItems, completedItems, totalPoints, completedPoints, bugs, bugsResolved, commitment, byType, byState };
  }, [currentWorkItems, metrics, sprints]);

  const byTypeData = useMemo(() =>
    kpis ? Object.entries(kpis.byType).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value) : [],
  [kpis]);

  const byStateData = useMemo(() =>
    kpis ? Object.entries(kpis.byState).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value) : [],
  [kpis]);

  const exportConfig = {
    title: `Relatório da Squad - ${squad?.name || ""}`,
    subtitle: "Dados sincronizados do Azure DevOps",
    filename: `squad-${(squad?.name || "").toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}`,
    columns: [
      { header: "Sprint", key: "name" },
      { header: "Início", key: "start_date" },
      { header: "Fim", key: "end_date" },
      { header: "Itens Planejados", key: "items_planned" },
      { header: "Itens Concluídos", key: "items_completed" },
      { header: "Status", key: "status" },
    ],
    data: (sprints || []).filter(sp => !isSprintFuture(sp)).map(sp => {
      const m = metrics?.find(me => me.sprint_id === sp.id);
      return {
        name: sp.name,
        start_date: sp.start_date,
        end_date: sp.end_date,
        items_planned: m?.items_planned ?? 0,
        items_completed: m?.items_completed ?? 0,
        status: isSprintActive(sp) ? "Em andamento" : "Fechada",
      };
    }),
  };

  const handleExportPDF = () => exportToPDF(exportConfig);
  const handleExportExcel = () => exportToExcel(exportConfig);

  if (squadsLoading) {
    return (
      <AppLayout title="Dashboard da Squad" description="Carregando...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!squads || squads.length === 0) {
    return (
      <AppLayout title="Dashboard da Squad" description="Nenhuma squad encontrada">
        <Card className="shadow-card">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Nenhuma squad sincronizada. Vá em Configurações para sincronizar dados do Azure DevOps.</p>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout 
      title="Dashboard da Squad" 
      description="Dados reais sincronizados do Azure DevOps"
      actions={<ExportButtons onExportPDF={handleExportPDF} onExportExcel={handleExportExcel} />}
    >
      <div className="space-y-6">
        {/* Squad Selector */}
        <Card className="shadow-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Selecionar Squad</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={activeSquadId} onValueChange={setSelectedSquadId}>
              <SelectTrigger className="w-full md:w-[300px]">
                <SelectValue placeholder="Selecione uma squad" />
              </SelectTrigger>
              <SelectContent>
                {squads.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Squad Info */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>{squad?.name}</CardTitle>
            <CardDescription>{squad?.description || "Equipe de desenvolvimento"}</CardDescription>
          </CardHeader>
        </Card>

        {/* KPIs */}
        {kpis && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <KPICard title="Work Items" value={`${kpis.completedItems}/${kpis.totalItems}`} subtitle="Concluídos / Total" icon={Package} variant="default" />
            <KPICard title="Cumprimento" value={`${kpis.commitment}%`} subtitle="Itens concluídos vs total" icon={Target} variant={kpis.commitment >= 50 ? "success" : "warning"} />
            <KPICard title="Bugs" value={`${kpis.bugsResolved}/${kpis.bugs}`} subtitle="Resolvidos / Total" icon={Bug} variant={kpis.bugs === 0 ? "success" : kpis.bugsResolved >= kpis.bugs ? "success" : "warning"} />
            <KPICard title="Story Points" value={kpis.totalPoints > 0 ? `${kpis.completedPoints}/${kpis.totalPoints}` : "N/A"} subtitle={kpis.totalPoints > 0 ? "Concluídos / Total" : "Sem pontos atribuídos"} icon={TrendingUp} variant="default" />
          </div>
        )}

        {/* Pie Charts: Por Tipo & Por Estado */}
        {kpis && (
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-lg">Por Tipo</CardTitle>
                <CardDescription>Distribuição de work items por tipo (excl. Closed)</CardDescription>
              </CardHeader>
              <CardContent>
                {byTypeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <PieChart>
                      <Pie data={byTypeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} label={({ value }) => value}>
                        {byTypeData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Sem dados</p>
                )}
              </CardContent>
            </Card>
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-lg">Por Estado</CardTitle>
                <CardDescription>Distribuição de work items por estado (excl. Closed)</CardDescription>
              </CardHeader>
              <CardContent>
                {byStateData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <PieChart>
                      <Pie data={byStateData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} label={({ value }) => value}>
                        {byStateData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Sem dados</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Sprints Table */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Sprints</CardTitle>
            <CardDescription>Sprints da equipe {squad?.name}</CardDescription>
          </CardHeader>
          <CardContent>
            {sprintsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !sprints || sprints.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhuma sprint encontrada.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sprint</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead className="text-right">Itens Planejados</TableHead>
                    <TableHead className="text-right">Itens Concluídos</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sprints.filter(sp => !isSprintFuture(sp)).map((sprint) => {
                    const m = metrics?.find(me => me.sprint_id === sprint.id);
                    return (
                      <TableRow key={sprint.id} className="group">
                        <TableCell className="font-medium">{sprint.name}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(sprint.start_date), "dd/MM/yyyy")} - {format(new Date(sprint.end_date), "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell className="text-right font-mono">{m?.items_planned ?? "-"}</TableCell>
                        <TableCell className="text-right font-mono">{m?.items_completed ?? "-"}</TableCell>
                        <TableCell className="text-center">
                          {isSprintActive(sprint) ? (
                            <Badge className="bg-primary/10 text-primary border-primary/20">Em andamento</Badge>
                          ) : (
                            <Badge variant="secondary">Fechada</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" asChild className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <Link to={`/sprints/${sprint.id}`}>
                              Detalhes <ArrowRight className="ml-1 h-3 w-3" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Work Items Table — With Sprint Filter */}
        <Card className="shadow-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Work Items — {activeWorkItemsSprint?.name || "Sprint"}</CardTitle>
                <CardDescription>{tableWorkItems.length} itens na sprint selecionada</CardDescription>
              </div>
              <Select value={activeWorkItemsSprintId} onValueChange={setSelectedWorkItemsSprintId}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Selecionar sprint" />
                </SelectTrigger>
                <SelectContent>
                  {nonFutureSprints.map((sp) => (
                    <SelectItem key={sp.id} value={sp.id}>
                      {sp.name} {isSprintActive(sp) ? "(atual)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {tableWorkItems.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhum work item nesta sprint.</p>
            ) : (
              <div className="max-h-[500px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Título</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tableWorkItems.map((wi) => (
                      <TableRow key={wi.id}>
                        <TableCell className="font-mono text-sm text-muted-foreground">{wi.id}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            wi.type === "Bug" ? "border-destructive/50 text-destructive" :
                            wi.type === "User Story" ? "border-primary/50 text-primary" :
                            wi.type === "Epic" ? "border-accent-foreground/50" : ""
                          }>
                            {wi.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[400px] truncate">{wi.title}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={
                            ["Done", "Closed"].includes(wi.state) ? "bg-success/10 text-success" :
                            ["Active", "Desenvolvimento", "Execução"].includes(wi.state) ? "bg-primary/10 text-primary" :
                            ["Bloqueado"].includes(wi.state) ? "bg-destructive/10 text-destructive" : ""
                          }>
                            {wi.state}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Squads;
