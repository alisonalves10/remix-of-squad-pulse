import { useParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { KPICard } from "@/components/dashboard/KPICard";
import { BurndownChart } from "@/components/dashboard/BurndownChart";
import { BurnupChart } from "@/components/dashboard/BurnupChart";
import { FileText, CheckCircle, AlertTriangle, RotateCcw, Target, Bug, Calendar, Search } from "lucide-react";
import { useState } from "react";
import { mockSprints, mockWorkItems, mockBurndownData, mockBurnupData } from "@/lib/mock-data";

const SprintDetail = () => {
  const { id } = useParams();
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Find sprint or use first one as default
  const sprint = mockSprints.find(s => s.id === id) || mockSprints[0];

  // Filter work items
  const filteredItems = mockWorkItems.filter(item => {
    const matchesType = typeFilter === "all" || item.type === typeFilter;
    const matchesState = stateFilter === "all" || item.state === stateFilter;
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.id.toString().includes(searchTerm);
    return matchesType && matchesState && matchesSearch;
  });

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
      "In Progress": "bg-warning/10 text-warning border-warning/20",
      "To Do": "bg-muted text-muted-foreground border-border",
    };
    return <Badge className={styles[state] || styles["To Do"]}>{state}</Badge>;
  };

  // Calculate sprint metrics
  const totalItems = mockWorkItems.length;
  const completedItems = mockWorkItems.filter(i => i.state === "Done").length;
  const carryOver = 2; // Mock value
  const spillover = totalItems - completedItems;
  const bugsCreated = mockWorkItems.filter(i => i.type === "Bug").length;
  const bugsResolved = mockWorkItems.filter(i => i.type === "Bug" && i.state === "Done").length;

  return (
    <AppLayout 
      title={`${sprint.name}`} 
      description={`${sprint.squadName} • ${sprint.startDate} - ${sprint.endDate}`}
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
                <span>{sprint.startDate} → {sprint.endDate}</span>
                {sprint.isClosed ? (
                  <Badge variant="secondary" className="ml-2">Fechada</Badge>
                ) : (
                  <Badge className="bg-primary/10 text-primary border-primary/20 ml-2">Em andamento</Badge>
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
            icon={CheckCircle}
            variant="success"
          />
          <KPICard
            title="Carregados"
            value={carryOver}
            subtitle="Da sprint anterior"
            icon={RotateCcw}
            variant="warning"
          />
          <KPICard
            title="Spillover"
            value={spillover}
            subtitle="Não concluídos"
            icon={AlertTriangle}
            variant={spillover <= 2 ? "default" : "danger"}
          />
          <KPICard
            title="Story Points"
            value={`${sprint.completedPoints}/${sprint.plannedPoints}`}
            subtitle={`${sprint.commitment}% concluído`}
            icon={Target}
            variant={sprint.commitment >= 80 ? "success" : "warning"}
          />
          <KPICard
            title="Bugs"
            value={`${bugsResolved}/${bugsCreated}`}
            subtitle="Resolvidos / Criados"
            icon={Bug}
            variant={bugsResolved >= bugsCreated ? "success" : "danger"}
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="summary" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-[500px]">
            <TabsTrigger value="summary">Resumo</TabsTrigger>
            <TabsTrigger value="burndown">Burndown</TabsTrigger>
            <TabsTrigger value="burnup">Burnup</TabsTrigger>
            <TabsTrigger value="items">Itens</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <BurndownChart 
                data={mockBurndownData} 
                title="Burndown da Sprint"
                description="Pontos restantes vs ideal"
              />
              <BurnupChart 
                data={mockBurnupData} 
                title="Burnup da Sprint"
                description="Pontos concluídos vs escopo total"
              />
            </div>
          </TabsContent>

          <TabsContent value="burndown">
            <BurndownChart 
              data={mockBurndownData} 
              title="Burndown Chart Detalhado"
              description="Acompanhamento diário do progresso - pontos restantes vs linha ideal"
            />
          </TabsContent>

          <TabsContent value="burnup">
            <BurnupChart 
              data={mockBurnupData} 
              title="Burnup Chart Detalhado"
              description="Pontos acumulados concluídos vs escopo total da sprint"
            />
          </TabsContent>

          <TabsContent value="items">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-lg">Work Items da Sprint</CardTitle>
                <CardDescription>Itens de trabalho incluídos nesta sprint</CardDescription>
                
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
                      <SelectItem value="User Story">User Story</SelectItem>
                      <SelectItem value="Bug">Bug</SelectItem>
                      <SelectItem value="Task">Task</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={stateFilter} onValueChange={setStateFilter}>
                    <SelectTrigger className="w-full md:w-[180px]">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os estados</SelectItem>
                      <SelectItem value="Done">Done</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="To Do">To Do</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Título</TableHead>
                      <TableHead>Responsável</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Points</TableHead>
                      <TableHead>Criado em</TableHead>
                      <TableHead>Concluído em</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-sm">{item.id}</TableCell>
                        <TableCell>{getTypeBadge(item.type)}</TableCell>
                        <TableCell className="max-w-[300px] truncate">{item.title}</TableCell>
                        <TableCell>{item.assignee}</TableCell>
                        <TableCell>{getStateBadge(item.state)}</TableCell>
                        <TableCell className="text-right font-mono">{item.points}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{item.createdAt}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {item.completedAt || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default SprintDetail;
