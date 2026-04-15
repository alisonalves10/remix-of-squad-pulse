import { AppLayout } from "@/components/layout/AppLayout";
import { KPICard } from "@/components/dashboard/KPICard";
import { VelocityChart } from "@/components/dashboard/VelocityChart";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { SquadsTable } from "@/components/dashboard/SquadsTable";
import { ExportButtons } from "@/components/dashboard/ExportButtons";
import { Users, TrendingUp, Target, AlertTriangle, Bug } from "lucide-react";
import { useExport } from "@/hooks/useExport";
import { useDashboardData } from "@/hooks/useDashboardData";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

const Index = () => {
  const { exportToPDF, exportToExcel } = useExport();
  const [selectedSquadId, setSelectedSquadId] = useState<string | null>(null);
  const { data, isLoading } = useDashboardData(selectedSquadId);

  const {
    totalSquads = 0,
    avgVelocity = 0,
    avgCommitment = 0,
    avgSpillover = 0,
    globalBugsCreated = 0,
    globalBugsResolved = 0,
    bugResolutionRate = 0,
    completionRate = 0,
    velocityBySquad = [],
    velocityTrend = [],
    squadTableData = [],
    allSquads = [],
  } = data ?? {};

  const exportConfig = {
    title: "Relatório de Performance das Squads",
    subtitle: "Visão consolidada de todas as equipes",
    filename: `squads-performance-${new Date().toISOString().split("T")[0]}`,
    columns: [
      { header: "Squad", key: "name" },
      { header: "Velocidade (h)", key: "velocity" },
      { header: "Comprometimento (%)", key: "commitment" },
      { header: "Spillover (%)", key: "spillover" },
      { header: "Tendência", key: "trend" },
    ],
    data: squadTableData,
  };

  const handleExportPDF = () => exportToPDF(exportConfig);
  const handleExportExcel = () => exportToExcel(exportConfig);

  if (isLoading) {
    return (
      <AppLayout title="Dashboard Geral" description="Visão consolidada de performance das squads">
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-[380px] rounded-xl" />
            <Skeleton className="h-[380px] rounded-xl" />
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout 
      title="Dashboard Geral" 
      description="Visão consolidada de performance das squads"
      actions={
        <div className="flex items-center gap-3">
          <Select
            value={selectedSquadId ?? "all"}
            onValueChange={(val) => setSelectedSquadId(val === "all" ? null : val)}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrar por squad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Squads</SelectItem>
              {allSquads.map((squad) => (
                <SelectItem key={squad.id} value={squad.id}>{squad.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ExportButtons onExportPDF={handleExportPDF} onExportExcel={handleExportExcel} />
        </div>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <KPICard
            title="Squads Monitoradas"
            value={totalSquads}
            subtitle={`${completionRate}% entregue`}
            icon={Users}
            variant="default"
          />
          <KPICard
            title="Velocidade Média"
            value={`${avgVelocity}h`}
            subtitle="Horas por sprint"
            icon={TrendingUp}
            variant="success"
          />
          <KPICard
            title="Comprometimento"
            value={`${avgCommitment}%`}
            subtitle="Planejado x entregue"
            icon={Target}
            variant={avgCommitment >= 80 ? "success" : "warning"}
          />
          <KPICard
            title="Spillover"
            value={`${avgSpillover}%`}
            subtitle="Itens replanejados"
            icon={AlertTriangle}
            variant={avgSpillover <= 15 ? "success" : "warning"}
          />
          <KPICard
            title="Bugs"
            value={`${globalBugsCreated}/${globalBugsResolved}`}
            subtitle={globalBugsCreated === 0 ? "Nenhum bug na sprint" : `${bugResolutionRate}% resolvidos`}
            icon={Bug}
            variant={globalBugsCreated === 0 ? "success" : globalBugsResolved >= globalBugsCreated ? "success" : "danger"}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <VelocityChart 
            data={velocityBySquad} 
            title="Velocidade por Squad"
            description="Horas concluídas na sprint mais recente"
          />
          <TrendChart 
            data={velocityTrend} 
            title="Tendência de Velocidade"
            description="Evolução das horas ao longo das sprints"
          />
        </div>

        <SquadsTable 
          squads={squadTableData} 
          title="Performance das Squads"
          description="Métricas consolidadas por equipe"
        />
      </div>
    </AppLayout>
  );
};

export default Index;
