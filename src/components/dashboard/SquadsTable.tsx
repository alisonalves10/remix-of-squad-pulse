import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp, TrendingDown } from "lucide-react";

interface Squad {
  id: string;
  name: string;
  velocity: number;
  commitment: number;
  spillover: number;
  trend: "up" | "down" | "stable";
  bugsCreated?: number;
  bugsResolved?: number;
}

interface SquadsTableProps {
  squads: Squad[];
  title?: string;
  description?: string;
}

export function SquadsTable({ squads, title = "Squads", description }: SquadsTableProps) {
  const getCommitmentBadge = (value: number) => {
    if (value >= 85) return <Badge className="bg-success/10 text-success border-success/20">{value}%</Badge>;
    if (value >= 70) return <Badge className="bg-warning/10 text-warning border-warning/20">{value}%</Badge>;
    return <Badge className="bg-destructive/10 text-destructive border-destructive/20">{value}%</Badge>;
  };

  const getSpilloverBadge = (value: number) => {
    if (value <= 10) return <Badge className="bg-success/10 text-success border-success/20">{value}%</Badge>;
    if (value <= 25) return <Badge className="bg-warning/10 text-warning border-warning/20">{value}%</Badge>;
    return <Badge className="bg-destructive/10 text-destructive border-destructive/20">{value}%</Badge>;
  };

  const getBugsBadge = (created: number, resolved: number) => {
    if (created === 0) return <Badge className="bg-success/10 text-success border-success/20">0</Badge>;
    if (resolved >= created) return <Badge className="bg-success/10 text-success border-success/20">{created}/{resolved}</Badge>;
    return <Badge className="bg-destructive/10 text-destructive border-destructive/20">{created}/{resolved}</Badge>;
  };

  return (
    <Card className="shadow-card animate-slide-up">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Squad</TableHead>
              <TableHead className="text-right">Velocidade Média</TableHead>
              <TableHead className="text-right">Comprometimento</TableHead>
              <TableHead className="text-right">Spillover</TableHead>
              <TableHead className="text-right">Bugs</TableHead>
              <TableHead className="text-center">Tendência</TableHead>
              <TableHead className="text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {squads.map((squad) => (
              <TableRow key={squad.id} className="group">
                <TableCell className="font-medium">{squad.name}</TableCell>
                <TableCell className="text-right font-mono"><TableCell className="text-right font-mono">{squad.velocity}h</TableCell></TableCell>
                <TableCell className="text-right">{getCommitmentBadge(squad.commitment)}</TableCell>
                <TableCell className="text-right">{getSpilloverBadge(squad.spillover)}</TableCell>
                <TableCell className="text-right">{getBugsBadge(squad.bugsCreated ?? 0, squad.bugsResolved ?? 0)}</TableCell>
                <TableCell className="text-center">
                  {squad.trend === "up" ? (
                    <TrendingUp className="h-4 w-4 text-success inline" />
                  ) : squad.trend === "down" ? (
                    <TrendingDown className="h-4 w-4 text-destructive inline" />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" asChild className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link to={`/squads/${squad.id}`}>
                      Ver <ArrowRight className="ml-1 h-3 w-3" />
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
