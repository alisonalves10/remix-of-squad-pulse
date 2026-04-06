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

const Index = () => {
  const { exportToPDF, exportToExcel } = useExport();
  const { data, isLoading } = useDashboardData();

  const {
    totalSquads = 0,
    avgVelocity = 0,
    avgCommitment = 0,
    avgSpillover = 0,
    bugRate = 0,
    velocityBySquad = [],
    velocityTrend = [],
    squadTableData = [],
  } = data ?? {};

  const exportConfig = {
    title: "Relatório de Performance das Squads",
    subtitle: "Visão consolidada de todas as equipes",
    filename: `squads-performance-${new Date().toISOString().split("T")[0]}`,
    columns: [
      { header: "Squad", key: "name" },
      { header: "Velocidade (pts)", key: "velocity" },
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
      actions={<ExportButtons onExportPDF={handleExportPDF} onExportExcel={handleExportExcel} />}
    >
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <KPICard
            title="Squads Monitoradas"
            value={totalSquads}
            subtitle="Equipes ativas"
            icon={Users}
            variant="default"
          />
          <KPICard
            title="Velocidade Média"
            value={`${avgVelocity} pts`}
            subtitle="Por sprint"
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
            title="Taxa de Bugs"
            value={`${bugRate}%`}
            subtitle="Criados x resolvidos"
            icon={Bug}
            variant={bugRate <= 15 ? "success" : "danger"}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <VelocityChart 
            data={velocityBySquad} 
            title="Velocidade por Squad"
            description="Story points concluídos na sprint mais recente"
          />
          <TrendChart 
            data={velocityTrend} 
            title="Tendência de Velocidade"
            description="Evolução da velocidade ao longo das sprints"
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
