import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KPICard } from "@/components/dashboard/KPICard";
import { ExportButtons } from "@/components/dashboard/ExportButtons";
import { useBusinessUnits, useRoadmapItems, useSquadBusinessUnits, useRoadmapItemSquads, useRoadmapItemBusinessUnits } from "@/hooks/useRoadmapData";
import { useExport } from "@/hooks/useExport";
import { Loader2, DollarSign, Rocket, CheckCircle2, AlertTriangle, Plus, X, Pencil, Trash2, Users } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useState, useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useSquads } from "@/hooks/useSquadsData";
import { format, parseISO, differenceInDays, startOfQuarter, endOfQuarter, eachQuarterOfInterval, addQuarters } from "date-fns";
import { ptBR } from "date-fns/locale";

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--destructive))",
  "hsl(38, 92%, 50%)",
  "hsl(142, 71%, 45%)",
  "hsl(270, 60%, 55%)",
];

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  planned: { label: "Planejado", variant: "secondary" },
  in_progress: { label: "Em Andamento", variant: "default" },
  done: { label: "Concluído", variant: "outline" },
  cancelled: { label: "Cancelado", variant: "destructive" },
};

const PRIORITY_MAP: Record<string, { label: string; color: string }> = {
  critical: { label: "Crítica", color: "border-red-500 text-red-600" },
  high: { label: "Alta", color: "border-orange-500 text-orange-600" },
  medium: { label: "Média", color: "border-yellow-500 text-yellow-600" },
  low: { label: "Baixa", color: "border-green-500 text-green-600" },
};

const CATEGORY_MAP: Record<string, string> = {
  feature: "Feature",
  tech_debt: "Dívida Técnica",
  infrastructure: "Infraestrutura",
  compliance: "Compliance",
};

