import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { RefreshCw, Save, Eye, EyeOff, Plus, X, FolderTree } from "lucide-react";
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

  const [areaPaths, setAreaPaths] = useState<string[]>([]);
  const [newAreaPath, setNewAreaPath] = useState("");
  const [availableAreaPaths, setAvailableAreaPaths] = useState<string[]>([]);
  const [isLoadingAreas, setIsLoadingAreas] = useState(false);
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
      setAreaPaths((c as any).area_paths || ["Backoffice"]);
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
      area_paths: areaPaths.length > 0 ? areaPaths : ["Backoffice"],
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

  const handleAddAreaPath = () => {
    const trimmed = newAreaPath.trim();
    if (!trimmed) return;
    if (areaPaths.includes(trimmed)) {
      toast({ title: "Duplicado", description: "Esse Area Path já foi adicionado.", variant: "destructive" });
      return;
    }
    setAreaPaths([...areaPaths, trimmed]);
    setNewAreaPath("");
  };

  const handleRemoveAreaPath = (path: string) => {
    setAreaPaths(areaPaths.filter((p) => p !== path));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddAreaPath();
    }
  };

  const handleDiscoverAreaPaths = async () => {
    if (!config.organization || !config.project) {
      toast({ title: "Configure primeiro", description: "Preencha organização e projeto antes de buscar.", variant: "destructive" });
      return;
    }
    setIsLoadingAreas(true);
    try {
      const { data, error } = await supabase.functions.invoke("azure-list-areas");
      if (error) {
        toast({ title: "Erro ao buscar", description: error.message, variant: "destructive" });
      } else if (data?.error) {
        toast({ title: "Erro", description: data.error, variant: "destructive" });
      } else {
        setAvailableAreaPaths(data.areaPaths || []);
        toast({ title: "Area Paths encontrados", description: `${(data.areaPaths || []).length} Area Paths disponíveis no projeto.` });
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
    setIsLoadingAreas(false);
  };

  const handleToggleAreaPath = (path: string) => {
    if (areaPaths.includes(path)) {
      setAreaPaths(areaPaths.filter((p) => p !== path));
    } else {
      setAreaPaths([...areaPaths, path]);
    }
  };

  const handleSync = async () => {
    if (areaPaths.length === 0) {
      toast({ title: "Nenhum Area Path", description: "Adicione pelo menos um Area Path para sincronizar.", variant: "destructive" });
      return;
    }

    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("azure-sync", {
        body: { areaPaths },
      });

      if (error) {
        toast({ title: "Erro na sincronização", description: error.message, variant: "destructive" });
      } else if (data?.error) {
        toast({ title: "Erro na sincronização", description: data.error, variant: "destructive" });
      } else if (data?.results) {
        const totalSynced = data.results.reduce((sum: number, r: any) => sum + (r.synced || 0), 0);
        const errors = data.results.filter((r: any) => r.error);
        const successful = data.results.filter((r: any) => !r.error);

        let description = `${totalSynced} work items sincronizados em ${successful.length} time(s).`;
        if (errors.length > 0) {
          description += ` ${errors.length} erro(s): ${errors.map((e: any) => `${e.areaPath}: ${e.error}`).join("; ")}`;
        }

        toast({
          title: errors.length > 0 ? "Sincronização parcial" : "Sincronização concluída!",
          description,
          variant: errors.length > 0 ? "destructive" : "default",
        });
      } else {
        toast({ title: "Sincronização concluída!", description: `${data?.synced || 0} work items sincronizados.` });
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
            <CardTitle className="text-lg">Descobrir Area Paths</CardTitle>
            <CardDescription>Busque os Area Paths disponíveis diretamente do Azure DevOps</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" onClick={handleDiscoverAreaPaths} disabled={isLoadingAreas}>
              <FolderTree className={`mr-2 h-4 w-4 ${isLoadingAreas ? "animate-spin" : ""}`} />
              {isLoadingAreas ? "Buscando..." : "Buscar Area Paths do Azure DevOps"}
            </Button>

            {availableAreaPaths.length > 0 && (
              <div className="space-y-2">
                <Label>Area Paths disponíveis ({availableAreaPaths.length})</Label>
                <div className="border rounded-md max-h-64 overflow-y-auto divide-y">
                  {availableAreaPaths.map((path) => {
                    const isSelected = areaPaths.includes(path);
                    return (
                      <label
                        key={path}
                        className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer"
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggleAreaPath(path)}
                        />
                        <span className="text-sm">{path}</span>
                        {isSelected && (
                          <Badge variant="default" className="ml-auto text-xs">Selecionado</Badge>
                        )}
                      </label>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  Marque os Area Paths que deseja sincronizar. Lembre-se de salvar as configurações após selecionar.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Sincronização</CardTitle>
            <CardDescription>Importe dados do Azure DevOps para o portal</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Area Paths selecionados ({areaPaths.length})</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Adicionar manualmente (ex: Backoffice)"
                  value={newAreaPath}
                  onChange={(e) => setNewAreaPath(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <Button variant="outline" onClick={handleAddAreaPath}>
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar
                </Button>
              </div>

              {areaPaths.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {areaPaths.map((path) => (
                    <Badge key={path} variant="secondary" className="text-sm py-1 px-3 gap-1">
                      {path}
                      <button onClick={() => handleRemoveAreaPath(path)} className="ml-1 hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <Button variant="outline" onClick={handleSync} disabled={isSyncing || areaPaths.length === 0}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Sincronizando..." : `Sincronizar ${areaPaths.length} Time(s)`}
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
              <li>Adicione os Area Paths dos seus times e clique em "Sincronizar"</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Settings;
