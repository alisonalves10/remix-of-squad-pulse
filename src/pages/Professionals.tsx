import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { KPICard } from "@/components/dashboard/KPICard";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { VelocityChart } from "@/components/dashboard/VelocityChart";
import { ExportButtons } from "@/components/dashboard/ExportButtons";
import { TrendingUp, CheckCircle, Bug, FileText } from "lucide-react";
import { useState } from "react";
import { mockProfessionals, mockWorkItems, mockProfessionalTrend, mockSquads } from "@/lib/mock-data";
import { useExport } from "@/hooks/useExport";

const Professionals = () => {
  const { exportToPDF, exportToExcel } = useExport();
  const [selectedProfessional, setSelectedProfessional] = useState(mockProfessionals[0].id);
  const [selectedSquadFilter, setSelectedSquadFilter] = useState("all");

  const professional = mockProfessionals.find(p => p.id === selectedProfessional) || mockProfessionals[0];

  // Filter work items for this professional
  const professionalItems = mockWorkItems.filter(item => 
    item.assignee === professional.name
  );

  // Prepare data for charts
  const pointsBySprintData = mockProfessionalTrend.map(s => ({
    name: s.name,
    velocity: s.points
  }));

  const itemsBySprintData = mockProfessionalTrend.map(s => ({
    name: s.name,
    velocity: s.items
  }));

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

  const exportConfig = {
    title: `Relatório do Profissional - ${professional.name}`,
    subtitle: `${professional.role} • ${professional.squad}`,
    filename: `profissional-${professional.name.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}`,
    columns: [
      { header: "Sprint", key: "sprint" },
      { header: "ID", key: "id" },
      { header: "Título", key: "title" },
      { header: "Tipo", key: "type" },
      { header: "Story Points", key: "points" },
      { header: "Estado", key: "state" },
    ],
    data: professionalItems.map(item => ({ ...item, sprint: "Sprint 26" })),
  };

  const handleExportPDF = () => exportToPDF(exportConfig);
  const handleExportExcel = () => exportToExcel(exportConfig);

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
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Profissional
                </label>
                <Select value={selectedProfessional} onValueChange={setSelectedProfessional}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um profissional" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockProfessionals.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} - {p.role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full md:w-[250px]">
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Squad (opcional)
                </label>
                <Select value={selectedSquadFilter} onValueChange={setSelectedSquadFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as squads" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as squads</SelectItem>
                    {mockSquads.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Professional Info */}
        <Card className="shadow-card border-l-4 border-l-primary">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">{professional.name}</h2>
                <p className="text-muted-foreground">{professional.role}</p>
              </div>
              <Badge variant="outline" className="w-fit">{professional.squad}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-4">
          <KPICard
            title="Story Points"
            value={professional.completedPoints}
            subtitle="Total concluídos"
            icon={TrendingUp}
            variant="default"
          />
          <KPICard
            title="Itens Concluídos"
            value={professional.completedItems}
            subtitle="Total de itens"
            icon={CheckCircle}
            variant="success"
          />
          <KPICard
            title="Bugs Resolvidos"
            value={professional.bugsResolved}
            subtitle="Total corrigidos"
            icon={Bug}
            variant="warning"
          />
          <KPICard
            title="Média por Sprint"
            value={Math.round(professional.completedPoints / 6)}
            subtitle="Story points"
            icon={FileText}
            variant="default"
          />
        </div>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          <VelocityChart 
            data={pointsBySprintData}
            title="Story Points por Sprint"
            description="Pontos concluídos em cada sprint"
          />
          <VelocityChart 
            data={itemsBySprintData}
            title="Itens por Sprint"
            description="Quantidade de itens finalizados"
          />
        </div>

        {/* Work Items Table */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Histórico de Itens</CardTitle>
            <CardDescription>Itens atribuídos a {professional.name}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sprint</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Points</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {professionalItems.length > 0 ? (
                  professionalItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-muted-foreground">Sprint 26</TableCell>
                      <TableCell className="font-mono text-sm">{item.id}</TableCell>
                      <TableCell className="max-w-[300px] truncate">{item.title}</TableCell>
                      <TableCell>{getTypeBadge(item.type)}</TableCell>
                      <TableCell className="text-right font-mono">{item.points}</TableCell>
                      <TableCell>{getStateBadge(item.state)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhum item encontrado para este profissional
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Professionals;
