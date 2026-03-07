import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Run the audit function
    const { data: auditResult, error: auditError } = await supabase.rpc(
      "audit_data_linkages"
    );

    if (auditError) {
      throw new Error(`Audit function error: ${auditError.message}`);
    }

    // Get recent import history
    const { data: history, error: histError } = await supabase
      .from("import_history")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(20);

    if (histError) {
      console.error("Import history fetch error:", histError.message);
    }

    // Get data_sources status
    const { data: sources, error: srcError } = await supabase
      .from("data_sources")
      .select("*")
      .order("name");

    if (srcError) {
      console.error("Data sources fetch error:", srcError.message);
    }

    // Get linkage overrides count
    const { count: overridesCount } = await supabase
      .from("linkage_overrides")
      .select("*", { count: "exact", head: true });

    // Store audit in import_history
    await supabase.from("import_history").insert({
      source_id: "_audit",
      version_label: new Date().toISOString().slice(0, 10),
      audit_report: auditResult,
      status: "success",
      completed_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        audit: auditResult,
        import_history: history || [],
        data_sources: sources || [],
        linkage_overrides_count: overridesCount || 0,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
