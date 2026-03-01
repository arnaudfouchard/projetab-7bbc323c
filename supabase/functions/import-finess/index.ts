import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FINESS_DATASET_ID = "finess-extraction-du-fichier-des-etablissements";

/**
 * FINESS CSV columns (no header row — line 1 is metadata):
 * structureet; nofinesset; nofinessej; rs; rslongue; complrs; compldistrib;
 * numvoie; typvoie; voie; compvoie; lieuditbp; codepostal; libcommune (13);
 * ligneacheminement; telephone; telecopie;
 * categetab(17); libcategetab; categagretab; libcategagretab;
 * siret; naf; mft; libmft; sph; libsph;
 * dateouv; dateautor; maj;
 * numdepartement(30); libdepartement; ...region fields follow
 */

// Column indices (0-based) from the FINESS structure
const COL = {
  type: 0,         // "structureet" or "geolocalisation"
  nofinesset: 1,
  nofinessej: 2,
  rs: 3,           // raison sociale (short name)
  rslongue: 4,     // full name
  numvoie: 7,
  typvoie: 8,
  voie: 9,
  compvoie: 10,
  codepostal: 12,
  libcommune: 13,
  telephone: 15,
  categetab: 17,
  libcategetab: 18,
  siret: 22,
  mft: 24,
  libmft: 25,
  sph: 26,
  libsph: 27,
  dateouv: 28,
  numdepartement: 30,
  libdepartement: 31,
};

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

    // Step 1: Get CSV resource URL from data.gouv.fr API
    console.log("Fetching FINESS dataset metadata…");
    const apiRes = await fetch(`https://www.data.gouv.fr/api/1/datasets/${FINESS_DATASET_ID}/`);
    if (!apiRes.ok) throw new Error(`data.gouv.fr API failed: ${apiRes.status}`);
    const dataset = await apiRes.json();

    const csvResources = (dataset.resources || []).filter(
      (r: any) => r.format?.toLowerCase() === "csv" && r.type === "main"
    );
    if (csvResources.length === 0) throw new Error("No CSV resource found");

    // Pick geoloc file or first CSV
    const geoResource =
      csvResources.find((r: any) =>
        (r.title || "").toLowerCase().includes("geoloc") ||
        (r.title || "").toLowerCase().includes("établissement")
      ) || csvResources[0];

    console.log(`Downloading: ${geoResource.title}`);
    const res = await fetch(geoResource.url);
    if (!res.ok) throw new Error(`CSV download failed: ${res.status}`);
    const csvText = await res.text();

    const lines = csvText.split("\n");
    console.log(`CSV: ${lines.length} lines`);

    // Parse — skip first line (metadata), no header row
    const records: any[] = [];
    for (let i = 1; i < lines.length && records.length < limit; i++) {
      const row = lines[i].split(";").map((c) => c.trim());
      if (row.length < 20) continue;

      // Only process "structureet" rows (establishment records)
      if (row[COL.type] !== "structureet") continue;

      const finess_geo = row[COL.nofinesset] || null;
      if (!finess_geo) continue;

      const catCode = row[COL.categetab] || null;
      const type_etab = categorize(catCode);

      // Apply filter
      if (typeFilter && typeFilter.length > 0 && !typeFilter.includes(type_etab)) continue;

      records.push({
        finess_geo,
        finess_juridique: row[COL.nofinessej] || null,
        nom: row[COL.rs] || row[COL.rslongue] || "Inconnu",
        type_etab,
        categorie_code: catCode,
        categorie_libelle: row[COL.libcategetab] || null,
        commune: row[COL.libcommune] || null,
        code_commune: null,
        departement: row[COL.libdepartement] || null,
        code_departement: row[COL.numdepartement] || null,
        statut_juridique: row[COL.libsph] || null,
        adresse: [row[COL.numvoie], row[COL.typvoie], row[COL.voie]].filter(Boolean).join(" ") || null,
        code_postal: row[COL.codepostal] || null,
        telephone: row[COL.telephone] || null,
      });
    }

    console.log(`Parsed ${records.length} establishments`);

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
