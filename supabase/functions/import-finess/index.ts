import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// FINESS open data CSV from data.gouv.fr (géolocalisation file — main file with all establishments)
const FINESS_CSV_URL =
  "https://www.data.gouv.fr/fr/datasets/r/2ce43ade-8d2c-4d1d-81da-571c12c1f5a8";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => ({}));
    const typeFilter = body.type_etab_filter; // optional: ["CHR/U", "CH", "CHS/psy", ...]
    const limit = body.limit || 500;

    // Fetch CSV
    console.log("Fetching FINESS CSV…");
    const res = await fetch(FINESS_CSV_URL);
    if (!res.ok) throw new Error(`FINESS download failed: ${res.status}`);
    const csvText = await res.text();

    // Parse CSV (semicolon-separated)
    const lines = csvText.split("\n");
    const headers = lines[0].split(";").map((h) => h.trim().replace(/"/g, ""));
    console.log(`CSV: ${lines.length} lines, ${headers.length} columns`);

    // Map columns — FINESS géolocalisation columns
    const col = (name: string) => headers.indexOf(name);
    const getVal = (row: string[], colName: string) => {
      const idx = col(colName);
      return idx >= 0 ? row[idx]?.replace(/"/g, "").trim() || null : null;
    };

    const records: any[] = [];
    for (let i = 1; i < lines.length && records.length < limit; i++) {
      const row = lines[i].split(";").map((c) => c.trim());
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
        code_commune: getVal(row, "commune") || getVal(row, "codepostal"),
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
    let inserted = 0;
    let updated = 0;
    const BATCH = 200;
    for (let i = 0; i < records.length; i += BATCH) {
      const batch = records.slice(i, i + BATCH);
      const { error, count } = await sb
        .from("etablissements")
        .upsert(batch, { onConflict: "finess_geo", ignoreDuplicates: false })
        .select("id");

      if (error) {
        console.error(`Batch ${i / BATCH} error:`, error.message);
      } else {
        inserted += batch.length;
      }
    }

    // Update data_sources meta
    await sb.from("data_sources").update({
      record_count: records.length,
      status: "ok",
      last_update: new Date().toISOString(),
    }).eq("id", "finess");

    return new Response(
      JSON.stringify({ success: true, imported: records.length }),
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
