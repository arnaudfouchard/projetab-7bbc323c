import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// data.gouv.fr dataset ID for FINESS
const FINESS_DATASET_ID = "finess-extraction-du-fichier-des-etablissements";

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

    // Step 1: Get CSV resource URL from data.gouv.fr API
    console.log("Fetching FINESS dataset metadata from data.gouv.fr API…");
    const apiRes = await fetch(
      `https://www.data.gouv.fr/api/1/datasets/${FINESS_DATASET_ID}/`
    );
    if (!apiRes.ok) throw new Error(`data.gouv.fr API failed: ${apiRes.status}`);
    const dataset = await apiRes.json();

    // Find the CSV resource for geolocalisation (the one with "geolocalisation" or the largest CSV)
    const csvResources = (dataset.resources || []).filter(
      (r: any) => r.format?.toLowerCase() === "csv" && r.type === "main"
    );

    if (csvResources.length === 0) {
      throw new Error("No CSV resource found in FINESS dataset");
    }

    // Pick the geo file preferably, or the first CSV
    const geoResource =
      csvResources.find((r: any) =>
        r.title?.toLowerCase().includes("geolocalisation") ||
        r.url?.toLowerCase().includes("geolocalisation")
      ) || csvResources[0];

    const csvUrl = geoResource.url;
    console.log(`Downloading CSV from: ${csvUrl}`);

    // Step 2: Fetch CSV
    const res = await fetch(csvUrl);
    if (!res.ok) throw new Error(`FINESS CSV download failed: ${res.status}`);
    const csvText = await res.text();

    // Parse CSV (semicolon-separated)
    const lines = csvText.split("\n");
    const rawHeaders = lines[0].split(";").map((h) => h.trim().replace(/"/g, "").toLowerCase());
    console.log(`CSV: ${lines.length} lines, ${rawHeaders.length} columns`);
    console.log("Headers:", rawHeaders.slice(0, 15).join(", "));

    const col = (name: string) => {
      // Try exact match first, then partial
      let idx = rawHeaders.indexOf(name);
      if (idx >= 0) return idx;
      idx = rawHeaders.findIndex((h) => h.includes(name));
      return idx;
    };

    const getVal = (row: string[], colName: string) => {
      const idx = col(colName);
      return idx >= 0 ? row[idx]?.replace(/^"|"$/g, "").trim() || null : null;
    };

    const records: any[] = [];
    for (let i = 1; i < lines.length && records.length < limit; i++) {
      const row = lines[i].split(";").map((c) => c.replace(/^"|"$/g, "").trim());
      if (row.length < 5) continue;

      const finess_geo = getVal(row, "nofinesset") || getVal(row, "nofiness");
      if (!finess_geo) continue;

      const catCode = getVal(row, "categetab") || getVal(row, "categorie");

      // Determine type_etab from category code
      let type_etab = "Autre";
      if (catCode) {
        const c = parseInt(catCode);
        if ([101, 106].includes(c)) type_etab = "CHR/U";
        else if ([114, 122, 131, 141, 292, 355, 365].includes(c)) type_etab = "CH";
        else if ([128, 129, 297, 442].includes(c)) type_etab = "CHS/psy";
        else if ([126, 127, 132, 133, 134, 135, 136, 137, 138, 160, 162].includes(c)) type_etab = "SMR";
        else if ([354, 356, 362, 366].includes(c)) type_etab = "ESPIC";
        else if ([110, 111, 112, 113, 120, 121, 123, 124, 130, 140, 142, 143, 150, 161, 163].includes(c)) type_etab = "Privé";
      }

      // Apply filter if provided
      if (typeFilter && typeFilter.length > 0 && !typeFilter.includes(type_etab)) continue;

      const record = {
        finess_geo,
        finess_juridique: getVal(row, "nofinessej") || getVal(row, "nofinessetej"),
        nom: getVal(row, "rs") || getVal(row, "rslongue") || "Inconnu",
        type_etab,
        categorie_code: catCode,
        categorie_libelle: getVal(row, "libcategetab") || getVal(row, "libcategorie"),
        commune: getVal(row, "libcommune") || getVal(row, "commune"),
        code_commune: getVal(row, "commune"),
        departement: getVal(row, "libdepartement"),
        code_departement: getVal(row, "departement") || getVal(row, "numdepartement"),
        region: null as string | null,
        code_region: getVal(row, "region"),
        statut_juridique: getVal(row, "libstatutjuridique") || getVal(row, "libsph"),
        adresse: [getVal(row, "numvoie"), getVal(row, "typvoie"), getVal(row, "voie")].filter(Boolean).join(" ") || null,
        code_postal: getVal(row, "codepostal") || getVal(row, "ligneacheminement"),
        latitude: parseFloat(getVal(row, "coordxet") || "") || null,
        longitude: parseFloat(getVal(row, "coordyet") || "") || null,
        telephone: getVal(row, "telephone"),
      };

      records.push(record);
    }

    console.log(`Parsed ${records.length} establishment records`);

    // Upsert in batches
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
      data_date: geoResource.last_modified?.substring(0, 7) || new Date().toISOString().substring(0, 7),
    }).eq("id", "finess");

    return new Response(
      JSON.stringify({
        success: true,
        imported: records.length,
        errors,
        csv_url: csvUrl,
        csv_resource_title: geoResource.title,
      }),
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
