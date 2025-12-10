import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RefreshCw, Save, Plus, Trash2, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { mockSquads } from "@/lib/mock-data";

const Settings = () => {
  const { toast } = useToast();
  const [showPat, setShowPat] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [config, setConfig] = useState({
    organization: "minha-organizacao",
    project: "projeto-principal",
    pat: "••••••••••••••••••••••••••••••••"
  });

  const [squadMappings, setSquadMappings] = useState([
    { id: "1", portalSquad: "Squad Alpha", azureTeam: "Alpha Team", status: "synced" },
    { id: "2", portalSquad: "Squad Beta", azureTeam: "Beta Team", status: "synced" },
    { id: "3", portalSquad: "Squad Gamma", azureTeam: "Gamma Team", status: "pending" },
  ]);

  const handleSaveConfig = () => {
    toast({
      title: "Configurações salvas",
      description: "As configurações do Azure DevOps foram atualizadas com sucesso.",
    });
  };

  const handleSync = async () => {
    setIsSyncing(true);
    
    // Simulate sync process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setIsSyncing(false);
    toast({
      title: "Sincronização concluída",
      description: "Dados sincronizados com Azure DevOps.",
    });
  };

  const handleAddMapping = () => {
    const newId = String(squadMappings.length + 1);
    setSquadMappings([...squadMappings, {
      id: newId,
      portalSquad: "",
      azureTeam: "",
      status: "pending"
    }]);
  };

  const handleRemoveMapping = (id: string) => {
    setSquadMappings(squadMappings.filter(m => m.id !== id));
    toast({
      title: "Mapeamento removido",
      description: "O mapeamento foi removido com sucesso.",
    });
  };

  return (
    <AppLayout 
      title="Configurações" 
      description="Integrações e configurações do sistema"
    >
      <div className="space-y-6 max-w-4xl">
        {/* Azure DevOps Configuration */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Integração Azure DevOps</CardTitle>
            <CardDescription>
              Configure a conexão com sua organização do Azure DevOps
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="organization">Organização</Label>
                <Input 
                  id="organization"
                  placeholder="nome-da-organizacao"
                  value={config.organization}
                  onChange={(e) => setConfig({ ...config, organization: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Nome da organização no Azure DevOps
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="project">Projeto</Label>
                <Input 
                  id="project"
                  placeholder="nome-do-projeto"
                  value={config.project}
                  onChange={(e) => setConfig({ ...config, project: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Projeto padrão para sincronização
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="pat">Personal Access Token (PAT)</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input 
                    id="pat"
                    type={showPat ? "text" : "password"}
                    placeholder="Token de acesso pessoal"
                    value={config.pat}
                    onChange={(e) => setConfig({ ...config, pat: e.target.value })}
                  />
                </div>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => setShowPat(!showPat)}
                >
                  {showPat ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Crie um PAT com permissões de leitura em Work Items e Iterations
              </p>
            </div>

            <div className="flex gap-4">
              <Button onClick={handleSaveConfig}>
                <Save className="mr-2 h-4 w-4" />
                Salvar Configurações
              </Button>
              <Button 
                variant="outline" 
                onClick={handleSync}
                disabled={isSyncing}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Squad Mappings */}
        <Card className="shadow-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Mapeamento de Squads</CardTitle>
                <CardDescription>
                  Vincule as squads do portal aos times no Azure DevOps
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={handleAddMapping}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Squad (Portal)</TableHead>
                  <TableHead>Azure Team</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {squadMappings.map((mapping) => (
                  <TableRow key={mapping.id}>
                    <TableCell>
                      <Select 
                        value={mapping.portalSquad}
                        onValueChange={(value) => {
                          setSquadMappings(squadMappings.map(m => 
                            m.id === mapping.id ? { ...m, portalSquad: value } : m
                          ));
                        }}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {mockSquads.map((s) => (
                            <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input 
                        placeholder="Nome do time no Azure"
                        value={mapping.azureTeam}
                        onChange={(e) => {
                          setSquadMappings(squadMappings.map(m => 
                            m.id === mapping.id ? { ...m, azureTeam: e.target.value } : m
                          ));
                        }}
                        className="w-[200px]"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      {mapping.status === "synced" ? (
                        <Badge className="bg-success/10 text-success border-success/20">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Sincronizado
                        </Badge>
                      ) : (
                        <Badge className="bg-warning/10 text-warning border-warning/20">
                          <AlertCircle className="mr-1 h-3 w-3" />
                          Pendente
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleRemoveMapping(mapping.id)}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Help Section */}
        <Card className="shadow-card border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg">Como configurar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <ol className="list-decimal list-inside space-y-2">
              <li>Acesse sua organização no Azure DevOps</li>
              <li>Vá em <strong>User Settings → Personal Access Tokens</strong></li>
              <li>Crie um novo token com escopo <code className="text-xs bg-muted px-1 py-0.5 rounded">Work Items (Read)</code> e <code className="text-xs bg-muted px-1 py-0.5 rounded">Project and Team (Read)</code></li>
              <li>Cole o token no campo PAT acima</li>
              <li>Mapeie suas squads aos times correspondentes</li>
              <li>Clique em "Sincronizar Agora" para importar os dados</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Settings;
