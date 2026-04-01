import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { RefreshCw, Save, Eye, EyeOff } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Settings = () => {
  const { toast } = useToast();
  const [showPat, setShowPat] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [configId, setConfigId] = useState<string | null>(null);

  const [config, setConfig] = useState({
    organization: "",
    project: "",
    pat: "",
  });

  const [areaPath, setAreaPath] = useState("Backoffice");

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from("azure_config").select("*").limit(1);
    if (!error && data && data.length > 0) {
      const c = data[0];
      setConfigId(c.id);
      setConfig({
        organization: c.organization,
        project: c.project,
        pat: c.pat_encrypted || "",
      });
    }
    setIsLoading(false);
  };

  const handleSaveConfig = async () => {
    if (!config.organization || !config.project) {
      toast({ title: "Campos obrigatórios", description: "Preencha organização e projeto.", variant: "destructive" });
      return;
    }

    const payload = {
      organization: config.organization,
      project: config.project,
      pat_encrypted: config.pat,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (configId) {
      ({ error } = await supabase.from("azure_config").update(payload).eq("id", configId));
    } else {
      const res = await supabase.from("azure_config").insert(payload).select().single();
      error = res.error;
      if (res.data) setConfigId(res.data.id);
    }

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Configurações salvas", description: "As configurações do Azure DevOps foram atualizadas." });
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("azure-sync", {
        body: { areaPath },
      });

      if (error) {
        toast({ title: "Erro na sincronização", description: error.message, variant: "destructive" });
      } else if (data?.error) {
        toast({ title: "Erro na sincronização", description: data.error, variant: "destructive" });
      } else {
        toast({
          title: "Sincronização concluída!",
          description: `${data.synced} work items sincronizados. Sprints: ${data.sprints?.join(", ") || "nenhum"}`,
        });
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
    setIsSyncing(false);
  };

  return (
    <AppLayout title="Configurações" description="Integrações e configurações do sistema">
      <div className="space-y-6 max-w-4xl">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Integração Azure DevOps</CardTitle>
            <CardDescription>Configure a conexão com sua organização do Azure DevOps</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="organization">Organização</Label>
                <Input id="organization" placeholder="nome-da-organizacao" value={config.organization} onChange={(e) => setConfig({ ...config, organization: e.target.value })} />
                <p className="text-xs text-muted-foreground">Nome da organização no Azure DevOps</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="project">Projeto</Label>
                <Input id="project" placeholder="nome-do-projeto" value={config.project} onChange={(e) => setConfig({ ...config, project: e.target.value })} />
                <p className="text-xs text-muted-foreground">Projeto padrão para sincronização</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pat">Personal Access Token (PAT)</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input id="pat" type={showPat ? "text" : "password"} placeholder="Token de acesso pessoal" value={config.pat} onChange={(e) => setConfig({ ...config, pat: e.target.value })} />
                </div>
                <Button variant="outline" size="icon" onClick={() => setShowPat(!showPat)}>
                  {showPat ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Crie um PAT com permissões de leitura em Work Items e Iterations</p>
            </div>

            <div className="flex gap-4">
              <Button onClick={handleSaveConfig}>
                <Save className="mr-2 h-4 w-4" />
                Salvar Configurações
              </Button>
            </div>
          </CardContent>
        </Card>

        <Separator />

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Sincronização</CardTitle>
            <CardDescription>Importe dados do Azure DevOps para o portal</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="areaPath">Area Path</Label>
              <Input id="areaPath" placeholder="Backoffice" value={areaPath} onChange={(e) => setAreaPath(e.target.value)} />
              <p className="text-xs text-muted-foreground">Area path para filtrar os work items (ex: Backoffice)</p>
            </div>
            <Button variant="outline" onClick={handleSync} disabled={isSyncing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Sincronizando..." : "Sincronizar Agora"}
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-card border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg">Como configurar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <ol className="list-decimal list-inside space-y-2">
              <li>Acesse sua organização no Azure DevOps</li>
              <li>Vá em <strong>User Settings → Personal Access Tokens</strong></li>
              <li>Crie um novo token com escopo <code className="text-xs bg-muted px-1 py-0.5 rounded">Work Items (Read)</code> e <code className="text-xs bg-muted px-1 py-0.5 rounded">Project and Team (Read)</code></li>
              <li>Cole o token no campo PAT acima e salve</li>
              <li>Defina o Area Path e clique em "Sincronizar Agora"</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Settings;
