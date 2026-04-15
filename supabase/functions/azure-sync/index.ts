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

    let areaPaths: string[] = config.area_paths || ["Backoffice"];
    let syncAllIterations = false;
    try {
      const body = await req.json();
      if (body.areaPaths && Array.isArray(body.areaPaths)) {
        areaPaths = body.areaPaths;
      } else if (body.areaPath) {
        areaPaths = [body.areaPath];
      }
      if (body.syncAllIterations === true) {
        syncAllIterations = true;
      }
    } catch { /* use config defaults for cron calls */ }

    const azureHeaders = {
      "Content-Type": "application/json",
      Authorization: `Basic ${btoa(`:${pat}`)}`,
    };

    const results: SyncResult[] = [];

    for (const areaPath of areaPaths) {
      try {
        if (syncAllIterations) {
          // Historical mode: sync all 2026 iterations for this area path in chunks of 5
          const azureBase = `https://dev.azure.com/${organization}/${project}`;
          const allIterations = await findAllIterations2026(azureBase, azureHeaders);
          console.log(`[${areaPath}] Historical sync: found ${allIterations.length} iterations for 2026`);
          const CHUNK_SIZE = 5;
          for (let c = 0; c < allIterations.length; c += CHUNK_SIZE) {
            const chunk = allIterations.slice(c, c + CHUNK_SIZE);
            console.log(`[${areaPath}] Processing chunk ${Math.floor(c / CHUNK_SIZE) + 1}/${Math.ceil(allIterations.length / CHUNK_SIZE)} (iterations ${c + 1}-${Math.min(c + CHUNK_SIZE, allIterations.length)})`);
            // Process chunk iterations concurrently
            const chunkResults = await Promise.allSettled(
              chunk.map(async (iter) => {
                try {
                  return await syncAreaPath(supabase, organization, project, areaPath, azureHeaders, iter);
                } catch (err) {
                  console.error(`[${areaPath}] Error syncing iteration ${iter.name}:`, err);
                  return { areaPath, synced: 0, error: `${iter.name}: ${String(err)}` } as SyncResult;
                }
              })
            );
            for (const r of chunkResults) {
              results.push(r.status === "fulfilled" ? r.value : { areaPath, synced: 0, error: String((r as any).reason) });
            }
          }
        } else {
          const result = await syncAreaPath(supabase, organization, project, areaPath, azureHeaders);
          results.push(result);
        }
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
  azureHeaders: Record<string, string>,
  specificIteration?: IterationInfo
): Promise<SyncResult> {
  const teamAzureBase = `https://dev.azure.com/${organization}/${project}/${encodeURIComponent(areaPath)}`;
  const azureBase = `https://dev.azure.com/${organization}/${project}`;

  let currentIteration: IterationInfo | null = specificIteration || null;
  let useProjectLevel = !!specificIteration;

  if (!specificIteration) {
    // 1. Fetch current iteration — try team-level first, then project-level fallback
    currentIteration = await fetchCurrentIteration(teamAzureBase, azureHeaders);

    if (!currentIteration) {
      console.log(`[${areaPath}] Team-level iteration failed, trying project-level fallback`);
      currentIteration = await fetchCurrentIteration(azureBase, azureHeaders);
      useProjectLevel = true;
    }

    // If still no current iteration (or stale), try Classification Nodes API
    if (!currentIteration || !isIterationCurrent(currentIteration)) {
      console.log(`[${areaPath}] Trying Classification Nodes API fallback`);
      const cnIteration = await findIterationByClassificationNodes(azureBase, azureHeaders);
      if (cnIteration) {
        currentIteration = cnIteration;
        useProjectLevel = true;
      }
    }
  }
  console.log(`[${areaPath}] Current iteration:`, JSON.stringify(currentIteration));

  // 2. WIQL query — use explicit iteration path when available (avoids @CurrentIteration issues with project-level API)
  let iterationFilter: string;
  if (currentIteration?.path) {
    iterationFilter = `[System.IterationPath] = '${currentIteration.path}'`;
  } else {
    iterationFilter = `[System.IterationPath] = @CurrentIteration`;
  }

  const wiqlQuery = `SELECT [System.Id] FROM WorkItems WHERE [System.AreaPath] UNDER '${project}\\\\${areaPath}' AND ${iterationFilter} AND [System.State] <> 'Removed' ORDER BY [System.ChangedDate] DESC`;

  // For closed sprints, use asOf to get items as they were at sprint end date
  // This captures items that were later moved to another sprint (spillover)
  const todayCheck = new Date().toISOString().split("T")[0];
  const sprintEndDate = currentIteration?.endDate?.split("T")[0];
  const isClosedSprint = sprintEndDate && sprintEndDate < todayCheck;
  const wiqlBody: any = { query: wiqlQuery };
  if (isClosedSprint && sprintEndDate) {
    // asOf must be a full ISO datetime — use end of day on sprint end date
    wiqlBody.asOf = `${sprintEndDate}T23:59:59Z`;
    console.log(`[${areaPath}] Using asOf=${wiqlBody.asOf} for closed sprint ${currentIteration?.name}`);
  }

  // Try WIQL with team base first, fallback to project base
  let wiqlData: any = null;
  const wiqlBases = useProjectLevel ? [azureBase] : [teamAzureBase, azureBase];

  for (const base of wiqlBases) {
    const wiqlRes = await fetch(`${base}/_apis/wit/wiql?api-version=7.0`, {
      method: "POST",
      headers: azureHeaders,
      body: JSON.stringify(wiqlBody),
    });

    if (wiqlRes.ok) {
      wiqlData = await wiqlRes.json();
      break;
    } else {
      const errText = await wiqlRes.text();
      console.warn(`[${areaPath}] WIQL failed on ${base}: ${wiqlRes.status} ${errText}`);
    }
  }

  if (!wiqlData) {
    return { areaPath, synced: 0, error: `WIQL failed on all endpoints` };
  }

  const workItemIds = (wiqlData.workItems || []).map((wi: any) => wi.id).slice(0, 200);

  if (workItemIds.length === 0) {
    return { areaPath, synced: 0, sprint: currentIteration?.name || "unknown" };
  }

  const workItems = await fetchWorkItemDetails(azureBase, azureHeaders, workItemIds);
  return await syncToDatabase(supabase, workItems, organization, project, areaPath, currentIteration, azureHeaders);
}

async function fetchCurrentIteration(baseUrl: string, headers: Record<string, string>): Promise<IterationInfo | null> {
  try {
    const url = `${baseUrl}/_apis/work/teamsettings/iterations?$timeframe=current&api-version=7.0`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      console.warn("Failed to fetch iteration from", baseUrl, ":", res.status);
      return null;
    }
    const data = await res.json();
    const iterations = data.value || [];
    if (iterations.length === 0) return null;

    const iter = iterations[0];
    const result: IterationInfo = {
      name: iter.name,
      path: iter.path,
      startDate: iter.attributes?.startDate || null,
      endDate: iter.attributes?.finishDate || null,
    };

    // Check if the returned iteration actually covers today
    const today = new Date().toISOString().split("T")[0];
    const iterStart = result.startDate?.split("T")[0] || "";
    const iterEnd = result.endDate?.split("T")[0] || "";

    if (iterStart && iterEnd && (today < iterStart || today > iterEnd)) {
      console.warn(`[fetchCurrentIteration] Returned iteration "${result.name}" (${iterStart} to ${iterEnd}) does not cover today (${today}). Searching all iterations by date...`);
      const found = await findIterationByDate(baseUrl, headers, today);
      if (found) return found;
    }

    return result;
  } catch (err) {
    console.error("Error fetching iteration:", err);
    return null;
  }
}

