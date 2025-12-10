import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { KPICard } from "@/components/dashboard/KPICard";
import { Link } from "react-router-dom";
import { ArrowRight, TrendingUp, Target, Calendar } from "lucide-react";
import { useState } from "react";
import { mockSquads, mockSprints, mockVelocityTrend } from "@/lib/mock-data";

const Squads = () => {
  const [selectedSquad, setSelectedSquad] = useState(mockSquads[0].id);
  const squad = mockSquads.find(s => s.id === selectedSquad) || mockSquads[0];
  const squadSprints = mockSprints.filter(s => s.squadId === selectedSquad || selectedSquad === mockSquads[0].id);

  return (
    <AppLayout 
      title="Dashboard da Squad" 
      description="Análise detalhada de performance por equipe"
    >
      <div className="space-y-6">
        {/* Squad Selector */}
        <Card className="shadow-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Selecionar Squad</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedSquad} onValueChange={setSelectedSquad}>
              <SelectTrigger className="w-full md:w-[300px]">
                <SelectValue placeholder="Selecione uma squad" />
              </SelectTrigger>
              <SelectContent>
                {mockSquads.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Squad Info */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>{squad.name}</CardTitle>
            <CardDescription>
              Equipe de desenvolvimento focada em features de produto
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Squad KPIs */}
        <div className="grid gap-4 md:grid-cols-3">
          <KPICard
            title="Velocidade Média"
            value={`${squad.velocity} pts`}
            subtitle="Últimas 6 sprints"
            icon={TrendingUp}
            variant="default"
          />
          <KPICard
            title="Comprometimento"
            value={`${squad.commitment}%`}
            subtitle="Meta: acima de 80%"
            icon={Target}
            variant={squad.commitment >= 80 ? "success" : "warning"}
          />
          <KPICard
            title="Sprints > 80%"
            value="5 de 6"
            subtitle="Últimas sprints com alta entrega"
            icon={Calendar}
            variant="success"
          />
        </div>

        {/* Velocity Trend */}
        <TrendChart 
          data={mockVelocityTrend} 
          title={`Evolução da Velocidade - ${squad.name}`}
          description="Story points concluídos vs comprometidos por sprint"
        />

        {/* Sprints Table */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Histórico de Sprints</CardTitle>
            <CardDescription>Sprints da equipe {squad.name}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sprint</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead className="text-right">Planejado</TableHead>
                  <TableHead className="text-right">Entregue</TableHead>
                  <TableHead className="text-right">Cumprimento</TableHead>
                  <TableHead className="text-right">Spillover</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {squadSprints.map((sprint) => (
                  <TableRow key={sprint.id} className="group">
                    <TableCell className="font-medium">{sprint.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {sprint.startDate} - {sprint.endDate}
                    </TableCell>
                    <TableCell className="text-right font-mono">{sprint.plannedPoints} pts</TableCell>
                    <TableCell className="text-right font-mono">{sprint.completedPoints} pts</TableCell>
                    <TableCell className="text-right">
                      <Badge 
                        className={sprint.commitment >= 80 
                          ? "bg-success/10 text-success border-success/20" 
                          : "bg-warning/10 text-warning border-warning/20"
                        }
                      >
                        {sprint.commitment}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge 
                        className={sprint.spillover <= 15 
                          ? "bg-success/10 text-success border-success/20" 
                          : "bg-warning/10 text-warning border-warning/20"
                        }
                      >
                        {sprint.spillover}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {sprint.isClosed ? (
                        <Badge variant="secondary">Fechada</Badge>
                      ) : (
                        <Badge className="bg-primary/10 text-primary border-primary/20">Em andamento</Badge>
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
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Squads;