const Roadmap = () => {
  const { exportToPDF, exportToExcel } = useExport();

  const exportConfig = {
    title: "Roadmap Executivo",
    columns: [
      { header: "Título", key: "title" },
      { header: "Status", key: "status" },
      { header: "Prioridade", key: "priority" },
      { header: "Categoria", key: "category" },
      { header: "Custo (R$)", key: "estimated_cost" },
    ],
    filename: "roadmap",
  };
  const { data: items, isLoading: itemsLoading } = useRoadmapItems();
  const { data: businessUnits, isLoading: buLoading } = useBusinessUnits();
  const { data: squads } = useSquads();
  const { data: squadBU } = useSquadBusinessUnits();
  const { data: itemSquads } = useRoadmapItemSquads();
  const { data: itemBUs } = useRoadmapItemBusinessUnits();
  const queryClient = useQueryClient();

  const [filterBU, setFilterBU] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterSquad, setFilterSquad] = useState("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addBUDialogOpen, setAddBUDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  // Multi-squad form state
  const [selectedSquads, setSelectedSquads] = useState<Record<string, number>>({});
  // Multi-BU form state (busId -> cost_share)
  const [selectedBUs, setSelectedBUs] = useState<Record<string, number>>({});
  const [estimatedCostInput, setEstimatedCostInput] = useState<number>(0);

  const toggleSquad = (squadId: string) => {
    setSelectedSquads(prev => {
      const next = { ...prev };
      if (next[squadId] !== undefined) {
        delete next[squadId];
      } else {
        next[squadId] = 0;
      }
      return next;
    });
  };

  const updateSquadCost = (squadId: string, value: number) => {
    setSelectedSquads(prev => ({ ...prev, [squadId]: value }));
  };

  const toggleBU = (buId: string) => {
    setSelectedBUs(prev => {
      const next = { ...prev };
      if (next[buId] !== undefined) {
        delete next[buId];
      } else {
        next[buId] = 0;
      }
      return next;
    });
  };

  const updateBUCost = (buId: string, value: number) => {
    setSelectedBUs(prev => ({ ...prev, [buId]: value }));
  };

  const totalRateado = useMemo(() => Object.values(selectedSquads).reduce((s, v) => s + v, 0), [selectedSquads]);
  const totalRateadoBU = useMemo(() => Object.values(selectedBUs).reduce((s, v) => s + v, 0), [selectedBUs]);
  const selectedBUIds = useMemo(() => Object.keys(selectedBUs), [selectedBUs]);

  // Build a map: itemId -> squads with cost_share
  const itemSquadsMap = useMemo(() => {
    const map: Record<string, Array<{ squad_id: string; squad_name: string; cost_share: number }>> = {};
    if (!itemSquads) return map;
    for (const is of itemSquads) {
      if (!map[is.roadmap_item_id]) map[is.roadmap_item_id] = [];
      map[is.roadmap_item_id].push({
        squad_id: is.squad_id,
        squad_name: (is as any).squads?.name || "—",
        cost_share: Number(is.cost_share) || 0,
      });
    }
    return map;
  }, [itemSquads]);

  // Build a map: itemId -> business units with cost_share
  const itemBUsMap = useMemo(() => {
    const map: Record<string, Array<{ business_unit_id: string; bu_name: string; cost_share: number }>> = {};
    if (!itemBUs) return map;
    for (const ib of itemBUs) {
      if (!map[ib.roadmap_item_id]) map[ib.roadmap_item_id] = [];
      map[ib.roadmap_item_id].push({
        business_unit_id: ib.business_unit_id,
        bu_name: (ib as any).business_units?.name || "—",
        cost_share: Number(ib.cost_share) || 0,
      });
    }
    return map;
  }, [itemBUs]);

  const filteredItems = useMemo(() => {
    if (!items) return [];
    return items.filter(item => {
      if (filterBU !== "all") {
        const busForItem = itemBUsMap[item.id];
        if (busForItem && busForItem.length > 0) {
          if (!busForItem.some(b => b.business_unit_id === filterBU)) return false;
        } else if (item.business_unit_id !== filterBU) {
          return false;
        }
      }
      if (filterStatus !== "all" && item.status !== filterStatus) return false;
      if (filterCategory !== "all" && item.category !== filterCategory) return false;
      if (filterSquad !== "all") {
        // Check junction table first, fallback to legacy squad_id
        const squadsForItem = itemSquadsMap[item.id];
        if (squadsForItem && squadsForItem.length > 0) {
          if (!squadsForItem.some(s => s.squad_id === filterSquad)) return false;
        } else if (item.squad_id !== filterSquad) {
          return false;
        }
      }
      return true;
    });
  }, [items, filterBU, filterStatus, filterCategory, filterSquad, itemSquadsMap, itemBUsMap]);

  // KPIs
  const totalInvested = useMemo(() => filteredItems.reduce((s, i) => s + (i.estimated_cost || 0), 0), [filteredItems]);
  const inProgress = useMemo(() => filteredItems.filter(i => i.status === "in_progress").length, [filteredItems]);
  const doneCount = useMemo(() => filteredItems.filter(i => i.status === "done").length, [filteredItems]);
  const onTimeRate = useMemo(() => {
    const done = filteredItems.filter(i => i.status === "done");
    if (done.length === 0) return 0;
    const onTime = done.filter(i => !i.end_date || new Date() <= parseISO(i.end_date)).length;
    return Math.round((onTime / done.length) * 100);
  }, [filteredItems]);

  // Investment by category
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredItems.forEach(i => {
      const cat = CATEGORY_MAP[i.category] || i.category;
      map[cat] = (map[cat] || 0) + (i.estimated_cost || 0);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredItems]);

  // By BU — use cost_share from junction table, fallback to legacy business_unit_id
  const buData = useMemo(() => {
    if (!businessUnits) return [];
    return businessUnits.map(bu => {
      // Sum cost_share from junction for this BU
      let junctionCost = 0;
      const itemIdsInJunction = new Set<string>();
      if (itemBUs) {
        for (const ib of itemBUs) {
          if (ib.business_unit_id === bu.id) {
            junctionCost += Number(ib.cost_share) || 0;
            itemIdsInJunction.add(ib.roadmap_item_id);
          }
        }
      }
      // Items associated through junction
      const junctionItems = (items || []).filter(i => itemIdsInJunction.has(i.id));
      // Legacy items (no junction entries) tied via business_unit_id
      const legacyItems = (items || []).filter(i =>
        i.business_unit_id === bu.id && !(itemBUsMap[i.id]?.length)
      );
      const allItems = [...junctionItems, ...legacyItems];
      const total = allItems.length;
      const done = allItems.filter(i => i.status === "done").length;
      const legacyCost = legacyItems.reduce((s, i) => s + (i.estimated_cost || 0), 0);
      const cost = junctionCost + legacyCost;
      const hours = allItems.reduce((s, i) => s + (i.invested_hours || 0), 0);
      return { ...bu, total, done, cost, hours, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
    });
  }, [businessUnits, items, itemBUs, itemBUsMap]);

  // By Squad — use cost_share from junction table
  const squadData = useMemo(() => {
    if (!squads) return [];
    return squads.map(sq => {
      // Sum cost_share from junction table for this squad
      let junctionCost = 0;
      let junctionCount = 0;
      if (itemSquads) {
        for (const is of itemSquads) {
          if (is.squad_id === sq.id) {
            junctionCost += Number(is.cost_share) || 0;
            junctionCount++;
          }
        }
      }
      // Also count legacy items without junction entries
      const legacyItems = (items || []).filter(i => i.squad_id === sq.id && !(itemSquadsMap[i.id]?.length));
      const legacyCost = legacyItems.reduce((s, i) => s + (i.estimated_cost || 0), 0);
      const total = junctionCount + legacyItems.length;
      const cost = junctionCost + legacyCost;
      const hours = legacyItems.reduce((s, i) => s + (i.invested_hours || 0), 0);
      return { name: sq.name, total, cost, hours };
    }).filter(s => s.total > 0);
  }, [squads, items, itemSquads, itemSquadsMap]);

  // Timeline data
  const timelineData = useMemo(() => {
    if (!filteredItems.length) return { quarters: [] as string[], items: [] as any[] };
    const now = new Date();
    const start = startOfQuarter(addQuarters(now, -2));
    const end = endOfQuarter(addQuarters(now, 4));
    const quarters = eachQuarterOfInterval({ start, end }).map(q => format(q, "QQQ yyyy", { locale: ptBR }));
    return { quarters, items: filteredItems.filter(i => i.start_date && i.end_date) };
  }, [filteredItems]);

  const isLoading = itemsLoading || buLoading;

  // Add or edit item form
  const handleAddItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const estimatedCost = Number(fd.get("estimated_cost")) || 0;

    const buIds = Object.keys(selectedBUs);
    // Legacy business_unit_id = first selected BU (compat)
    const legacyBUId = buIds[0] || null;

    const payload = {
      title: fd.get("title") as string,
      description: fd.get("description") as string || null,
      business_unit_id: legacyBUId,
      squad_id: null,
      status: fd.get("status") as string,
      priority: fd.get("priority") as string,
      start_date: (fd.get("start_date") as string) || null,
      end_date: (fd.get("end_date") as string) || null,
      estimated_cost: estimatedCost,
      category: fd.get("category") as string,
    };

    let itemId: string | null = null;

    if (editingItem) {
      const { error } = await supabase.from("roadmap_items").update(payload).eq("id", editingItem.id);
      if (error) {
        toast.error("Erro ao atualizar demanda");
        return;
      }
      itemId = editingItem.id;
      // Remove existing allocations for this item
      await supabase.from("roadmap_item_squads").delete().eq("roadmap_item_id", itemId);
      await supabase.from("roadmap_item_business_units").delete().eq("roadmap_item_id", itemId);
    } else {
      const { data: newItem, error } = await supabase.from("roadmap_items").insert(payload).select("id").single();
      if (error || !newItem) {
        toast.error("Erro ao adicionar demanda");
        return;
      }
      itemId = newItem.id;
    }

    // Insert squad cost shares
    const squadEntries = Object.entries(selectedSquads);
    if (squadEntries.length > 0 && itemId) {
      const { error: sqError } = await supabase.from("roadmap_item_squads").insert(
        squadEntries.map(([squad_id, cost_share]) => ({
          roadmap_item_id: itemId!,
          squad_id,
          cost_share,
        }))
      );
      if (sqError) {
        toast.error("Erro ao salvar rateio de squads");
        return;
      }
    }

    // Insert BU cost shares — single BU gets full estimated_cost; multi splits via input
    const buEntries = Object.entries(selectedBUs);
    if (buEntries.length > 0 && itemId) {
      const rows = buEntries.length === 1
        ? [{ roadmap_item_id: itemId, business_unit_id: buEntries[0][0], cost_share: estimatedCost }]
        : buEntries.map(([business_unit_id, cost_share]) => ({
            roadmap_item_id: itemId!,
            business_unit_id,
            cost_share,
          }));
      const { error: buError } = await supabase.from("roadmap_item_business_units").insert(rows);
      if (buError) {
        toast.error("Erro ao salvar rateio de unidades de negócio");
        return;
      }
    }

    toast.success(editingItem ? "Demanda atualizada" : "Demanda adicionada");
    queryClient.invalidateQueries({ queryKey: ["roadmap_items"] });
    queryClient.invalidateQueries({ queryKey: ["roadmap_item_squads"] });
    queryClient.invalidateQueries({ queryKey: ["roadmap_item_business_units"] });
    setAddDialogOpen(false);
    setEditingItem(null);
    setSelectedSquads({});
    setSelectedBUs({});
    setEstimatedCostInput(0);
  };

  const openEditDialog = (item: any) => {
    setEditingItem(item);
    // Pre-populate squad allocations from junction table
    const squadsForItem = itemSquadsMap[item.id] || [];
    const initialSquads: Record<string, number> = {};
    squadsForItem.forEach(s => {
      if (s.squad_id) initialSquads[s.squad_id] = s.cost_share;
    });
    setSelectedSquads(initialSquads);

    // Pre-populate BU allocations from junction table (fallback to legacy business_unit_id)
    const busForItem = itemBUsMap[item.id] || [];
    const initialBUs: Record<string, number> = {};
    if (busForItem.length > 0) {
      busForItem.forEach(b => {
        initialBUs[b.business_unit_id] = b.cost_share;
      });
    } else if (item.business_unit_id) {
      initialBUs[item.business_unit_id] = Number(item.estimated_cost) || 0;
    }
    setSelectedBUs(initialBUs);
    setEstimatedCostInput(Number(item.estimated_cost) || 0);
    setAddDialogOpen(true);
  };

  const handleDeleteItem = async () => {
    if (!deletingItemId) return;
    // Junction rows are removed via ON DELETE CASCADE
    const { error } = await supabase.from("roadmap_items").delete().eq("id", deletingItemId);
    if (error) {
      toast.error("Erro ao excluir demanda");
      return;
    }
    toast.success("Demanda excluída");
    queryClient.invalidateQueries({ queryKey: ["roadmap_items"] });
    queryClient.invalidateQueries({ queryKey: ["roadmap_item_squads"] });
    queryClient.invalidateQueries({ queryKey: ["roadmap_item_business_units"] });
    setDeletingItemId(null);
  };

  const handleAddBU = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const { error } = await supabase.from("business_units").insert({
      name: fd.get("name") as string,
      description: (fd.get("description") as string) || null,
    });
    if (error) {
      toast.error("Erro ao adicionar unidade de negócio");
      return;
    }
    toast.success("Unidade de negócio adicionada");
    queryClient.invalidateQueries({ queryKey: ["business_units"] });
    setAddBUDialogOpen(false);
  };

  // Helper to get squads for a given item
  const getSquadsForItem = (itemId: string, legacySquadName?: string) => {
    const junctionSquads = itemSquadsMap[itemId];
    if (junctionSquads && junctionSquads.length > 0) {
      return junctionSquads;
    }
    if (legacySquadName) {
      return [{ squad_id: "", squad_name: legacySquadName, cost_share: 0 }];
    }
    return [];
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Roadmap Executivo</h1>
            <p className="text-muted-foreground text-sm">Visão estratégica de demandas, investimentos e entregas</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={addBUDialogOpen} onOpenChange={setAddBUDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm"><Plus className="h-4 w-4 mr-1" />Unidade de Negócio</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nova Unidade de Negócio</DialogTitle></DialogHeader>
                <form onSubmit={handleAddBU} className="space-y-4">
                  <div><Label>Nome</Label><Input name="name" required /></div>
                  <div><Label>Descrição</Label><Textarea name="description" /></div>
                  <Button type="submit">Salvar</Button>
                </form>
              </DialogContent>
            </Dialog>
            <Dialog open={addDialogOpen} onOpenChange={(open) => { setAddDialogOpen(open); if (!open) { setSelectedSquads({}); setSelectedBUs({}); setEstimatedCostInput(0); setEditingItem(null); } }}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={() => { setEditingItem(null); setSelectedSquads({}); setSelectedBUs({}); setEstimatedCostInput(0); }}><Plus className="h-4 w-4 mr-1" />Demanda</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>{editingItem ? "Editar Demanda" : "Nova Demanda"}</DialogTitle></DialogHeader>
                <form onSubmit={handleAddItem} className="space-y-3">
                  <div><Label>Título</Label><Input name="title" required defaultValue={editingItem?.title || ""} /></div>
                  <div><Label>Descrição</Label><Textarea name="description" defaultValue={editingItem?.description || ""} /></div>
                  <div>
                    <Label>Categoria</Label>
                    <select name="category" defaultValue={editingItem?.category || "feature"} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                      {Object.entries(CATEGORY_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Status</Label>
                      <select name="status" defaultValue={editingItem?.status || "planned"} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                        {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label>Prioridade</Label>
                      <select name="priority" defaultValue={editingItem?.priority || "medium"} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                        {Object.entries(PRIORITY_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Custo Estimado (R$)</Label>
                      <Input
                        name="estimated_cost"
                        type="number"
                        value={estimatedCostInput || ""}
                        onChange={(e) => setEstimatedCostInput(Number(e.target.value) || 0)}
                      />
                    </div>
                    <div />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Data Início</Label><Input name="start_date" type="date" defaultValue={editingItem?.start_date || ""} /></div>
                    <div><Label>Data Fim</Label><Input name="end_date" type="date" defaultValue={editingItem?.end_date || ""} /></div>
                  </div>

                  {/* Multi-BU with cost share */}
                  <div className="space-y-2">
                    <Label>Unidades de Negócio {selectedBUIds.length > 1 && "e Rateio (R$)"}</Label>
                    <div className="border rounded-md p-3 space-y-2 max-h-48 overflow-y-auto">
                      {businessUnits?.map(bu => {
                        const isSelected = selectedBUs[bu.id] !== undefined;
                        const showInput = isSelected && selectedBUIds.length > 1;
                        return (
                          <div key={bu.id} className="flex items-center gap-3">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleBU(bu.id)}
                            />
                            <span className="text-sm flex-1 truncate">{bu.name}</span>
                            {showInput && (
                              <Input
                                type="number"
                                min={0}
                                className="w-32 h-8 text-sm"
                                placeholder="R$ 0"
                                value={selectedBUs[bu.id] || ""}
                                onChange={(e) => updateBUCost(bu.id, Number(e.target.value) || 0)}
                              />
                            )}
                          </div>
                        );
                      })}
                      {(!businessUnits || businessUnits.length === 0) && (
                        <p className="text-xs text-muted-foreground text-center py-2">Nenhuma unidade de negócio cadastrada</p>
                      )}
                    </div>
                    {selectedBUIds.length === 1 && (
                      <p className="text-xs text-muted-foreground px-1">
                        100% do custo (R$ {estimatedCostInput.toLocaleString("pt-BR")}) será atribuído à unidade selecionada.
                      </p>
                    )}
                    {selectedBUIds.length > 1 && (
                      <div className="flex justify-between text-sm px-1">
                        <span className="text-muted-foreground">Total rateado:</span>
                        <span className={`font-medium ${totalRateadoBU !== estimatedCostInput ? "text-destructive" : ""}`}>
                          R$ {totalRateadoBU.toLocaleString("pt-BR")} de R$ {estimatedCostInput.toLocaleString("pt-BR")}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Multi-squad with cost share */}
                  <div className="space-y-2">
                    <Label>Squads e Rateio (R$)</Label>
                    <div className="border rounded-md p-3 space-y-2 max-h-48 overflow-y-auto">
                      {squads?.map(sq => {
                        const isSelected = selectedSquads[sq.id] !== undefined;
                        return (
                          <div key={sq.id} className="flex items-center gap-3">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleSquad(sq.id)}
                            />
                            <span className="text-sm flex-1 truncate">{sq.name}</span>
                            {isSelected && (
                              <Input
                                type="number"
                                min={0}
                                className="w-32 h-8 text-sm"
                                placeholder="R$ 0"
                                value={selectedSquads[sq.id] || ""}
                                onChange={(e) => updateSquadCost(sq.id, Number(e.target.value) || 0)}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {Object.keys(selectedSquads).length > 0 && (
                      <div className="flex justify-between text-sm px-1">
                        <span className="text-muted-foreground">Total rateado:</span>
                        <span className="font-medium">R$ {totalRateado.toLocaleString("pt-BR")}</span>
                      </div>
                    )}
                  </div>

                  <Button type="submit" className="w-full">{editingItem ? "Atualizar Demanda" : "Salvar Demanda"}</Button>
                </form>
              </DialogContent>
            </Dialog>
            <ExportButtons
              onExportPDF={() => exportToPDF({ ...exportConfig, data: filteredItems as any })}
              onExportExcel={() => exportToExcel({ ...exportConfig, data: filteredItems as any })}
            />
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <KPICard
            title="Total Investido"
            value={`R$ ${(totalInvested / 1000).toFixed(0)}k`}
            subtitle="Custo estimado total"
            icon={DollarSign}
          />
          <KPICard
            title="Em Andamento"
            value={inProgress}
            subtitle="Demandas ativas"
            icon={Rocket}
          />
          <KPICard
            title="Concluídas"
            value={doneCount}
            subtitle={`de ${filteredItems.length} demandas`}
            icon={CheckCircle2}
          />
          <KPICard
            title="Entregue no Prazo"
            value={`${onTimeRate}%`}
            subtitle="Taxa de pontualidade"
            icon={AlertTriangle}
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <Select value={filterBU} onValueChange={setFilterBU}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Unidade de Negócio" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Unidades</SelectItem>
              {businessUnits?.map(bu => <SelectItem key={bu.id} value={bu.id}>{bu.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterSquad} onValueChange={setFilterSquad}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Squad" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Squads</SelectItem>
              {squads?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              {Object.entries(STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Categorias</SelectItem>
              {Object.entries(CATEGORY_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="timeline" className="space-y-4">
          <TabsList>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="business-units">Unidades de Negócio</TabsTrigger>
            <TabsTrigger value="squads">Squads</TabsTrigger>
            <TabsTrigger value="investment">Investimento</TabsTrigger>
            <TabsTrigger value="table">Tabela</TabsTrigger>
          </TabsList>

          {/* Timeline */}
          <TabsContent value="timeline">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Timeline de Demandas</CardTitle>
                <CardDescription>Visão temporal por trimestre — estilo Gantt</CardDescription>
              </CardHeader>
              <CardContent>
                {timelineData.items.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">Nenhuma demanda com datas definidas</p>
                ) : (
                  <div className="space-y-2 overflow-x-auto">
                    <div className="flex border-b pb-2 min-w-[800px]">
                      <div className="w-48 shrink-0 text-xs font-medium text-muted-foreground">Demanda</div>
                      <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${timelineData.quarters.length}, 1fr)` }}>
                        {timelineData.quarters.map(q => (
                          <div key={q} className="text-xs text-center font-medium text-muted-foreground">{q}</div>
                        ))}
                      </div>
                    </div>
                    {timelineData.items.map(item => {
                      const now = new Date();
                      const timeStart = startOfQuarter(addQuarters(now, -2));
                      const timeEnd = endOfQuarter(addQuarters(now, 4));
                      const totalDays = differenceInDays(timeEnd, timeStart);
                      const itemStart = parseISO(item.start_date!);
                      const itemEnd = parseISO(item.end_date!);
                      const left = Math.max(0, (differenceInDays(itemStart, timeStart) / totalDays) * 100);
                      const width = Math.min(100 - left, (differenceInDays(itemEnd, itemStart) / totalDays) * 100);
                      const statusColor = item.status === "done" ? "bg-green-500" : item.status === "in_progress" ? "bg-primary" : item.status === "cancelled" ? "bg-destructive" : "bg-muted-foreground/30";
                      return (
                        <div key={item.id} className="flex items-center min-w-[800px]">
                          <div className="w-48 shrink-0 text-xs truncate pr-2" title={item.title}>{item.title}</div>
                          <div className="flex-1 relative h-6">
                            <div
                              className={`absolute top-1 h-4 rounded-full ${statusColor} opacity-80`}
                              style={{ left: `${left}%`, width: `${Math.max(width, 1)}%` }}
                              title={`${format(itemStart, "dd/MM/yy")} — ${format(itemEnd, "dd/MM/yy")}`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Business Units */}
          <TabsContent value="business-units">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {buData.map(bu => (
                <Card key={bu.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{bu.name}</CardTitle>
                    {bu.description && <CardDescription className="text-xs">{bu.description}</CardDescription>}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Demandas</span>
                      <span className="font-medium">{bu.total}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Concluídas</span>
                      <span className="font-medium">{bu.done} ({bu.pct}%)</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Investimento</span>
                      <span className="font-medium">R$ {(bu.cost / 1000).toFixed(0)}k</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Horas Investidas</span>
                      <span className="font-medium">{bu.hours}h</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${bu.pct}%` }} />
                    </div>
                  </CardContent>
                </Card>
              ))}
              {buData.length === 0 && (
                <p className="text-muted-foreground text-sm col-span-full text-center py-8">Nenhuma unidade de negócio cadastrada</p>
              )}
            </div>
          </TabsContent>

          {/* Squads */}
          <TabsContent value="squads" className="space-y-4">
            {/* Investment summary cards per squad */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-medium text-foreground">Resumo de Investimento por Squad</h3>
              </div>
              {squadData.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">Nenhuma demanda atribuída a squads</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {squadData
                    .slice()
                    .sort((a, b) => b.cost - a.cost)
                    .map((sq) => {
                      const totalAll = squadData.reduce((s, x) => s + x.cost, 0);
                      const pct = totalAll > 0 ? Math.round((sq.cost / totalAll) * 100) : 0;
                      return (
                        <Card key={sq.name}>
                          <CardContent className="p-4 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-medium text-foreground truncate" title={sq.name}>{sq.name}</p>
                              <Badge variant="secondary" className="text-xs shrink-0">{pct}%</Badge>
                            </div>
                            <p className="text-2xl font-bold text-primary">
                              R$ {(sq.cost / 1000).toFixed(0)}k
                            </p>
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>{sq.total} demanda{sq.total === 1 ? "" : "s"}</span>
                              <span>R$ {sq.cost.toLocaleString("pt-BR")}</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-1.5">
                              <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                </div>
              )}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Alocação por Squad</CardTitle>
                <CardDescription>Investimento e carga de trabalho por squad (inclui rateio)</CardDescription>
              </CardHeader>
              <CardContent>
                {squadData.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">Nenhuma demanda atribuída a squads</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={squadData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                        formatter={(value: number, name: string) => {
                          if (name === "Investimento (R$)") return [`R$ ${value.toLocaleString("pt-BR")}`, name];
                          return [value, name];
                        }}
                      />
                      <Legend />
                      <Bar dataKey="total" name="Demandas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="cost" name="Investimento (R$)" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Investment */}
          <TabsContent value="investment">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Investimento por Categoria</CardTitle>
                  <CardDescription>Distribuição de custos estimados</CardDescription>
                </CardHeader>
                <CardContent>
                  {categoryData.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-8">Sem dados</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                          {categoryData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <RechartsTooltip formatter={(value: number) => `R$ ${value.toLocaleString("pt-BR")}`} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Investimento por Unidade de Negócio</CardTitle>
                </CardHeader>
                <CardContent>
                  {buData.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-8">Sem dados</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={buData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={120} stroke="hsl(var(--muted-foreground))" />
                        <RechartsTooltip formatter={(value: number) => `R$ ${value.toLocaleString("pt-BR")}`} />
                        <Bar dataKey="cost" name="Investimento (R$)" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Table */}
          <TabsContent value="table">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Demandas</CardTitle>
                <CardDescription>{filteredItems.length} demandas encontradas</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título</TableHead>
                      <TableHead>Unidade</TableHead>
                      <TableHead>Squads</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Prioridade</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-right">Custo (R$)</TableHead>
                      <TableHead>Período</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map(item => {
                      const status = STATUS_MAP[item.status] || { label: item.status, variant: "secondary" as const };
                      const priority = PRIORITY_MAP[item.priority] || { label: item.priority, color: "" };
                      const squadsForItem = getSquadsForItem(item.id, (item as any).squads?.name);
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium max-w-[200px] truncate">{item.title}</TableCell>
                          <TableCell className="text-sm">{(item as any).business_units?.name || "—"}</TableCell>
                          <TableCell>
                            {squadsForItem.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {squadsForItem.map((s, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs">
                                    {s.squad_name}
                                    {s.cost_share > 0 && (
                                      <span className="ml-1 text-muted-foreground">
                                        R${(s.cost_share / 1000).toFixed(0)}k
                                      </span>
                                    )}
                                  </Badge>
                                ))}
                              </div>
                            ) : "—"}
                          </TableCell>
                          <TableCell><Badge variant={status.variant}>{status.label}</Badge></TableCell>
                          <TableCell><Badge variant="outline" className={priority.color}>{priority.label}</Badge></TableCell>
                          <TableCell className="text-sm">{CATEGORY_MAP[item.category] || item.category}</TableCell>
                          <TableCell className="text-right text-sm">{(item.estimated_cost || 0).toLocaleString("pt-BR")}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {item.start_date && item.end_date
                              ? `${format(parseISO(item.start_date), "dd/MM/yy")} – ${format(parseISO(item.end_date), "dd/MM/yy")}`
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(item)} title="Editar">
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeletingItemId(item.id)} title="Excluir">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredItems.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground py-8">Nenhuma demanda encontrada</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Delete confirmation */}
        <AlertDialog open={!!deletingItemId} onOpenChange={(open) => { if (!open) setDeletingItemId(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir demanda?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. A demanda e seus rateios entre squads serão removidos permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteItem} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
};

export default Roadmap;
