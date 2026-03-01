import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";

const BATCH = 200;

async function fetchAndParse(url: string): Promise<{ headers: string[]; rows: Record<string, any>[] }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Erreur chargement ${url}: ${res.status}`);
  const ab = await res.arrayBuffer();
  const wb = XLSX.read(ab, { type: "array" });

  let bestRows: Record<string, any>[] = [];
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    const json: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
    if (json.length > bestRows.length) bestRows = json;
  }

  const headers = bestRows.length > 0 ? Object.keys(bestRows[0]) : [];
  return { headers, rows: bestRows };
}

function findCol(row: Record<string, any>, ...candidates: string[]): string | undefined {
  for (const c of candidates) {
    if (row[c] !== undefined && row[c] !== "") return c;
  }
  const keys = Object.keys(row);
  for (const c of candidates) {
    const found = keys.find((k) => k.toLowerCase().trim() === c.toLowerCase().trim());
    if (found && row[found] !== undefined && row[found] !== "") return found;
  }
  return undefined;
}

export async function importGht(
  onProgress?: (msg: string) => void
): Promise<{ imported: number; errors: number; headers: string[] }> {
  onProgress?.("Chargement du fichier GHT…");
  const { headers, rows } = await fetchAndParse("/data/Liste_GHT_2024.xlsx");
  onProgress?.(`${rows.length} lignes, colonnes: ${headers.join(", ")}`);

  const sample = rows[0] || {};
  const codeCol = findCol(sample, "GHT_CODE", "Code GHT", "code_ght", "CODE_GHT", "Code");
  const nomCol = findCol(sample, "GHT_LIB", "GHT_LIBC", "Nom du GHT", "nom_ght", "NOM_GHT", "Nom", "Libellé", "Libellé GHT");
  const regionCol = findCol(sample, "ARS_LIB", "ARS_LIBC", "Région", "region", "REGION", "Libellé région");
  const codeRegionCol = findCol(sample, "ARS_CODE", "Code région", "code_region", "Code Région");
  const supportCol = findCol(sample, "GHT_SUPPORT", "ES_FINESS", "FINESS support", "finess_support", "Établissement support", "ES Support FINESS", "FINESS ES support", "Finess ES");

  if (!codeCol) throw new Error(`Colonne code GHT introuvable. Colonnes: ${headers.join(", ")}`);
  if (!nomCol) throw new Error(`Colonne nom GHT introuvable. Colonnes: ${headers.join(", ")}`);

  onProgress?.(`Code: "${codeCol}", Nom: "${nomCol}", Support: "${supportCol || "??"}"`);

  // The file has one row per ES member — deduplicate by GHT_CODE
  const ghtMap = new Map<string, { ght_code: string; ght_nom: string; region: string | null; code_region: string | null; nb_membres: number; etablissement_support_finess: string | null }>();

  for (const row of rows) {
    const code = String(row[codeCol]).trim();
    const nom = String(row[nomCol]).trim();
    if (!code || !nom) continue;

    const existing = ghtMap.get(code);
    if (existing) {
      existing.nb_membres++;
      // Keep the support FINESS from the row flagged as support
      if (supportCol && String(row[supportCol]).trim() === "O") {
        // Find the ES_FINESS column for the support establishment
        const esFiness = findCol(row, "ES_FINESS", "FINESS");
        if (esFiness) existing.etablissement_support_finess = String(row[esFiness]).trim() || existing.etablissement_support_finess;
      }
    } else {
      const esFiness = findCol(row, "ES_FINESS", "FINESS");
      ghtMap.set(code, {
        ght_code: code,
        ght_nom: nom,
        region: regionCol ? String(row[regionCol]).trim() || null : null,
        code_region: codeRegionCol ? String(row[codeRegionCol]).trim() || null : null,
        nb_membres: 1,
        etablissement_support_finess: supportCol && String(row[supportCol]).trim() === "O" && esFiness
          ? String(row[esFiness]).trim() || null
          : null,
      });
    }
  }

  const records = Array.from(ghtMap.values());
  onProgress?.(`${records.length} GHT dédupliqués à importer…`);

  await supabase.from("ghts").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  let errors = 0;
  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH);
    const { error } = await supabase.from("ghts").insert(batch as any);
    if (error) { console.error("GHT batch error:", error.message); errors++; }
  }

  await supabase.from("data_sources").upsert(
    { id: "ght", name: "GHT", record_count: records.length, status: errors === 0 ? "ok" : "stale", last_update: new Date().toISOString(), format: "XLSX", source: "DGOS" } as any,
    { onConflict: "id" }
  );

  return { imported: records.length, errors, headers };
}

export async function importHpr(
  onProgress?: (msg: string) => void
): Promise<{ imported: number; errors: number; headers: string[] }> {
  onProgress?.("Chargement du fichier HPR…");
  const { headers, rows } = await fetchAndParse("/data/Liste_HPR_2024.xlsx");
  onProgress?.(`${rows.length} lignes, colonnes: ${headers.join(", ")}`);

  const sample = rows[0] || {};
  const finessCol = findCol(sample, "N° FINESS ET", "FINESS ET", "finess_geo", "FINESS_GEO", "N° FINESS", "FINESS", "Finess ET", "Finess");
  const nomCol = findCol(sample, "Raison sociale ET", "Raison sociale", "RS", "Nom", "Raison Sociale");

  if (!finessCol) throw new Error(`Colonne FINESS introuvable. Colonnes: ${headers.join(", ")}`);

  onProgress?.(`FINESS: "${finessCol}", Nom: "${nomCol || "??"}"`);

  let updated = 0;
  let errors = 0;

  for (const row of rows) {
    const finess = String(row[finessCol]).trim();
    if (!finess) continue;

    const nom = nomCol ? String(row[nomCol]).trim() : null;

    // Update existing etablissement to mark as HPR
    const { error } = await supabase
      .from("etablissements")
      .update({ is_hopital_proximite: true } as any)
      .eq("finess_geo", finess);

    if (error) {
      // If not found, try inserting
      const { error: insertErr } = await supabase
        .from("etablissements")
        .upsert({ finess_geo: finess, nom: nom || "Inconnu", is_hopital_proximite: true } as any, { onConflict: "finess_geo" });
      if (insertErr) { console.error("HPR error:", insertErr.message); errors++; }
    }
    updated++;
  }

  await supabase.from("data_sources").upsert(
    { id: "hpr", name: "Hôpitaux de proximité", description: "Liste des hôpitaux de proximité", record_count: updated, status: errors === 0 ? "ok" : "stale", last_update: new Date().toISOString(), format: "XLSX", source: "DGOS" } as any,
    { onConflict: "id" }
  );

  return { imported: updated, errors, headers };
}
