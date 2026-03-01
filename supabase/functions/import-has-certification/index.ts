import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const URLS = {
  demarches: "https://www.data.gouv.fr/api/1/datasets/r/57effa0f-dcb1-4193-afcb-1ba458b21baf",
  chapitres: "https://www.data.gouv.fr/api/1/datasets/r/5e7886c8-d423-4754-a65f-35fe4c1b51ce",
  finess_geo: "https://www.data.gouv.fr/api/1/datasets/r/9094bd87-203d-44a4-8d2b-0113d2261ea2",
  finess_jur: "https://www.data.gouv.fr/api/1/datasets/r/dd4aad2c-5ca6-48bf-bfad-d436623ac096",
};

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  // Handle quoted CSV headers
  const headers = lines[0].split(",").map(h => h.replace(/^"|"$/g, "").trim());
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(",").map(v => v.replace(/^"|"$/g, "").trim());
    const row: Record<string, string> = {};
    headers.forEach((h, j) => { row[h] = vals[j] || ""; });
    rows.push(row);
  }
  return rows;
}

function parseDate(str: string): string | null {
  if (!str) return null;
  // Format DD/MM/YYYY → YYYY-MM-DD
  const m = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Download all 4 CSVs in parallel
    console.log("Downloading HAS certification CSVs…");
    const [demRes, chapRes, geoRes, jurRes] = await Promise.all([
      fetch(URLS.demarches),
      fetch(URLS.chapitres),
      fetch(URLS.finess_geo),
      fetch(URLS.finess_jur),
    ]);

    if (!demRes.ok || !chapRes.ok || !geoRes.ok || !jurRes.ok) {
      throw new Error("Failed to download one or more HAS CSV files");
    }

    const [demText, chapText, geoText, jurText] = await Promise.all([
      demRes.text(), chapRes.text(), geoRes.text(), jurRes.text(),
    ]);

    // 2. Parse CSVs
    const demarches = parseCSV(demText);
    const chapitres = parseCSV(chapText);
    const finessGeo = parseCSV(geoText);
    const finessJur = parseCSV(jurText);

    console.log(`Parsed: ${demarches.length} démarches, ${chapitres.length} chapitres, ${finessGeo.length} finess_geo, ${finessJur.length} finess_jur`);

    // 3. Build lookup maps
    // Chapitres: group by code_demarche → {score_patient, score_equipes, score_etablissement}
    const scoresMap: Record<string, { patient?: number; equipes?: number; etab?: number }> = {};
    for (const c of chapitres) {
      const code = c.code_demarche;
      if (!scoresMap[code]) scoresMap[code] = {};
      const score = parseFloat(c.moy_chapitre);
      if (isNaN(score)) continue;
      const chapId = parseInt(c.id_chapitre);
      if (chapId === 1) scoresMap[code].patient = score;
      else if (chapId === 2) scoresMap[code].equipes = score;
      else if (chapId === 3) scoresMap[code].etab = score;
    }

    // FINESS juridique: code_demarche → FINESS_EJ
    const jurMap: Record<string, string> = {};
    for (const j of finessJur) {
      jurMap[j.code_demarche] = j.FINESS_EJ;
    }

    // FINESS geo: code_demarche + FINESS_EJ → [{FINESS_EG, RS_eg, Site_Principal}]
    // We want one record per FINESS_EG
    const geoEntries: { code: string; finess_eg: string; finess_ej: string; nom: string; principal: boolean }[] = [];
    for (const g of finessGeo) {
      geoEntries.push({
        code: g.code_demarche,
        finess_eg: g.FINESS_EG,
        finess_ej: g.FINESS_EJ,
        nom: g.RS_eg || "",
        principal: g.Site_Principal === "True",
      });
    }

    // Demarches: code_demarche → decision info
    const demMap: Record<string, { decision: string; annee: number; date_visite: string | null; date_decision: string | null }> = {};
    for (const d of demarches) {
      demMap[d.code_demarche] = {
        decision: d.Decision_de_la_CCES || "",
        annee: parseInt(d.annee_visite) || 0,
        date_visite: parseDate(d.date_deb_visite),
        date_decision: parseDate(d.date_de_decision),
      };
    }

    // 4. Build denormalized records: one per FINESS_EG per code_demarche
    const records: any[] = [];
    for (const geo of geoEntries) {
      const dem = demMap[geo.code];
      if (!dem) continue;
      const scores = scoresMap[geo.code] || {};

      records.push({
        finess_geo: geo.finess_eg,
        finess_juridique: geo.finess_ej,
        code_demarche: parseInt(geo.code),
        nom_etablissement: geo.nom,
        decision: dem.decision,
        annee_visite: dem.annee,
        date_visite: dem.date_visite,
        date_decision: dem.date_decision,
        site_principal: geo.principal,
        score_patient: scores.patient ?? null,
        score_equipes: scores.equipes ?? null,
        score_etablissement: scores.etab ?? null,
      });
    }

    console.log(`Built ${records.length} certification records`);

    // 5. Upsert in batches
    const BATCH = 200;
    let errors = 0;
    for (let i = 0; i < records.length; i += BATCH) {
      const batch = records.slice(i, i + BATCH);
      const { error } = await sb
        .from("certification_has")
        .upsert(batch, { onConflict: "finess_geo,code_demarche", ignoreDuplicates: false });
      if (error) {
        console.error(`Batch ${Math.floor(i / BATCH)} error:`, error.message);
        errors++;
      }
    }

    // 6. Update data_sources
    await sb.from("data_sources").update({
      record_count: records.length,
      status: errors === 0 ? "ok" : "stale",
      last_update: new Date().toISOString(),
      data_date: "2025",
    }).eq("id", "certification_has");

    return new Response(
      JSON.stringify({ success: true, imported: records.length, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("HAS import error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
