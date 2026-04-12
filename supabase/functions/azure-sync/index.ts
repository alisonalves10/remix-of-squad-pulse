import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AzureWorkItem {
  id: number;
  fields: Record<string, any>;
  relations?: Array<{ rel: string; url: string; attributes?: Record<string, any> }>;
}

interface IterationInfo {
  name: string;
  path: string;
  startDate: string | null;
  endDate: string | null;
}

interface SyncResult {
  areaPath: string;
  synced: number;
  sprint?: string;
  squad?: string;
  error?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const token = authHeader.replace("Bearer ", "");
    const isCronCall = token === anonKey;

    if (!isCronCall) {
      // Validate user auth for manual calls
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userData, error: userError } = await userClient.auth.getUser();
      if (userError || !userData?.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: configs, error: configError } = await supabase
      .from("azure_config")
      .select("*")
      .limit(1);

    if (configError || !configs || configs.length === 0) {
      return new Response(JSON.stringify({ error: "Azure DevOps não configurado." }), {
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

    // Parse area paths from request body or fall back to azure_config
    let areaPaths: string[] = config.area_paths || ["Backoffice"];
    try {
      const body = await req.json();
      if (body.areaPaths && Array.isArray(body.areaPaths)) {
        areaPaths = body.areaPaths;
      } else if (body.areaPath) {
        areaPaths = [body.areaPath];
      }
    } catch { /* use config defaults for cron calls */ }

    const azureHeaders = {
      "Content-Type": "application/json",
      Authorization: `Basic ${btoa(`:${pat}`)}`,
    };

    const results: SyncResult[] = [];

    for (const areaPath of areaPaths) {
      try {
        const result = await syncAreaPath(supabase, organization, project, areaPath, azureHeaders);
        results.push(result);
      } catch (err) {
        console.error(`Error syncing area path ${areaPath}:`, err);
        results.push({ areaPath, synced: 0, error: String(err) });
      }
    }

    return new Response(JSON.stringify({ results }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("azure-sync error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function syncAreaPath(
  supabase: any,
  organization: string,
  project: string,
  areaPath: string,
  azureHeaders: Record<string, string>
): Promise<SyncResult> {
  const teamAzureBase = `https://dev.azure.com/${organization}/${project}/${encodeURIComponent(areaPath)}`;
  const azureBase = `https://dev.azure.com/${organization}/${project}`;

  // 1. Fetch current iteration
  const currentIteration = await fetchCurrentIteration(teamAzureBase, azureHeaders);
  console.log(`[${areaPath}] Current iteration:`, JSON.stringify(currentIteration));

  // 2. WIQL query
  const wiqlQuery = `SELECT [System.Id] FROM WorkItems WHERE [System.AreaPath] UNDER '${project}\\\\${areaPath}' AND [System.IterationPath] = @CurrentIteration AND [System.State] <> 'Removed' ORDER BY [System.ChangedDate] DESC`;

  const wiqlRes = await fetch(`${teamAzureBase}/_apis/wit/wiql?api-version=7.0`, {
    method: "POST",
    headers: azureHeaders,
    body: JSON.stringify({ query: wiqlQuery }),
  });

  if (!wiqlRes.ok) {
    const errText = await wiqlRes.text();
    return { areaPath, synced: 0, error: `WIQL ${wiqlRes.status}: ${errText}` };
  }

  const wiqlData = await wiqlRes.json();
  const workItemIds = (wiqlData.workItems || []).map((wi: any) => wi.id).slice(0, 200);

  if (workItemIds.length === 0) {
    return { areaPath, synced: 0, sprint: currentIteration?.name || "unknown" };
  }

  const workItems = await fetchWorkItemDetails(azureBase, azureHeaders, workItemIds);
  return await syncToDatabase(supabase, workItems, organization, project, areaPath, currentIteration);
}

async function fetchCurrentIteration(teamAzureBase: string, headers: Record<string, string>): Promise<IterationInfo | null> {
  try {
    const url = `${teamAzureBase}/_apis/work/teamsettings/iterations?$timeframe=current&api-version=7.0`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      console.error("Failed to fetch current iteration:", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    const iterations = data.value || [];
    if (iterations.length === 0) return null;

    const iter = iterations[0];
    return {
      name: iter.name,
      path: iter.path,
      startDate: iter.attributes?.startDate || null,
      endDate: iter.attributes?.finishDate || null,
    };
  } catch (err) {
    console.error("Error fetching current iteration:", err);
    return null;
  }
}

async function fetchWorkItemDetails(azureBase: string, headers: Record<string, string>, ids: number[]): Promise<AzureWorkItem[]> {
  const allItems: AzureWorkItem[] = [];
  for (let i = 0; i < ids.length; i += 200) {
    const batch = ids.slice(i, i + 200);
    const url = `${azureBase}/_apis/wit/workitems?ids=${batch.join(",")}&$expand=relations&api-version=7.0`;
    const res = await fetch(url, { headers });
    if (res.ok) {
      const data = await res.json();
      allItems.push(...(data.value || []));
    }
  }
  return allItems;
}

async function syncToDatabase(supabase: any, workItems: AzureWorkItem[], org: string, project: string, areaPath: string, currentIteration: IterationInfo | null): Promise<SyncResult> {
  const squadName = areaPath;
  const { data: squadData } = await supabase
    .from("squads")
    .upsert({ name: squadName, description: `Area Path: ${project}\\${areaPath}`, azure_team_id: areaPath }, { onConflict: "name" })
    .select()
    .single();

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

  const currentIterPath = workItems.length > 0 ? workItems[0].fields["System.IterationPath"] : null;
  if (currentIterPath) {
    const { data: staleSprints } = await supabase
      .from("sprints")
      .select("id")
      .eq("squad_id", squadId)
      .neq("azure_iteration_path", currentIterPath);

    if (staleSprints && staleSprints.length > 0) {
      const staleIds = staleSprints.map((s: any) => s.id);
      for (const sid of staleIds) {
        await supabase.from("work_items").delete().eq("sprint_id", sid);
        await supabase.from("metrics_snapshot").delete().eq("sprint_id", sid);
        await supabase.from("sprint_progress_daily").delete().eq("sprint_id", sid);
      }
      for (const sid of staleIds) {
        await supabase.from("sprints").delete().eq("id", sid);
      }
      console.log(`[${areaPath}] Cleaned up ${staleIds.length} stale sprints`);
    }
  }

  let startDate: string;
  let endDate: string;
  if (currentIteration?.startDate) {
    startDate = currentIteration.startDate.split("T")[0];
    endDate = (currentIteration.endDate || currentIteration.startDate).split("T")[0];
  } else {
    const today = new Date();
    startDate = today.toISOString().split("T")[0];
    endDate = new Date(today.getTime() + 14 * 86400000).toISOString().split("T")[0];
  }

  const iterPath = currentIterPath || "Unknown";
  const sprintName = currentIteration?.name || iterPath.split("\\").pop() || iterPath;

  let { data: sprint } = await supabase.from("sprints").select("id").eq("azure_iteration_path", iterPath).eq("squad_id", squadId).single();

  if (!sprint) {
    const { data: newSprint } = await supabase.from("sprints").insert({
      name: sprintName,
      squad_id: squadId,
      azure_iteration_path: iterPath,
      start_date: startDate,
      end_date: endDate,
      is_closed: false,
    }).select().single();
    sprint = newSprint;
  } else {
    if (currentIteration?.startDate) {
      await supabase.from("sprints").update({ start_date: startDate, end_date: endDate, name: sprintName }).eq("id", sprint.id);
    }
  }

  if (!sprint) {
    return { areaPath, synced: 0, error: "Falha ao criar sprint" };
  }

  await supabase.from("work_items").delete().eq("sprint_id", sprint.id);

  let totalSynced = 0;
  for (const wi of workItems) {
    const type = wi.fields["System.WorkItemType"] || "Task";
    const state = wi.fields["System.State"] || "New";
    const title = wi.fields["System.Title"] || `Work Item ${wi.id}`;
    const points = wi.fields["Microsoft.VSTS.Scheduling.StoryPoints"] || wi.fields["Microsoft.VSTS.Scheduling.Effort"] || 0;
    const originalEstimate = wi.fields["Microsoft.VSTS.Scheduling.OriginalEstimate"] || 0;
    const remainingWork = wi.fields["Microsoft.VSTS.Scheduling.RemainingWork"] || 0;
    const completedWork = wi.fields["Microsoft.VSTS.Scheduling.CompletedWork"] || 0;
    const completedAt = state === "Done" || state === "Closed" ? (wi.fields["Microsoft.VSTS.Common.ClosedDate"] || null) : null;

    await supabase.from("work_items").insert({
      id: wi.id,
      sprint_id: sprint.id,
      squad_id: squadId,
      type, title, state,
      story_points: points,
      original_estimate: originalEstimate,
      remaining_work: remainingWork,
      completed_work: completedWork,
      completed_at: completedAt,
      is_spillover: false,
    });
    totalSynced++;
  }

  // --- Populate sprint_progress_daily for today ---
  const chartTypes = ["Task", "Issue", "Bug", "Speed"];
  const chartItems = workItems.filter(wi => chartTypes.includes(wi.fields["System.WorkItemType"] || ""));
  const todayRemaining = chartItems.reduce((s, wi) => s + (wi.fields["Microsoft.VSTS.Scheduling.RemainingWork"] || 0), 0);
  const todayCompleted = chartItems.reduce((s, wi) => s + (wi.fields["Microsoft.VSTS.Scheduling.CompletedWork"] || 0), 0);
  const todayScope = chartItems.reduce((s, wi) => s + (wi.fields["Microsoft.VSTS.Scheduling.OriginalEstimate"] || 0), 0);
  const todayStr = new Date().toISOString().split("T")[0];

  const { data: existingProgress } = await supabase
    .from("sprint_progress_daily")
    .select("id")
    .eq("sprint_id", sprint.id)
    .eq("date", todayStr)
    .single();

  const progressPayload = {
    sprint_id: sprint.id,
    date: todayStr,
    remaining_points: todayRemaining,
    completed_points: todayCompleted,
    total_scope_points: todayScope,
  };

  if (existingProgress) {
    await supabase.from("sprint_progress_daily").update(progressPayload).eq("id", existingProgress.id);
  } else {
    await supabase.from("sprint_progress_daily").insert(progressPayload);
  }
  console.log(`[${areaPath}] sprint_progress_daily updated for ${todayStr}: remaining=${todayRemaining}, completed=${todayCompleted}, scope=${todayScope}`);

  // --- Metrics snapshot ---
  const planned = workItems.reduce((s, wi) => s + (wi.fields["Microsoft.VSTS.Scheduling.StoryPoints"] || 0), 0);
  const completed = workItems.filter(wi => ["Done", "Closed"].includes(wi.fields["System.State"])).reduce((s, wi) => s + (wi.fields["Microsoft.VSTS.Scheduling.StoryPoints"] || 0), 0);
  const plannedHours = workItems.reduce((s, wi) => s + (wi.fields["Microsoft.VSTS.Scheduling.OriginalEstimate"] || 0), 0);
  const completedHours = workItems.reduce((s, wi) => s + (wi.fields["Microsoft.VSTS.Scheduling.CompletedWork"] || 0), 0);
  const bugsCreated = workItems.filter(wi => wi.fields["System.WorkItemType"] === "Bug").length;
  const bugsResolved = workItems.filter(wi => wi.fields["System.WorkItemType"] === "Bug" && ["Done", "Closed"].includes(wi.fields["System.State"])).length;

  const { data: existingMetric } = await supabase.from("metrics_snapshot").select("id").eq("sprint_id", sprint.id).eq("squad_id", squadId).single();
  const metricsPayload = {
    planned_points: planned,
    completed_points: completed,
    planned_hours: plannedHours,
    completed_hours: completedHours,
    bugs_created: bugsCreated,
    bugs_resolved: bugsResolved,
    items_planned: workItems.length,
    items_completed: workItems.filter(wi => ["Done", "Closed"].includes(wi.fields["System.State"])).length,
    calculated_at: new Date().toISOString(),
  };

  if (existingMetric) {
    await supabase.from("metrics_snapshot").update(metricsPayload).eq("id", existingMetric.id);
  } else {
    await supabase.from("metrics_snapshot").insert({ sprint_id: sprint.id, squad_id: squadId, ...metricsPayload });
  }

  return { areaPath, synced: totalSynced, sprint: sprintName, squad: squadName };
}