async function findIterationByDate(baseUrl: string, headers: Record<string, string>, today: string): Promise<IterationInfo | null> {
  try {
    const url = `${baseUrl}/_apis/work/teamsettings/iterations?api-version=7.0`;
    const res = await fetch(url, { headers });
    if (!res.ok) return null;
    const data = await res.json();
    const iterations = data.value || [];

    for (const iter of iterations) {
      const start = iter.attributes?.startDate?.split("T")[0];
      const end = iter.attributes?.finishDate?.split("T")[0];
      if (start && end && start <= today && today <= end) {
        console.log(`[findIterationByDate] Found matching iteration: ${iter.name} (${start} to ${end})`);
        return {
          name: iter.name,
          path: iter.path,
          startDate: iter.attributes.startDate,
          endDate: iter.attributes.finishDate,
        };
      }
    }
    console.warn(`[findIterationByDate] No iteration covers today (${today}) among ${iterations.length} iterations`);
    return null;
  } catch (err) {
    console.error("[findIterationByDate] Error:", err);
    return null;
  }
}

function isIterationCurrent(iter: IterationInfo): boolean {
  const today = new Date().toISOString().split("T")[0];
  const start = iter.startDate?.split("T")[0] || "";
  const end = iter.endDate?.split("T")[0] || "";
  if (!start || !end) return false;
  return start <= today && today <= end;
}

