import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { KPICard } from "@/components/dashboard/KPICard";
import { BurndownChart } from "@/components/dashboard/BurndownChart";
import { BurnupChart } from "@/components/dashboard/BurnupChart";
import { ExportButtons } from "@/components/dashboard/ExportButtons";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, CheckCircle, AlertTriangle, RotateCcw, Clock, Bug, Calendar, Search, RefreshCw, ChevronDown, ChevronRight, Layers, Star, BookOpen } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useSprintDetailData } from "@/hooks/useSprintDetailData";
import { isSprintActive as isSprintActiveFn } from "@/lib/sprint-utils";
import { useExport } from "@/hooks/useExport";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const SprintDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { exportToPDF, exportToExcel } = useExport();
  const queryClient = useQueryClient();
  const [selectedSquadId, setSelectedSquadId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [isGerencialOpen, setIsGerencialOpen] = useState(true);

  const { data, isLoading } = useSprintDetailData(id);

  // Once data loads, set default squad to Backoffice or current sprint's squad
  useEffect(() => {
    if (!data) return;
    if (selectedSquadId) return; // already set
    if (id) {
      // If URL has sprint id, use its squad
      setSelectedSquadId(data.sprint.squad_id);
    } else {
      // Default to Backoffice
      const backoffice = data.squads.find((s) => s.name.toLowerCase() === "backoffice");
      setSelectedSquadId(backoffice?.id || data.squads[0]?.id || null);
    }
  }, [data, id, selectedSquadId]);

  // Sprints for the selected squad
  const squadSprints = useMemo(() => {
    if (!data || !selectedSquadId) return [];
    return data.sprintsBySquad[selectedSquadId] || [];
  }, [data, selectedSquadId]);

  // Handle squad change: navigate to the most recent sprint of that squad
  const handleSquadChange = (squadId: string) => {
    setSelectedSquadId(squadId);
    if (!data) return;
    const sprints = data.sprintsBySquad[squadId] || [];
    if (sprints.length > 0) {
      navigate(`/sprints/${sprints[0].id}`);
    }
  };

  // Check if current sprint is active (for sync button)
  const sprintIsActive = data ? isSprintActiveFn(data.sprint) : false;

  const handleResync = async () => {
    if (!data) return;
    setIsSyncing(true);
    try {
      const { error } = await supabase.functions.invoke("azure-sync", {
        body: { areaPaths: [data.sprint.squadName] },
      });
      if (error) throw error;
      toast.success("Sincronização concluída", {
        description: "Os dados de burndown foram atualizados.",
      });
      await queryClient.invalidateQueries({ queryKey: ["sprintDetail"] });
    } catch (err: any) {
      toast.error("Erro na sincronização", {
        description: err.message || "Tente novamente mais tarde.",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) {
    return (
      <AppLayout title="Sprint" description="Carregando...">
        <div className="space-y-6">
          <Skeleton className="h-24 rounded-xl" />
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </AppLayout>
    );
  }

  if (!data) {
    return (
      <AppLayout title="Sprint" description="Nenhuma sprint encontrada">
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            Nenhuma sprint disponível. Sincronize os dados do Azure DevOps primeiro.
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  const {
    sprint,
    squads,
    sprintsBySquad,
    allSprints,
    workItems,
    hierarchyTree,
    totalItems,
    completedItems,
    spilloverItems,
    bugsCreated,
    bugsResolved,
    plannedHours,
    completedHours,
    commitment,
    completionRate,
    types,
    states,
    burndownData,
    burnupData,
  } = data;

  const filteredItems = workItems
    .filter((item) => {
      const matchesType = typeFilter === "all" || item.type === typeFilter;
      const matchesState = stateFilter === "all" || item.state === stateFilter;
      const matchesSearch =
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.id.toString().includes(searchTerm);
      return matchesType && matchesState && matchesSearch;
    })
    .sort((a, b) => {
      const idA = a.parent_id ?? Number.MAX_SAFE_INTEGER;
      const idB = b.parent_id ?? Number.MAX_SAFE_INTEGER;
      return idA - idB;
    });

  const getTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      "User Story": "bg-primary/10 text-primary border-primary/20",
      "Bug": "bg-destructive/10 text-destructive border-destructive/20",
      "Task": "bg-accent text-accent-foreground border-border",
      "Feature": "bg-primary/10 text-primary border-primary/20",
      "Issue": "bg-warning/10 text-warning border-warning/20",
      "Epic": "bg-secondary text-secondary-foreground border-border",
    };
    return <Badge className={styles[type] || styles["Task"]}>{type}</Badge>;
  };

  const getStateBadge = (state: string) => {
    const doneStates = ["Done", "Closed"];
    const activeStates = ["Active", "In Progress", "Desenvolvimento", "Homologação", "Validação"];
    const blockedStates = ["Bloqueado"];

    if (doneStates.includes(state)) {
      return <Badge className="bg-success/10 text-success border-success/20">{state}</Badge>;
    }
    if (activeStates.includes(state)) {
      return <Badge className="bg-warning/10 text-warning border-warning/20">{state}</Badge>;
    }
    if (blockedStates.includes(state)) {
      return <Badge className="bg-destructive/10 text-destructive border-destructive/20">{state}</Badge>;
    }
    return <Badge className="bg-muted text-muted-foreground border-border">{state}</Badge>;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("pt-BR");
  };

  const exportConfig = {
    title: `Relatório da Sprint - ${sprint.name}`,
    subtitle: `${sprint.squadName} • ${sprint.start_date} - ${sprint.end_date}`,
    filename: `sprint-${sprint.name.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}`,
    columns: [
      { header: "ID", key: "id" },
      { header: "Tipo", key: "type" },
      { header: "Título", key: "title" },
      { header: "Estado", key: "state" },
      { header: "Estimativa (h)", key: "original_estimate" },
      { header: "Restante (h)", key: "remaining_work" },
      { header: "Concluído (h)", key: "completed_work" },
    ],
    data: filteredItems,
  };

  const handleExportPDF = () => exportToPDF(exportConfig);
  const handleExportExcel = () => exportToExcel(exportConfig);

  return (
    <AppLayout
      title={sprint.name}
      description={`${sprint.squadName} • ${sprint.start_date} → ${sprint.end_date}`}
      actions={
        <div className="flex items-center gap-3 flex-wrap">
          <Select
            value={selectedSquadId || ""}
            onValueChange={handleSquadChange}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Selecionar squad" />
            </SelectTrigger>
            <SelectContent>
              {squads.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={sprint.id}
            onValueChange={(val) => navigate(`/sprints/${val}`)}
          >
            <SelectTrigger className="w-[260px]">
              <SelectValue placeholder="Selecionar sprint" />
            </SelectTrigger>
            <SelectContent>
              {squadSprints.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name} {isSprintActiveFn(s) ? "(Em andamento)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {sprintIsActive && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleResync}
              disabled={isSyncing}
            >
              <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
              Sincronizar
            </Button>
          )}
          <ExportButtons onExportPDF={handleExportPDF} onExportExcel={handleExportExcel} />
        </div>
      }
    >
      <div className="space-y-6">
        {/* Sprint Header */}
        <Card className="shadow-card border-l-4 border-l-primary">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">{sprint.name}</h2>
                <p className="text-muted-foreground">{sprint.squadName}</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{sprint.start_date} → {sprint.end_date}</span>
                {isSprintActiveFn(sprint) ? (
                  <Badge className="bg-primary/10 text-primary border-primary/20 ml-2">Em andamento</Badge>
                ) : (
                  <Badge variant="secondary" className="ml-2">Fechada</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sprint KPIs */}
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          <KPICard
            title="Itens Planejados"
            value={totalItems}
            icon={FileText}
            variant="default"
          />
          <KPICard
            title="Itens Concluídos"
            value={completedItems}
            subtitle={`${completionRate}% concluídos`}
            icon={CheckCircle}
            variant="success"
          />
          <KPICard
            title="Spillover"
            value={spilloverItems}
            subtitle="Itens replanejados"
            icon={AlertTriangle}
            variant={spilloverItems <= 2 ? "default" : "danger"}
          />
          <KPICard
            title="Horas Estimadas"
            value={`${plannedHours}h`}
            subtitle="Original Estimate"
            icon={Clock}
            variant="default"
          />
          <KPICard
            title="Horas Concluídas"
            value={`${completedHours}h`}
            subtitle={`${commitment}% do planejado`}
            icon={Clock}
            variant={commitment >= 60 ? "success" : "warning"}
          />
          <KPICard
            title="Bugs"
            value={`${bugsResolved}/${bugsCreated}`}
            subtitle={bugsCreated > 0 ? `${Math.round((bugsResolved / bugsCreated) * 100)}% resolvidos` : "Nenhum bug na sprint"}
            icon={Bug}
            variant={bugsCreated === 0 ? "default" : bugsResolved >= bugsCreated ? "success" : "danger"}
          />
        </div>

        {/* Burndown & Burnup Charts */}
        {burndownData.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2">
            <BurndownChart
              data={burndownData}
              title="Burndown (Horas)"
              description="Remaining Work ao longo da sprint"
            />
            <BurnupChart
              data={burnupData}
              title="Burnup (Horas)"
              description="Completed Work vs Escopo Total"
            />
          </div>
        )}

        {/* Hierarchy Panel - Management View */}
        {hierarchyTree && hierarchyTree.length > 0 && (
          <Collapsible open={isGerencialOpen} onOpenChange={setIsGerencialOpen}>
            <Card className="shadow-card">
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {isGerencialOpen ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                    <Layers className="h-5 w-5 text-primary" />
                    Visão Gerencial — Épicos, Features e User Stories
                  </CardTitle>
                  <CardDescription>
                    Hierarquia de itens sendo trabalhados nesta sprint
                  </CardDescription>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-2">
                  {hierarchyTree.map((node: any) => (
                    <HierarchyNode key={node.item.id} node={node} level={0} getTypeBadge={getTypeBadge} getStateBadge={getStateBadge} />
                  ))}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}

        {/* Work Items Table */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Work Items da Sprint</CardTitle>
            <CardDescription>
              {filteredItems.length} de {workItems.length} itens (Tasks, Bugs, Issues, Speed)
            </CardDescription>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 pt-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por ID ou título..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  {types.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={stateFilter} onValueChange={setStateFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os estados</SelectItem>
                  {states.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                     <TableHead>ID</TableHead>
                     <TableHead>Tipo</TableHead>
                     <TableHead>Título</TableHead>
                     <TableHead>Parent</TableHead>
                     <TableHead>Responsável</TableHead>
                     <TableHead>Estado</TableHead>
                     <TableHead className="text-right">Estimativa (h)</TableHead>
                     <TableHead className="text-right">Restante (h)</TableHead>
                     <TableHead className="text-right">Concluído (h)</TableHead>
                     <TableHead>Concluído em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-sm">{item.id}</TableCell>
                      <TableCell>{getTypeBadge(item.type)}</TableCell>
                       <TableCell className="max-w-[300px]">
                         <div className="flex items-center gap-2">
                           <span className="truncate">{item.title}</span>
                           {item.is_spillover && (
                             <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-orange-400 text-orange-600 dark:text-orange-400 whitespace-nowrap shrink-0">
                               Spillover
                             </Badge>
                           )}
                         </div>
                       </TableCell>
                       <TableCell className="text-sm font-mono text-muted-foreground">
                         {item.parent_id ? `#${item.parent_id}` : "—"}
                        </TableCell>
                       <TableCell className="text-sm">{(item as any).assigned_to_name || "—"}</TableCell>
                       <TableCell>{getStateBadge(item.state)}</TableCell>
                       <TableCell className="text-right font-mono">
                         {Number(item.original_estimate) || "—"}
                       </TableCell>
                      <TableCell className="text-right font-mono">
                        {Number(item.remaining_work) || "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {Number(item.completed_work) || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(item.completed_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                        Nenhum item encontrado com os filtros aplicados.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

/** Recursive hierarchy node component */
const HierarchyNode = ({ node, level, getTypeBadge, getStateBadge }: {
  node: { item: any; children: any[] };
  level: number;
  getTypeBadge: (type: string) => React.ReactNode;
  getStateBadge: (state: string) => React.ReactNode;
}) => {
  const [open, setOpen] = useState(true);
  const hasChildren = node.children.length > 0;
  const paddingLeft = level * 24;

  const icon = node.item.type === "Epic" ? (
    <Star className="h-4 w-4 text-primary shrink-0" />
  ) : node.item.type === "Feature" ? (
    <Layers className="h-4 w-4 text-primary shrink-0" />
  ) : (
    <BookOpen className="h-4 w-4 text-primary shrink-0" />
  );

  const spilloverBadge = node.item.is_spillover ? (
    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-orange-400 text-orange-600 dark:text-orange-400 whitespace-nowrap">
      Spillover
    </Badge>
  ) : null;

  if (!hasChildren) {
    return (
      <div
        className="flex items-center gap-2 py-1.5 px-3 rounded-md hover:bg-muted/50 text-sm"
        style={{ paddingLeft: paddingLeft + 28 }}
      >
      {icon}
        {getTypeBadge(node.item.type)}
        <span className="truncate flex-1">{node.item.title}</span>
        {spilloverBadge}
        {getStateBadge(node.item.state)}
        <span className="font-mono text-xs text-muted-foreground">#{node.item.id}</span>
      </div>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          className="flex items-center gap-2 py-1.5 px-3 rounded-md hover:bg-muted/50 text-sm w-full text-left"
          style={{ paddingLeft }}
        >
          {open ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
          {icon}
          {getTypeBadge(node.item.type)}
          <span className="truncate flex-1 font-medium">{node.item.title}</span>
          {spilloverBadge}
          {getStateBadge(node.item.state)}
          <span className="font-mono text-xs text-muted-foreground">#{node.item.id}</span>
          <Badge variant="secondary" className="text-xs">{node.children.length}</Badge>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        {node.children.map((child: any) => (
          <HierarchyNode key={child.item.id} node={child} level={level + 1} getTypeBadge={getTypeBadge} getStateBadge={getStateBadge} />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
};

export default SprintDetail;
