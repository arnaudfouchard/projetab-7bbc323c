import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";

const BATCH = 200;

async function fetchAndParse(url: string): Promise<{ headers: string[]; rows: Record<string, any>[] }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Erreur chargement ${url}: ${res.status}`);
  const ab = await res.arrayBuffer();
  const wb = XLSX.read(ab, { type: "array" });

  // Try all sheets, pick the one with the most data
  // Also try skipping title rows (range) to find the real header
  let bestRows: Record<string, any>[] = [];
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];

    // Try with different header row offsets (0 = default, then skip 1..6 rows)
    for (let skip = 0; skip <= 6; skip++) {
      const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
      range.s.r = skip; // start from row `skip`
      const json: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, {
        defval: "",
        range,
      });
      if (json.length === 0) continue;

      const keys = Object.keys(json[0]);
      const emptyCount = keys.filter((k) => /^__EMPTY/.test(k) || k.trim() === "").length;
      const meaningfulRatio = 1 - emptyCount / keys.length;

      // Accept if most columns have meaningful names (>50%)
      if (meaningfulRatio > 0.5 && json.length > bestRows.length) {
        bestRows = json;
      }
    }
  }

  const headers = bestRows.length > 0 ? Object.keys(bestRows[0]) : [];
  return { headers, rows: bestRows };
}

function findCol(row: Record<string, any>, ...candidates: string[]): string | undefined {
  for (const c of candidates) {
    if (row[c] !== undefined && row[c] !== "") return c;
  }
  // Case-insensitive fallback
  const keys = Object.keys(row);
  for (const c of candidates) {
    const found = keys.find((k) => k.toLowerCase().trim() === c.toLowerCase().trim());
    if (found && row[found] !== undefined && row[found] !== "") return found;
  }
  return undefined;
}

export async function importAldNational(
  onProgress?: (msg: string) => void
): Promise<{ imported: number; errors: number; headers: string[] }> {
  onProgress?.("Chargement du fichier ALD national…");
  const { headers, rows } = await fetchAndParse("/data/ald-prevalentes.xls");
  onProgress?.(`${rows.length} lignes, colonnes: ${headers.join(", ")}`);

  // Detect year columns (2015, 2016, ... 2024)
  const yearCols = headers.filter((h) => /^(19|20)\d{2}$/.test(h.trim()));

  // Find ALD code + libelle columns
  const sampleRow = rows[0] || {};
  const codeCol = findCol(sampleRow, "ALD", "Code ALD", "code_ald", "Numéro ALD", "N° ALD", "ald", "Code");
  const libelleCol = findCol(sampleRow, "Libellé ALD", "Libellé", "libelle_ald", "Libellé de l'ALD", "libelle", "Pathologie", "Libellé de l\u2019ALD");
  const prevalenceCol = findCol(sampleRow, "Prévalence", "prevalence", "Taux", "Prévalence pour 100 000");

  if (!codeCol) {
    // Log headers for debugging
    console.warn("ALD National - colonnes disponibles:", headers);
    throw new Error(`Colonne code ALD introuvable. Colonnes: ${headers.join(", ")}`);
  }

  onProgress?.(`Code ALD: "${codeCol}", Libellé: "${libelleCol || "??"}", Années: ${yearCols.join(", ") || "aucune"}`);

  const records: Record<string, any>[] = [];

  for (const row of rows) {
    const codeAld = parseInt(String(row[codeCol]).trim());
    if (isNaN(codeAld)) continue;

    const libelle = libelleCol ? String(row[libelleCol]).trim() : null;

    if (yearCols.length > 0) {
      // Pivot: one record per year
      for (const yc of yearCols) {
        const val = String(row[yc]).replace(/\s/g, "").replace(",", ".");
        const effectif = parseInt(val) || null;
        if (effectif) {
          records.push({
            code_ald: codeAld,
            libelle_ald: libelle,
            annee: parseInt(yc),
            effectif,
            prevalence: null,
          });
        }
      }
    } else {
      // Simple format: one row per record
      const anneeCol = findCol(row, "Année", "annee", "Annee", "année");
      const effectifCol = findCol(row, "Effectif", "effectif", "Nombre", "Nb");
      const annee = anneeCol ? parseInt(String(row[anneeCol])) : 2024;
      const effectif = effectifCol ? parseInt(String(row[effectifCol]).replace(/\s/g, "")) : null;
      const prevalence = prevalenceCol ? parseFloat(String(row[prevalenceCol]).replace(",", ".")) : null;

      if (!isNaN(annee) && (effectif || prevalence)) {
        records.push({ code_ald: codeAld, libelle_ald: libelle, annee, effectif, prevalence });
      }
    }
  }

  onProgress?.(`${records.length} enregistrements à importer…`);

  // Clear existing data first
  await supabase.from("ald_national").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  let errors = 0;
  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH);
    const { error } = await supabase.from("ald_national").insert(batch as any);
    if (error) {
      console.error("ALD national batch error:", error.message);
      errors++;
    }
  }

  // Update data_sources
  await supabase.from("data_sources").upsert(
    {
      id: "ald_national",
      name: "ALD — Prévalence nationale",
      record_count: records.length,
      status: errors === 0 ? "ok" : "stale",
      last_update: new Date().toISOString(),
      format: "XLS",
      source: "CNAM / data.gouv.fr",
    } as any,
    { onConflict: "id" }
  );

  return { imported: records.length, errors, headers };
}

export async function importAldDepartement(
  onProgress?: (msg: string) => void
): Promise<{ imported: number; errors: number; headers: string[] }> {
  onProgress?.("Chargement du fichier ALD départemental…");
  const { headers, rows } = await fetchAndParse("/data/ald-prevalentes-departement.xls");
  onProgress?.(`${rows.length} lignes, colonnes: ${headers.slice(0, 5).join(", ")}…`);

  const sampleRow = rows[0] || {};
  const depCol = findCol(sampleRow, "Code département", "Département", "code_departement", "Dept", "dept", "DEP", "département");
  
  if (!depCol) {
    console.warn("ALD Dept - colonnes disponibles:", headers);
    throw new Error(`Colonne département introuvable. Colonnes: ${headers.join(", ")}`);
  }

  // Detect ALD columns: columns containing "(ALD" + number + ")"
  const aldColRegex = /\(ALD\s*(\d+)\)/i;
  const aldCols = headers
    .filter((h) => aldColRegex.test(h))
    .map((h) => ({ col: h, code: parseInt(h.match(aldColRegex)![1]) }));

  if (aldCols.length === 0) {
    // Fallback: try row-based format
    const codeAldCol = findCol(sampleRow, "ALD", "Code ALD", "code_ald", "Numéro ALD", "N° ALD", "ald");
    if (!codeAldCol) throw new Error(`Ni colonnes ALD pivotées ni colonne code ALD trouvées. Colonnes: ${headers.slice(0, 10).join(", ")}`);
    // row-based fallback (original logic)
    const libelleCol = findCol(sampleRow, "Libellé ALD", "Libellé", "libelle_ald", "Pathologie");
    const effectifCol = findCol(sampleRow, "Effectif", "effectif", "Nombre", "Nb", "Prévalents");
    const anneeCol = findCol(sampleRow, "Année", "annee", "Annee");
    const records: Record<string, any>[] = [];
    for (const row of rows) {
      const codeAld = parseInt(String(row[codeAldCol]).trim());
      const codeDep = String(row[depCol]).trim();
      if (isNaN(codeAld) || !codeDep) continue;
      records.push({
        code_departement: codeDep.padStart(2, "0"),
        code_ald: codeAld,
        libelle_ald: libelleCol ? String(row[libelleCol]).trim() : null,
        annee: anneeCol ? parseInt(String(row[anneeCol])) || 2024 : 2024,
        effectif: effectifCol ? parseInt(String(row[effectifCol]).replace(/\s/g, "")) || null : null,
      });
    }
    return await insertAldDept(records, headers, onProgress);
  }

  onProgress?.(`Format pivoté détecté: ${aldCols.length} ALD, dept col: "${depCol}"`);

  const records: Record<string, any>[] = [];
  for (const row of rows) {
    const codeDep = String(row[depCol]).trim();
    if (!codeDep || codeDep === "") continue;

    for (const { col, code } of aldCols) {
      const rawVal = String(row[col]).replace(/\s/g, "").replace(",", ".").replace("<", "");
      const effectif = parseInt(rawVal) || null;
      // Extract short ALD label from column name
      const libelle = col.replace(/\s*\(ALD\s*\d+\)\s*$/i, "").trim();
      records.push({
        code_departement: codeDep.padStart(2, "0"),
        code_ald: code,
        libelle_ald: libelle,
        annee: 2024,
        effectif,
      });
    }
  }

  return await insertAldDept(records, headers, onProgress);
}

async function insertAldDept(
  records: Record<string, any>[],
  headers: string[],
  onProgress?: (msg: string) => void
): Promise<{ imported: number; errors: number; headers: string[] }> {
  onProgress?.(`${records.length} enregistrements à importer…`);

  // Clear existing data
  await supabase.from("ald_departement").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  let errors = 0;
  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH);
    const { error } = await supabase.from("ald_departement").insert(batch as any);
    if (error) {
      console.error("ALD dept batch error:", error.message);
      errors++;
    }
  }

  // Update data_sources
  await supabase.from("data_sources").upsert(
    {
      id: "ald",
      name: "ALD — Prévalence par département",
      record_count: records.length,
      status: errors === 0 ? "ok" : "stale",
      last_update: new Date().toISOString(),
      format: "XLS",
      source: "CNAM / data.gouv.fr",
    } as any,
    { onConflict: "id" }
  );

  return { imported: records.length, errors, headers };
}