async function findIterationByClassificationNodes(azureBase: string, headers: Record<string, string>): Promise<IterationInfo | null> {
  try {
    const url = `${azureBase}/_apis/wit/classificationnodes/Iterations?$depth=10&api-version=7.0`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      console.warn(`[classificationNodes] Failed: ${res.status}`);
      return null;
    }
    const data = await res.json();
    const today = new Date().toISOString().split("T")[0];
    const found = findNodeByDate(data, today);
    if (found) {
      console.log(`[classificationNodes] Found matching iteration: ${found.name} (${found.startDate} to ${found.endDate})`);
    } else {
      console.warn(`[classificationNodes] No iteration covers today (${today})`);
    }
    return found;
  } catch (err) {
    console.error("[classificationNodes] Error:", err);
    return null;
  }
}

function findNodeByDate(node: any, today: string): IterationInfo | null {
  if (node.attributes) {
    const start = node.attributes.startDate?.split("T")[0];
    const end = node.attributes.finishDate?.split("T")[0];
    if (start && end && start <= today && today <= end) {
      const rawPath = node.path || "";
      const cleanPath = rawPath.replace(/\\Iteration\\/, "\\").replace(/\\Iteration$/, "").replace(/^\\/, "");
      return {
        name: node.name,
        path: cleanPath || node.name,
        startDate: node.attributes.startDate,
        endDate: node.attributes.finishDate,
      };
    }
  }
  if (node.children) {
    for (const child of node.children) {
      const found = findNodeByDate(child, today);
      if (found) return found;
    }
  }
  return null;
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

async function syncToDatabase(supabase: any, workItems: AzureWorkItem[], org: string, project: string, areaPath: string, currentIteration: IterationInfo | null, azureHeaders: Record<string, string>): Promise<SyncResult> {
  const squadName = areaPath.trim();

  // Case-insensitive lookup to avoid duplicate squads
  let squadId: string;
  const { data: existingSquad } = await supabase
    .from("squads")
    .select("id, name")
    .ilike("name", squadName)
    .maybeSingle();

  if (existingSquad) {
    squadId = existingSquad.id;
    // Update description/azure_team_id if needed
    await supabase.from("squads").update({ description: `Area Path: ${project}\\${areaPath}`, azure_team_id: areaPath }).eq("id", squadId);
  } else {
    const { data: newSquad } = await supabase.from("squads").insert({ name: squadName, description: `Area Path: ${project}\\${areaPath}`, azure_team_id: areaPath }).select().single();
    squadId = newSquad.id;
  }

  // Use the iteration path from the iteration object (correct for closed sprints with asOf)
  // Fallback to first work item's path only if iteration object doesn't have it
  const iterPath = currentIteration?.path || 
    (workItems.length > 0 ? workItems[0].fields["System.IterationPath"] : null) || 
    "Unknown";
  // NOTE: Stale sprint cleanup removed to preserve historical data

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
  const sprintName = currentIteration?.name || iterPath.split("\\").pop() || iterPath;

  const todayStr = new Date().toISOString().split("T")[0];
  const isClosed = endDate < todayStr;

  let { data: sprint } = await supabase.from("sprints").select("id, end_date").eq("azure_iteration_path", iterPath).eq("squad_id", squadId).single();

  if (!sprint) {
    const { data: newSprint } = await supabase.from("sprints").insert({
      name: sprintName,
      squad_id: squadId,
      azure_iteration_path: iterPath,
      start_date: startDate,
      end_date: endDate,
      is_closed: isClosed,
    }).select().single();
    sprint = newSprint;
  } else {
    await supabase.from("sprints").update({ start_date: startDate, end_date: endDate, name: sprintName, is_closed: isClosed }).eq("id", sprint.id);
  }

  if (!sprint) {
    return { areaPath, synced: 0, error: "Falha ao criar sprint" };
  }

  await supabase.from("work_items").delete().eq("sprint_id", sprint.id);

  // --- Resolve assigned users ---
  const userMap = new Map<string, string>(); // uniqueName (lowercase) → user.id
  const uniqueAssignees = new Map<string, { displayName: string; uniqueName: string }>();
  for (const wi of workItems) {
    const assignedTo = wi.fields["System.AssignedTo"];
    if (assignedTo?.uniqueName) {
      const key = assignedTo.uniqueName.toLowerCase();
      if (!uniqueAssignees.has(key)) {
        uniqueAssignees.set(key, { displayName: assignedTo.displayName || assignedTo.uniqueName, uniqueName: assignedTo.uniqueName });
      }
    }
  }

  for (const [key, person] of uniqueAssignees) {
    try {
      // Try to find existing user by azure_devops_unique_name (case-insensitive)
      const { data: existing } = await supabase
        .from("users")
        .select("id")
        .ilike("azure_devops_unique_name", person.uniqueName)
        .maybeSingle();

      if (existing) {
        userMap.set(key, existing.id);
      } else {
        const { data: newUser } = await supabase
          .from("users")
          .insert({ name: person.displayName, email: person.uniqueName, azure_devops_unique_name: person.uniqueName })
          .select("id")
          .single();
        if (newUser) userMap.set(key, newUser.id);
      }
    } catch (err) {
      console.warn(`Failed to upsert user ${person.uniqueName}:`, err);
    }
  }
  console.log(`[${areaPath}] Resolved ${userMap.size} unique assignees`);

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

    // Extract parent_id from hierarchy relations
    let parentId: number | null = null;
    if (wi.relations && Array.isArray(wi.relations)) {
      const parentRel = wi.relations.find((r: any) => r.rel === "System.LinkTypes.Hierarchy-Reverse");
      if (parentRel?.url) {
        const match = parentRel.url.match(/\/workItems\/(\d+)$/);
        if (match) parentId = parseInt(match[1], 10);
      }
    }

    // Detect spillover: item's current IterationPath differs from the sprint being synced
    const itemIterPath = wi.fields["System.IterationPath"] || "";
    const sprintIterPath = iterPath;
    const isSpillover = itemIterPath !== sprintIterPath;

    // Resolve assigned user
    const assignedTo = wi.fields["System.AssignedTo"];
    const assignedKey = assignedTo?.uniqueName?.toLowerCase();
    const assignedToUserId = assignedKey ? (userMap.get(assignedKey) || null) : null;

    const areaPath = wi.fields["System.AreaPath"] || null;

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
      is_spillover: isSpillover,
      parent_id: parentId,
      assigned_to_user_id: assignedToUserId,
      area_path: areaPath,
    });
    totalSynced++;
  }

  // --- Populate sprint_progress_daily for today (skip if sprint already ended) ---
  const todayRaw = new Date().toISOString().split("T")[0];
  const sprintEndStr = sprint.end_date;

  if (todayRaw <= sprintEndStr) {
    const chartTypes = ["Task", "Issue", "Bug", "Speed"];
    const chartItems = workItems.filter(wi => chartTypes.includes(wi.fields["System.WorkItemType"] || ""));
    const todayRemaining = chartItems.reduce((s, wi) => s + (wi.fields["Microsoft.VSTS.Scheduling.RemainingWork"] || 0), 0);
    const todayCompleted = chartItems.reduce((s, wi) => s + (wi.fields["Microsoft.VSTS.Scheduling.CompletedWork"] || 0), 0);
    const todayScope = chartItems.reduce((s, wi) => s + (wi.fields["Microsoft.VSTS.Scheduling.OriginalEstimate"] || 0), 0);

    const { data: existingProgress } = await supabase
      .from("sprint_progress_daily")
      .select("id")
      .eq("sprint_id", sprint.id)
      .eq("date", todayRaw)
      .single();

    const progressPayload = {
      sprint_id: sprint.id,
      date: todayRaw,
      remaining_points: todayRemaining,
      completed_points: todayCompleted,
      total_scope_points: todayScope,
    };

    if (existingProgress) {
      await supabase.from("sprint_progress_daily").update(progressPayload).eq("id", existingProgress.id);
    } else {
      await supabase.from("sprint_progress_daily").insert(progressPayload);
    }
    console.log(`[${areaPath}] sprint_progress_daily updated for ${todayRaw}: remaining=${todayRemaining}, completed=${todayCompleted}, scope=${todayScope}`);
  } else {
    console.log(`[${areaPath}] Sprint ended on ${sprintEndStr}, skipping daily progress for ${todayRaw}`);
  }

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

  // --- Backfill historical daily data from Azure Analytics OData API ---
  await backfillDailyProgress(supabase, org, project, areaPath, iterPath, sprint.id, startDate, endDate, azureHeaders);

  return { areaPath, synced: totalSynced, sprint: sprintName, squad: squadName };
}

