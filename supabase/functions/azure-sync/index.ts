import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

interface AzureWorkItem {
  id: number;
  fields: Record<string, any>;
  relations?: Array<{ rel: string; url: string; attributes?: Record<string, any> }>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify user
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Use service role for DB operations
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get azure config
    const { data: configs, error: configError } = await supabase
      .from("azure_config")
      .select("*")
      .limit(1);

    if (configError || !configs || configs.length === 0) {
      return new Response(JSON.stringify({ error: "Azure DevOps não configurado. Vá em Configurações e salve sua organização, projeto e PAT." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const config = configs[0];
    const { organization, project, pat_encrypted: pat } = config;

    if (!pat) {
      return new Response(JSON.stringify({ error: "PAT não configurado." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request body for area path filter
    let areaPath = "Backoffice";
    try {
      const body = await req.json();
      if (body.areaPath) areaPath = body.areaPath;
    } catch {
      // Use default
    }

    const azureBase = `https://dev.azure.com/${organization}/${project}`;
    const azureHeaders = {
      "Content-Type": "application/json",
      Authorization: `Basic ${btoa(`:${pat}`)}`,
    };

    // 1. Get current iteration for the team
    const teamsRes = await fetch(`${azureBase}/_apis/teams?api-version=7.0`, { headers: azureHeaders });
    if (!teamsRes.ok) {
      const errText = await teamsRes.text();
      return new Response(JSON.stringify({ error: `Erro ao buscar teams: ${teamsRes.status} - ${errText}` }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const teamsData = await teamsRes.json();
    const teams = teamsData.value || [];

    // 2. WIQL to get work items for area path in current iteration
    const wiqlQuery = `SELECT [System.Id] FROM WorkItems WHERE [System.AreaPath] UNDER '${project}\\\\${areaPath}' AND [System.IterationPath] = @CurrentIteration('[${project}]\\\\${teams[0]?.name || project} Team') ORDER BY [System.Id]`;

    const wiqlRes = await fetch(`${azureBase}/_apis/wit/wiql?api-version=7.0`, {
      method: "POST",
      headers: azureHeaders,
      body: JSON.stringify({ query: wiqlQuery }),
    });

    if (!wiqlRes.ok) {
      // Try simpler query without @CurrentIteration
      const fallbackQuery = `SELECT [System.Id] FROM WorkItems WHERE [System.AreaPath] UNDER '${project}\\\\${areaPath}' AND [System.State] <> 'Removed' ORDER BY [System.ChangedDate] DESC`;
      const fallbackRes = await fetch(`${azureBase}/_apis/wit/wiql?api-version=7.0`, {
        method: "POST",
        headers: azureHeaders,
        body: JSON.stringify({ query: fallbackQuery }),
      });
      
      if (!fallbackRes.ok) {
        const errText = await fallbackRes.text();
        return new Response(JSON.stringify({ error: `Erro WIQL: ${fallbackRes.status} - ${errText}` }), {
          status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      const fallbackData = await fallbackRes.json();
      const workItemIds = (fallbackData.workItems || []).map((wi: any) => wi.id).slice(0, 200);
      
      if (workItemIds.length === 0) {
        return new Response(JSON.stringify({ message: "Nenhum work item encontrado para o area path informado.", synced: 0 }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch work item details
      const workItems = await fetchWorkItemDetails(azureBase, azureHeaders, workItemIds);
      const result = await syncToDatabase(supabase, workItems, organization, project, areaPath);

      return new Response(JSON.stringify(result), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const wiqlData = await wiqlRes.json();
    const workItemIds = (wiqlData.workItems || []).map((wi: any) => wi.id).slice(0, 200);

    if (workItemIds.length === 0) {
      return new Response(JSON.stringify({ message: "Nenhum work item encontrado na sprint corrente.", synced: 0 }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Fetch work item details in batches of 200
    const workItems = await fetchWorkItemDetails(azureBase, azureHeaders, workItemIds);

    // 4. Sync to database
    const result = await syncToDatabase(supabase, workItems, organization, project, areaPath);

    return new Response(JSON.stringify(result), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("azure-sync error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function fetchWorkItemDetails(azureBase: string, headers: Record<string, string>, ids: number[]): Promise<AzureWorkItem[]> {
  const allItems: AzureWorkItem[] = [];
  
  for (let i = 0; i < ids.length; i += 200) {
    const batch = ids.slice(i, i + 200);
    const idsParam = batch.join(",");
    const url = `${azureBase}/_apis/wit/workitems?ids=${idsParam}&$expand=relations&api-version=7.0`;
    const res = await fetch(url, { headers });
    if (res.ok) {
      const data = await res.json();
      allItems.push(...(data.value || []));
    }
  }
  
  return allItems;
}

async function syncToDatabase(supabase: any, workItems: AzureWorkItem[], org: string, project: string, areaPath: string) {
  // Upsert squad
  const squadName = areaPath;
  const { data: squadData } = await supabase
    .from("squads")
    .upsert({ name: squadName, description: `Area Path: ${project}\\${areaPath}`, azure_team_id: areaPath }, { onConflict: "name" })
    .select()
    .single();

  // If upsert by name doesn't work (no unique constraint), try to find or insert
  let squadId: string;
  if (squadData) {
    squadId = squadData.id;
  } else {
    const { data: existing } = await supabase.from("squads").select("id").eq("name", squadName).single();
    if (existing) {
      squadId = existing.id;
    } else {
      const { data: newSquad } = await supabase.from("squads").insert({ name: squadName, description: `Area Path: ${project}\\${areaPath}`, azure_team_id: areaPath }).select().single();
      squadId = newSquad.id;
    }
  }

  // Group by iteration path to create sprints
  const iterationMap = new Map<string, AzureWorkItem[]>();
  for (const wi of workItems) {
    const iterPath = wi.fields["System.IterationPath"] || "Unknown";
    if (!iterationMap.has(iterPath)) iterationMap.set(iterPath, []);
    iterationMap.get(iterPath)!.push(wi);
  }

  let totalSynced = 0;
  const sprintsSynced: string[] = [];

  for (const [iterPath, items] of iterationMap) {
    const sprintName = iterPath.split("\\").pop() || iterPath;

    // Check if sprint exists
    let { data: sprint } = await supabase.from("sprints").select("id").eq("azure_iteration_path", iterPath).eq("squad_id", squadId).single();

    if (!sprint) {
      // Try to get iteration dates from Azure
      const today = new Date();
      const { data: newSprint } = await supabase.from("sprints").insert({
        name: sprintName,
        squad_id: squadId,
        azure_iteration_path: iterPath,
        start_date: today.toISOString().split("T")[0],
        end_date: new Date(today.getTime() + 14 * 86400000).toISOString().split("T")[0],
        is_closed: false,
      }).select().single();
      sprint = newSprint;
    }

    if (!sprint) continue;

    // Upsert work items
    for (const wi of items) {
      const type = wi.fields["System.WorkItemType"] || "Task";
      const state = wi.fields["System.State"] || "New";
      const title = wi.fields["System.Title"] || `Work Item ${wi.id}`;
      const points = wi.fields["Microsoft.VSTS.Scheduling.StoryPoints"] || wi.fields["Microsoft.VSTS.Scheduling.Effort"] || 0;
      const assignedTo = wi.fields["System.AssignedTo"]?.uniqueName || null;
      const completedAt = state === "Done" || state === "Closed" ? (wi.fields["Microsoft.VSTS.Common.ClosedDate"] || null) : null;

      // Delete then insert (work_items.id is the Azure ID)
      await supabase.from("work_items").delete().eq("id", wi.id);
      await supabase.from("work_items").insert({
        id: wi.id,
        sprint_id: sprint.id,
        squad_id: squadId,
        type,
        title,
        state,
        story_points: points,
        completed_at: completedAt,
        is_spillover: false,
      });

      totalSynced++;
    }

    // Calculate metrics
    const planned = items.reduce((s, wi) => s + (wi.fields["Microsoft.VSTS.Scheduling.StoryPoints"] || 0), 0);
    const completed = items
      .filter(wi => ["Done", "Closed"].includes(wi.fields["System.State"]))
      .reduce((s, wi) => s + (wi.fields["Microsoft.VSTS.Scheduling.StoryPoints"] || 0), 0);
    const bugsCreated = items.filter(wi => wi.fields["System.WorkItemType"] === "Bug").length;
    const bugsResolved = items.filter(wi => wi.fields["System.WorkItemType"] === "Bug" && ["Done", "Closed"].includes(wi.fields["System.State"])).length;

    // Upsert metrics
    const { data: existingMetric } = await supabase.from("metrics_snapshot").select("id").eq("sprint_id", sprint.id).eq("squad_id", squadId).single();
    if (existingMetric) {
      await supabase.from("metrics_snapshot").update({
        planned_points: planned,
        completed_points: completed,
        bugs_created: bugsCreated,
        bugs_resolved: bugsResolved,
        items_planned: items.length,
        items_completed: items.filter(wi => ["Done", "Closed"].includes(wi.fields["System.State"])).length,
        calculated_at: new Date().toISOString(),
      }).eq("id", existingMetric.id);
    } else {
      await supabase.from("metrics_snapshot").insert({
        sprint_id: sprint.id,
        squad_id: squadId,
        planned_points: planned,
        completed_points: completed,
        bugs_created: bugsCreated,
        bugs_resolved: bugsResolved,
        items_planned: items.length,
        items_completed: items.filter(wi => ["Done", "Closed"].includes(wi.fields["System.State"])).length,
      });
    }

    sprintsSynced.push(sprintName);
  }

  return {
    message: "Sincronização concluída!",
    synced: totalSynced,
    sprints: sprintsSynced,
    squad: squadName,
  };
}
