import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// data.gouv.fr tabular API for population municipale dataset
const TABULAR_API = "https://tabular-api.data.gouv.fr/api/resources/be303501-5c46-48a1-87b4-3d198423ff49/data/";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json().catch(() => ({}));
    const maxPages = body.max_pages || 200; // ~35k communes, 200 rows/page → ~175 pages

    let page = 1;
    let totalInserted = 0;
    let hasMore = true;
    let errors = 0;

    console.log("Starting population import from tabular API…");

    while (hasMore && page <= maxPages) {
      const url = `${TABULAR_API}?page=${page}&page_size=200`;
      const res = await fetch(url);
      if (!res.ok) {
        console.error(`Tabular API error page ${page}: ${res.status}`);
        errors++;
        break;
      }

      const data = await res.json();
      const rows = data.data || [];

      if (rows.length === 0) {
        hasMore = false;
        break;
      }

      // Map to our table structure
      const records = rows
        .filter((r: any) => r.codgeo && r.libgeo)
        .map((r: any) => ({
          code_commune: r.codgeo,
          nom_commune: r.libgeo,
          code_departement: r.dep || null,
          code_region: r.reg || null,
          // Use the most recent population available (p23_pop for 2023 census)
          population: r.p23_pop ?? r.p22_pop ?? r.p21_pop ?? r.p20_pop ?? null,
          annee_recensement: r.p23_pop ? 2023 : r.p22_pop ? 2022 : r.p21_pop ? 2021 : r.p20_pop ? 2020 : null,
        }));

      if (records.length > 0) {
        const { error } = await sb
          .from("population_communes")
          .upsert(records, { onConflict: "code_commune", ignoreDuplicates: false });
        if (error) {
          console.error(`Page ${page} upsert error:`, error.message);
          errors++;
        } else {
          totalInserted += records.length;
        }
      }

      hasMore = !!data.links?.next;
      page++;

      // Log progress every 20 pages
      if (page % 20 === 0) {
        console.log(`Progress: page ${page}, ${totalInserted} communes inserted`);
      }
    }

    console.log(`Population import complete: ${totalInserted} communes, ${errors} errors`);

    // Update data_sources
    await sb.from("data_sources").update({
      record_count: totalInserted,
      status: errors === 0 ? "ok" : "stale",
      last_update: new Date().toISOString(),
      data_date: "2023",
    }).eq("id", "insee");

    return new Response(
      JSON.stringify({ success: true, imported: totalInserted, pages: page - 1, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Population import error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
