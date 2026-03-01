import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FINESS_DATASET_ID = "finess-extraction-du-fichier-des-etablissements";

function categorize(catCode: string | null): string {
  if (!catCode) return "Autre";
  const c = parseInt(catCode);
  if (isNaN(c)) return "Autre";
  if ([101, 106].includes(c)) return "CHR/U";
  if ([114, 122, 131, 141, 292, 355, 365].includes(c)) return "CH";
  if ([128, 129, 297, 442].includes(c)) return "CHS/psy";
  if ([126, 127, 132, 133, 134, 135, 136, 137, 138, 160, 162].includes(c)) return "SMR";
  if ([354, 356, 362, 366].includes(c)) return "ESPIC";
  if ([110, 111, 112, 113, 120, 121, 123, 124, 130, 140, 142, 143, 150, 161, 163].includes(c)) return "Privé";
  return "Autre";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => ({}));
    const typeFilter: string[] | undefined = body.type_etab_filter;
    const limit = body.limit || 2000;

    // Get CSV resource URL from data.gouv.fr API
    console.log("Fetching FINESS dataset metadata…");
    const apiRes = await fetch(`https://www.data.gouv.fr/api/1/datasets/${FINESS_DATASET_ID}/`);
    if (!apiRes.ok) throw new Error(`data.gouv.fr API failed: ${apiRes.status}`);
    const dataset = await apiRes.json();

    const csvResources = (dataset.resources || []).filter(
      (r: any) => r.format?.toLowerCase() === "csv" && r.type === "main"
    );
    if (csvResources.length === 0) throw new Error("No CSV resource found");

    const geoResource =
      csvResources.find((r: any) =>
        (r.title || "").toLowerCase().includes("tablis")
      ) || csvResources[0];

    console.log(`Downloading: ${geoResource.title}`);
    const res = await fetch(geoResource.url);
    if (!res.ok) throw new Error(`CSV download failed: ${res.status}`);
    const csvText = await res.text();

    const lines = csvText.split("\n");
    console.log(`CSV: ${lines.length} lines`);

    // Log sample to understand structure
    if (lines.length > 2) {
      const sampleRow = lines[1].split(";");
      console.log(`Sample row cols: ${sampleRow.length}`);
      // Log each col with index for mapping
      for (let c = 0; c < Math.min(sampleRow.length, 35); c++) {
        console.log(`  [${c}] = "${sampleRow[c]?.substring(0, 40)}"`);
      }
    }

    // Parse — line 0 is metadata, data starts at line 1
    // Column mapping based on actual FINESS CSV format:
    // The format has "structureet" rows and "geolocalisation" rows for the same FINESS
    // We only want "structureet" rows
    const records: any[] = [];
    const geoData: Record<string, { lat: number; lon: number }> = {};

    // First pass: collect geolocalisation data
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(";");
      if (row[0] === "geolocalisation" && row.length >= 5) {
        const finess = row[1];
        const coordX = parseFloat(row[2]);
        const coordY = parseFloat(row[3]);
        if (finess && !isNaN(coordX) && !isNaN(coordY)) {
          geoData[finess] = { lat: coordX, lon: coordY };
        }
      }
    }
    console.log(`Found ${Object.keys(geoData).length} geolocation entries`);

    // Second pass: collect establishment data
    for (let i = 1; i < lines.length && records.length < limit; i++) {
      const row = lines[i].split(";");
      if (row[0] !== "structureet" || row.length < 20) continue;

      const finess_geo = row[1] || null;
      if (!finess_geo) continue;

      // Find category code — scan for a 3-digit number that could be category
      const catCode = row[18] || null;
      const type_etab = categorize(catCode);

      if (typeFilter && typeFilter.length > 0 && !typeFilter.includes(type_etab)) continue;

      const geo = geoData[finess_geo];

      records.push({
        finess_geo,
        finess_juridique: row[2] || null,
        nom: row[3] || row[4] || "Inconnu",
        type_etab,
        categorie_code: catCode,
        categorie_libelle: row[19] || null,
        commune: row[14] || null,      // libcommune or département name
        code_departement: row[13] || null,
        departement: row[14] || null,
        statut_juridique: row[27] || null,
        adresse: [row[7], row[8], row[9]].filter(Boolean).join(" ") || null,
        code_postal: row[12] || null,
        telephone: row[16] || null,
        latitude: geo?.lat || null,
        longitude: geo?.lon || null,
      });
    }

    console.log(`Parsed ${records.length} establishments`);

    // Upsert
    const BATCH = 200;
    let errors = 0;
    for (let i = 0; i < records.length; i += BATCH) {
      const batch = records.slice(i, i + BATCH);
      const { error } = await sb
        .from("etablissements")
        .upsert(batch, { onConflict: "finess_geo", ignoreDuplicates: false });
      if (error) {
        console.error(`Batch ${Math.floor(i / BATCH)} error:`, error.message);
        errors++;
      }
    }

    // Update data_sources meta
    await sb.from("data_sources").update({
      record_count: records.length,
      status: errors === 0 ? "ok" : "stale",
      last_update: new Date().toISOString(),
      data_date: geoResource.last_modified?.substring(0, 7) || "2026-01",
    }).eq("id", "finess");

    return new Response(
      JSON.stringify({ success: true, imported: records.length, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Import error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