async function backfillDailyProgress(
  supabase: any,
  organization: string,
  project: string,
  areaPath: string,
  iterationPath: string,
  sprintId: string,
  startDate: string,
  endDate: string,
  headers: Record<string, string>
) {
  try {
    // Use today or endDate, whichever is earlier, as the upper bound for backfill
    const today = new Date().toISOString().split("T")[0];
    const upperDate = today < endDate ? today : endDate;

    const fullAreaPath = `${project}\\${areaPath}`;
    const filterClause = [
      `Iteration/IterationPath eq '${iterationPath}'`,
      `Area/AreaPath eq '${fullAreaPath}'`,
      `DateValue ge ${startDate}Z`,
      `DateValue le ${upperDate}Z`,
      `(WorkItemType eq 'Task' or WorkItemType eq 'Bug' or WorkItemType eq 'Issue' or WorkItemType eq 'Speed')`,
    ].join(" and ");

    const applyClause = `filter(${filterClause})/groupby((DateValue),aggregate(RemainingWork with sum as TotalRemaining,CompletedWork with sum as TotalCompleted,OriginalEstimate with sum as TotalEstimate))`;

    const url = `https://analytics.dev.azure.com/${encodeURIComponent(organization)}/${encodeURIComponent(project)}/_odata/v3.0-preview/WorkItemSnapshot?$apply=${encodeURIComponent(applyClause)}&$orderby=DateValue asc`;

    console.log(`[backfill] Fetching OData for sprint ${sprintId}: ${startDate} to ${upperDate}`);
    const res = await fetch(url, { headers });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[backfill] OData API error ${res.status}: ${errText}`);
      return;
    }

    const data = await res.json();
    const rows = data.value || [];
    console.log(`[backfill] Got ${rows.length} daily snapshots from OData`);

    for (const row of rows) {
      const dateVal = (row.DateValue || "").split("T")[0];
      if (!dateVal) continue;

      const remaining = row.TotalRemaining ?? 0;
      const completed = row.TotalCompleted ?? 0;
      const scope = row.TotalEstimate ?? 0;

      const { data: existing } = await supabase
        .from("sprint_progress_daily")
        .select("id")
        .eq("sprint_id", sprintId)
        .eq("date", dateVal)
        .single();

      const payload = {
        sprint_id: sprintId,
        date: dateVal,
        remaining_points: remaining,
        completed_points: completed,
        total_scope_points: scope,
      };

      if (existing) {
        await supabase.from("sprint_progress_daily").update(payload).eq("id", existing.id);
      } else {
        await supabase.from("sprint_progress_daily").insert(payload);
      }
    }
    console.log(`[backfill] Done upserting ${rows.length} rows for sprint ${sprintId}`);
  } catch (err) {
    console.error("[backfill] Error:", err);
  }
}

async function findAllIterations2026(azureBase: string, headers: Record<string, string>): Promise<IterationInfo[]> {
  try {
    const url = `${azureBase}/_apis/wit/classificationnodes/Iterations?$depth=10&api-version=7.0`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      console.warn(`[findAllIterations2026] Failed: ${res.status}`);
      return [];
    }
    const data = await res.json();
    const results: IterationInfo[] = [];
    collectIterations2026(data, results);
    // Sort by start date
    results.sort((a, b) => (a.startDate || "").localeCompare(b.startDate || ""));
    console.log(`[findAllIterations2026] Found ${results.length} iterations for 2026`);
    return results;
  } catch (err) {
    console.error("[findAllIterations2026] Error:", err);
    return [];
  }
}

function collectIterations2026(node: any, results: IterationInfo[]): void {
  if (node.attributes?.startDate) {
    const name = node.name || "";
    const startYear = node.attributes.startDate?.split("-")[0];
    if (startYear === "2026" || name.includes("2026")) {
      const rawPath = node.path || "";
      const cleanPath = rawPath.replace(/\\Iteration\\/, "\\").replace(/\\Iteration$/, "").replace(/^\\/, "");
      results.push({
        name: node.name,
        path: cleanPath || node.name,
        startDate: node.attributes.startDate,
        endDate: node.attributes.finishDate || null,
      });
    }
  }
  if (node.children) {
    for (const child of node.children) {
      collectIterations2026(child, results);
    }
  }
}
