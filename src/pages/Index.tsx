import { AppLayout } from "@/components/layout/AppLayout";
import { KPICard } from "@/components/dashboard/KPICard";
import { VelocityChart } from "@/components/dashboard/VelocityChart";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { SquadsTable } from "@/components/dashboard/SquadsTable";
import { ExportButtons } from "@/components/dashboard/ExportButtons";
import { Users, TrendingUp, Target, AlertTriangle, Bug } from "lucide-react";
import { mockSquads, mockVelocityBySquad, mockVelocityTrend } from "@/lib/mock-data";
import { useExport } from "@/hooks/useExport";

const Index = () => {
  const { exportToPDF, exportToExcel } = useExport();

  // Calculate aggregate KPIs
  const totalSquads = mockSquads.length;
  const avgVelocity = Math.round(mockSquads.reduce((sum, s) => sum + s.velocity, 0) / totalSquads);
  const avgCommitment = Math.round(mockSquads.reduce((sum, s) => sum + s.commitment, 0) / totalSquads);
  const avgSpillover = Math.round(mockSquads.reduce((sum, s) => sum + s.spillover, 0) / totalSquads);
  const bugRate = 12; // Mock value

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
    data: mockSquads,
  };

  const handleExportPDF = () => exportToPDF(exportConfig);
  const handleExportExcel = () => exportToExcel(exportConfig);

  return (
    <AppLayout 
      title="Dashboard Geral" 
      description="Visão consolidada de performance das squads"
      actions={<ExportButtons onExportPDF={handleExportPDF} onExportExcel={handleExportExcel} />}
    >
      <div className="space-y-6">
        {/* KPI Cards */}
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
            trend={{ value: 8, isPositive: true }}
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

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          <VelocityChart 
            data={mockVelocityBySquad} 
            title="Velocidade por Squad"
            description="Story points concluídos (média das últimas sprints)"
          />
          <TrendChart 
            data={mockVelocityTrend} 
            title="Tendência de Velocidade"
            description="Evolução da velocidade ao longo das sprints"
          />
        </div>

        {/* Squads Table */}
        <SquadsTable 
          squads={mockSquads} 
          title="Performance das Squads"
          description="Métricas consolidadas por equipe"
        />
      </div>
    </AppLayout>
  );
};

export default Index;
