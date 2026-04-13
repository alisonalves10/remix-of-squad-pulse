import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AreaNode {
  id: number;
  name: string;
  path: string;
  hasChildren: boolean;
  children?: AreaNode[];
}

interface TeamInfo {
  id: string;
  name: string;
  description: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate user auth
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load azure config
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: configs, error: configError } = await supabase
      .from("azure_config")
      .select("*")
      .limit(1);

    if (configError || !configs || configs.length === 0) {
      return new Response(JSON.stringify({ error: "Azure DevOps não configurado." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const config = configs[0];
    const { organization, project, pat_encrypted: pat } = config;

    if (!pat) {
      return new Response(JSON.stringify({ error: "PAT não configurado." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const azureHeaders = {
      "Content-Type": "application/json",
      Authorization: `Basic ${btoa(`:${pat}`)}`,
    };

    // Fetch area paths and teams in parallel
    const [areaPaths, teams] = await Promise.all([
      fetchAreaPaths(organization, project, azureHeaders),
      fetchTeams(organization, project, azureHeaders),
    ]);

    return new Response(JSON.stringify({ areaPaths, teams }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("azure-list-areas error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function flattenAreas(node: any, projectName: string): string[] {
  const results: string[] = [];
  // Skip the root project node itself
  if (node.path && node.path !== `\\${projectName}\\Area`) {
    // Extract relative path: remove leading "\ProjectName\Area\" prefix
    const prefix = `\\${projectName}\\Area\\`;
    if (node.path.startsWith(prefix)) {
      results.push(node.path.substring(prefix.length));
    }
  }
  if (node.children) {
    for (const child of node.children) {
      results.push(...flattenAreas(child, projectName));
    }
  }
  return results;
}

async function fetchAreaPaths(org: string, project: string, headers: Record<string, string>): Promise<string[]> {
  try {
    const url = `https://dev.azure.com/${encodeURIComponent(org)}/${encodeURIComponent(project)}/_apis/wit/classificationnodes/Areas?$depth=10&api-version=7.0`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      console.error("Failed to fetch area paths:", res.status, await res.text());
      return [];
    }
    const data = await res.json();
    return flattenAreas(data, project);
  } catch (err) {
    console.error("Error fetching area paths:", err);
    return [];
  }
}

async function fetchTeams(org: string, project: string, headers: Record<string, string>): Promise<TeamInfo[]> {
  try {
    const url = `https://dev.azure.com/${encodeURIComponent(org)}/${encodeURIComponent(project)}/_apis/teams?api-version=7.0`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      console.error("Failed to fetch teams:", res.status, await res.text());
      return [];
    }
    const data = await res.json();
    return (data.value || []).map((t: any) => ({
      id: t.id,
      name: t.name,
      description: t.description || "",
    }));
  } catch (err) {
    console.error("Error fetching teams:", err);
    return [];
  }
}
