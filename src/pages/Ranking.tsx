import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ExportButtons } from "@/components/dashboard/ExportButtons";
import { Loader2, Medal, Trophy, Award } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useState, useMemo } from "react";
import { useRankingData } from "@/hooks/useRankingData";
import { useSquads } from "@/hooks/useSquadsData";
import { useNonFutureSprints } from "@/hooks/useProfessionalsData";
import { useExport } from "@/hooks/useExport";

type SortKey = "totalHours" | "completedItems";

const Ranking = () => {
  const { exportToPDF, exportToExcel } = useExport();
  const { data: squads } = useSquads();
  const { data: sprints } = useNonFutureSprints();

  const [squadFilter, setSquadFilter] = useState("all");
  const [sprintFilter, setSprintFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortKey>("totalHours");

  const { data: rankings, isLoading } = useRankingData(squadFilter, sprintFilter);

  const sorted = useMemo(() => {
    if (!rankings) return [];
    return [...rankings].sort((a, b) => b[sortBy] - a[sortBy]);
  }, [rankings, sortBy]);

  const chartData = useMemo(() => {
    return sorted.slice(0, 15).map(r => ({
      name: r.userName.split(" ")[0],
      value: sortBy === "totalHours" ? r.totalHours : r.completedItems,
    }));
  }, [sorted, sortBy]);

  const getMedalIcon = (index: number) => {
    if (index === 0) return <Trophy className="h-4 w-4 text-warning" />;
    if (index === 1) return <Medal className="h-4 w-4 text-muted-foreground" />;
    if (index === 2) return <Award className="h-4 w-4 text-primary" />;
    return <span className="text-sm text-muted-foreground w-4 text-center">{index + 1}</span>;
  };

  const exportConfig = {
    title: `Ranking de Profissionais - ${sortBy === "totalHours" ? "Horas" : "Itens Concluídos"}`,
    subtitle: `Comparativo de performance`,
    filename: `ranking-profissionais-${new Date().toISOString().split("T")[0]}`,
    columns: [
      { header: "#", key: "position" },
      { header: "Profissional", key: "userName" },
      { header: "Atribuição", key: "userRole" },
      { header: "Horas", key: "totalHours" },
      { header: "Concluídos", key: "completedItems" },
      { header: "Total Itens", key: "totalItems" },
      { header: "Bugs", key: "bugsResolved" },
      { header: "Sprints", key: "sprintCount" },
    ],
    data: sorted.map((r, i) => ({ ...r, position: i + 1, userRole: r.userRole || "—" })),
  };

  const handleExportPDF = () => exportToPDF(exportConfig);
  const handleExportExcel = () => exportToExcel(exportConfig);

  // Filter sprints by squad if needed
  const availableSprints = useMemo(() => {
    if (!sprints) return [];
    if (squadFilter === "all") return sprints;
    return sprints.filter(s => s.squad_id === squadFilter);
  }, [sprints, squadFilter]);

  return (
    <AppLayout
      title="Ranking de Profissionais"
      description="Comparativo de performance entre profissionais"
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
              <div className="w-full md:w-[220px]">
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Ordenar por</label>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="totalHours">Horas Lançadas</SelectItem>
                    <SelectItem value="completedItems">Itens Concluídos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full md:w-[220px]">
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Squad</label>
                <Select value={squadFilter} onValueChange={setSquadFilter}>
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
              <div className="w-full md:w-[220px]">
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Sprint</label>
                <Select value={sprintFilter} onValueChange={setSprintFilter}>
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
            {/* Chart */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-lg">
                  Top {Math.min(15, sorted.length)} — {sortBy === "totalHours" ? "Horas Lançadas" : "Itens Concluídos"}
                </CardTitle>
                <CardDescription>Comparativo visual entre profissionais</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={chartData} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={80} className="text-muted-foreground" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number) => [
                        sortBy === "totalHours" ? `${value}h` : `${value} itens`,
                        sortBy === "totalHours" ? "Horas" : "Concluídos",
                      ]}
                    />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Table */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-lg">Tabela Completa</CardTitle>
                <CardDescription>{sorted.length} profissionais com itens no período</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">#</TableHead>
                      <TableHead>Profissional</TableHead>
                      <TableHead>Atribuição</TableHead>
                      <TableHead className="text-right">Horas</TableHead>
                      <TableHead className="text-right">Concluídos</TableHead>
                      <TableHead className="text-right">Total Itens</TableHead>
                      <TableHead className="text-right">Bugs</TableHead>
                      <TableHead className="text-right">Sprints</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sorted.length > 0 ? (
                      sorted.map((r, i) => (
                        <TableRow key={r.userId}>
                          <TableCell className="font-medium">{getMedalIcon(i)}</TableCell>
                          <TableCell className="font-medium">{r.userName}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{r.userRole || "—"}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">{r.totalHours}</TableCell>
                          <TableCell className="text-right font-mono">{r.completedItems}</TableCell>
                          <TableCell className="text-right font-mono text-muted-foreground">{r.totalItems}</TableCell>
                          <TableCell className="text-right font-mono">{r.bugsResolved}</TableCell>
                          <TableCell className="text-right font-mono text-muted-foreground">{r.sprintCount}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          Nenhum dado encontrado para os filtros selecionados
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

export default Ranking;
