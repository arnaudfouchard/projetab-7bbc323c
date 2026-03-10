import { api } from "@/lib/api";
import { logImportRun } from "@/lib/import-history";

const BATCH = 200;

export async function importFiness(
  onProgress?: (msg: string) => void
): Promise<{ imported: number; errors: number; headers: string[] }> {
  onProgress?.("Chargement du fichier FINESS…");
  const res = await fetch("/data/finess_light.csv");
  if (!res.ok) throw new Error(`Erreur chargement CSV: ${res.status}`);
  const csvText = await res.text();

  const lines = csvText.split("\n");
  onProgress?.(`${lines.length} lignes dans le CSV`);

  // Line 0 is metadata header (finess;etalab;…), data starts at line 1
  // All rows are "structureet" — no geolocalisation rows in this file
  const records: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(";");
    if (row[0] !== "structureet" || row.length < 20) continue;

    const finess_geo = row[1] || null;
    if (!finess_geo) continue;

    const catCode = row[18] || null;
    const categorie_libelle = row[19] || null;

    // Extract commune from ligneacheminement (format: "01440 VIRIAT" → "VIRIAT")
    const ligneAch = row[15] || "";
    const communeMatch = ligneAch.match(/^\d{5}\s+(.+)$/);
    const communeName = communeMatch ? communeMatch[1] : ligneAch;
    const codePostal = ligneAch.match(/^(\d{5})/)?.[1] || null;

    // Determine type_etab from category code
    const type_etab = categorize(catCode);

    records.push({
      finess_geo,
      finess_juridique: row[2] || null,
      nom: row[3] || row[4] || "Inconnu",
      type_etab,
      categorie_code: catCode,
      categorie_libelle,
      commune: communeName || null,
      code_commune: row[12] || null,
      code_departement: row[13] || null,
      departement: row[14] || null,
      statut_juridique: row[27] || null,
      adresse: [row[7], row[8], row[9]].filter(Boolean).join(" ") || null,
      code_postal: codePostal,
      telephone: row[16] || null,
    });
  }

  onProgress?.(`${records.length} établissements parsés, upsert en cours…`);

  let errors = 0;
  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH);
    try {
      await api.post("/upsert", {
        table: "etablissements",
        rows: batch,
        conflictColumn: "finess_geo",
      });
    } catch (error: any) {
      console.error(`Batch ${Math.floor(i / BATCH)} error:`, error.message);
      errors++;
    }
  }

  // Update data_sources meta
  await api.post("/data-sources/upsert", {
    id: "finess",
    name: "FINESS (sanitaire)",
    description: "Répertoire FINESS — périmètre sanitaire",
    record_count: records.length,
    status: errors === 0 ? "ok" : "stale",
    last_update: new Date().toISOString(),
    format: "CSV",
    source: "data.gouv.fr (fichier local)",
  });

  await logImportRun({
    sourceId: "finess",
    versionLabel: new Date().getFullYear().toString(),
    recordCount: records.length,
    errors,
  });

  return { imported: records.length, errors, headers: ["finess_geo", "nom", "type_etab", "commune", "departement"] };
}

// Categorize by FINESS category code
function categorize(catCode: string | null): string | null {
  if (!catCode) return null;
  const c = parseInt(catCode);
  if (isNaN(c)) return null;
  if ([101, 106].includes(c)) return "CHR/U";
  if ([114, 122, 131, 141, 292, 355, 365].includes(c)) return "CH";
  if ([128, 129, 297, 442].includes(c)) return "CHS/psy";
  if ([126, 127, 132, 133, 134, 135, 136, 137, 138, 160, 162].includes(c)) return "SMR";
  if ([354, 356, 362, 366].includes(c)) return "ESPIC";
  if ([110, 111, 112, 113, 120, 121, 123, 124, 130, 140, 142, 143, 150, 161, 163].includes(c)) return "Privé";
  if ([105].includes(c)) return "CLCC";
  if ([109].includes(c)) return "SSR privé";
  if ([125].includes(c)) return "HAD";
  if ([146, 147, 148, 228, 236, 237, 238].includes(c)) return "Dialyse/Radiothérapie";
  return "Autre sanitaire";
}
