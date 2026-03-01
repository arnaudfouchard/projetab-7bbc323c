import { useState, useCallback } from "react";
import { Upload, Loader2, FileSpreadsheet, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface ImportResult {
  table: string;
  count: number;
  errors: number;
}

type ImportProfile = {
  label: string;
  table: string;
  dataSourceId: string;
  mapRow: (row: Record<string, any>, headers: string[]) => Record<string, any> | null;
  conflictColumn?: string;
};

// ── GHT profile ──────────────────────────────────────────────────
const ghtProfile: ImportProfile = {
  label: "GHT (liste DGOS)",
  table: "ghts",
  dataSourceId: "ght",
  conflictColumn: "ght_code",
  mapRow: (row) => {
    // Try multiple possible column names
    const code = row["Code GHT"] || row["code_ght"] || row["CODE_GHT"] || row["Code"] || "";
    const nom = row["Nom du GHT"] || row["nom_ght"] || row["NOM_GHT"] || row["Nom"] || row["Libellé"] || "";
    const region = row["Région"] || row["region"] || row["REGION"] || row["Libellé région"] || null;
    const codeRegion = row["Code région"] || row["code_region"] || null;
    const nbMembres = parseInt(row["Nb membres"] || row["nb_membres"] || row["Nombre de membres"] || "0") || null;
    const support = row["FINESS support"] || row["finess_support"] || row["Établissement support"] || row["ES Support FINESS"] || null;

    if (!code || !nom) return null;

    return {
      ght_code: String(code).trim(),
      ght_nom: String(nom).trim(),
      region: region ? String(region).trim() : null,
      code_region: codeRegion ? String(codeRegion).trim() : null,
      nb_membres: nbMembres,
      etablissement_support_finess: support ? String(support).trim() : null,
    };
  },
};

// ── FINESS rapprochement profile ─────────────────────────────────
const finessRapprochementProfile: ImportProfile = {
  label: "Table FINESS / rapprochements",
  table: "etablissements",
  dataSourceId: "finess",
  conflictColumn: "finess_geo",
  mapRow: (row) => {
    const finess_geo = row["Finess Géographique"] || row["FINESS_GEO"] || row["finess_geo"] || row["Finess géographique"] || row["FINESS"] || "";
    if (!finess_geo) return null;

    const nom = row["Raison sociale"] || row["RS"] || row["Nom"] || row["nom"] || row["Raison Sociale"] || null;
    const finess_juridique = row["Finess Juridique"] || row["FINESS_JUR"] || row["finess_juridique"] || row["Finess juridique"] || null;
    const ght_code = row["Code GHT"] || row["GHT"] || row["code_ght"] || null;
    const ght_nom = row["Nom GHT"] || row["Libellé GHT"] || row["nom_ght"] || null;
    const type_etab = row["Type"] || row["type_etab"] || row["Catégorie"] || null;
    const commune = row["Commune"] || row["commune"] || null;
    const departement = row["Département"] || row["departement"] || null;
    const code_departement = row["Code département"] || row["code_departement"] || row["Dept"] || null;
    const region = row["Région"] || row["region"] || null;

    const record: Record<string, any> = {
      finess_geo: String(finess_geo).trim(),
    };

    // Only set non-null fields to avoid overwriting existing data
    if (nom) record.nom = String(nom).trim();
    else record.nom = "Inconnu"; // required field
    if (finess_juridique) record.finess_juridique = String(finess_juridique).trim();
    if (ght_code) record.ght_code = String(ght_code).trim();
    if (ght_nom) record.ght_nom = String(ght_nom).trim();
    if (type_etab) record.type_etab = String(type_etab).trim();
    if (commune) record.commune = String(commune).trim();
    if (departement) record.departement = String(departement).trim();
    if (code_departement) record.code_departement = String(code_departement).trim();
    if (region) record.region = String(region).trim();

    return record;
  },
};

// ── HPR (Hôpitaux de Proximité) profile ──────────────────────────
const hprProfile: ImportProfile = {
  label: "Hôpitaux de proximité (HPR)",
  table: "etablissements",
  dataSourceId: "hpr",
  conflictColumn: "finess_geo",
  mapRow: (row) => {
    const finess_geo = row["N° FINESS ET"] || row["FINESS ET"] || row["finess_geo"] || row["FINESS_GEO"] || row["N° FINESS"] || row["FINESS"] || "";
    if (!finess_geo) return null;

    const nom = row["Raison sociale ET"] || row["Raison sociale"] || row["RS"] || row["Nom"] || null;

    const record: Record<string, any> = {
      finess_geo: String(finess_geo).trim(),
      is_hopital_proximite: true,
    };

    if (nom) record.nom = String(nom).trim();
    else record.nom = "Inconnu";

    return record;
  },
};

// ── ALD national profile ─────────────────────────────────────────
const aldNationalProfile: ImportProfile = {
  label: "ALD nationales (série annuelle)",
  table: "ald_national",
  dataSourceId: "ald_national",
  conflictColumn: "code_ald,annee",
  mapRow: (row) => {
    // XLS files often have varying column names — try many variants
    const codeAld = parseInt(row["ALD"] || row["Code ALD"] || row["code_ald"] || row["Numéro ALD"] || "");
    if (isNaN(codeAld)) return null;

    const libelle = row["Libellé ALD"] || row["Libellé"] || row["libelle_ald"] || row["Libellé de l'ALD"] || null;

    // The file likely has one row per ALD with columns for each year
    // We need to pivot: detect year columns
    const records: Record<string, any>[] = [];
    for (const [key, val] of Object.entries(row)) {
      const yearMatch = key.match(/^(20\d{2})$/);
      if (yearMatch) {
        const effectif = parseInt(String(val).replace(/\s/g, "")) || null;
        if (effectif) {
          records.push({
            code_ald: codeAld,
            libelle_ald: libelle ? String(libelle).trim() : null,
            annee: parseInt(yearMatch[1]),
            effectif,
          });
        }
      }
    }

    // If no year columns found, try simple format
    if (records.length === 0) {
      const annee = parseInt(row["Année"] || row["annee"] || row["Annee"] || "");
      const effectif = parseInt(String(row["Effectif"] || row["effectif"] || row["Nombre"] || "").replace(/\s/g, "")) || null;
      if (!isNaN(annee) && effectif) {
        return { code_ald: codeAld, libelle_ald: libelle ? String(libelle).trim() : null, annee, effectif };
      }
      return null;
    }

    return records;
  },
};

// ── ALD département profile ──────────────────────────────────────
const aldDepartementProfile: ImportProfile = {
  label: "ALD par département (série annuelle)",
  table: "ald_departement",
  dataSourceId: "ald",
  conflictColumn: "code_departement,code_ald",
  mapRow: (row) => {
    const codeAld = parseInt(row["ALD"] || row["Code ALD"] || row["code_ald"] || row["Numéro ALD"] || "");
    const codeDep = row["Département"] || row["Code département"] || row["code_departement"] || row["Dept"] || "";
    if (isNaN(codeAld) || !codeDep) return null;

    const libelle = row["Libellé ALD"] || row["Libellé"] || row["libelle_ald"] || row["Libellé de l'ALD"] || null;
    const effectif = parseInt(String(row["Effectif"] || row["effectif"] || row["Nombre"] || row["Prévalence"] || "").replace(/\s/g, "")) || null;
    const annee = parseInt(row["Année"] || row["annee"] || row["Annee"] || "2024") || 2024;

    return {
      code_departement: String(codeDep).trim().padStart(2, "0"),
      code_ald: codeAld,
      libelle_ald: libelle ? String(libelle).trim() : null,
      annee,
      effectif,
    };
  },
};

const PROFILES: ImportProfile[] = [ghtProfile, finessRapprochementProfile, hprProfile, aldNationalProfile, aldDepartementProfile];

export function XlsxImportPanel({ onImportDone }: { onImportDone?: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [preview, setPreview] = useState<Record<string, any>[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<ImportProfile | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleFile = useCallback(async (f: File) => {
    setFile(f);
    setResult(null);
    setSelectedProfile(null);

    const ab = await f.arrayBuffer();
    const wb = XLSX.read(ab, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const json: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

    if (json.length === 0) {
      toast.error("Fichier vide");
      return;
    }

    const hdrs = Object.keys(json[0]);
    setHeaders(hdrs);
    setPreview(json.slice(0, 5));

    // Auto-detect profile
    const hdrLower = hdrs.map((h) => h.toLowerCase());
    const nameLower = f.name.toLowerCase();
    if (nameLower.includes("hpr") || nameLower.includes("proximité") || nameLower.includes("proximite")) {
      setSelectedProfile(hprProfile);
    } else if (nameLower.includes("ald") && nameLower.includes("departement")) {
      setSelectedProfile(aldDepartementProfile);
    } else if (nameLower.includes("ald")) {
      setSelectedProfile(aldNationalProfile);
    } else if (hdrLower.some((h) => h.includes("ght")) || nameLower.includes("ght")) {
      setSelectedProfile(ghtProfile);
    } else if (hdrLower.some((h) => h.includes("finess"))) {
      setSelectedProfile(finessRapprochementProfile);
    }
  }, []);

  const runImport = async () => {
    if (!file || !selectedProfile) return;
    setImporting(true);
    setResult(null);

    try {
      const ab = await file.arrayBuffer();
      const wb = XLSX.read(ab, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

      const rawMapped = json
        .map((row) => selectedProfile.mapRow(row, headers))
        .filter(Boolean);

      // Flatten in case mapRow returns arrays (pivot case like ALD national)
      const mapped = rawMapped.flatMap((r) => (Array.isArray(r) ? r : [r])) as Record<string, any>[];

      if (mapped.length === 0) {
        toast.error("Aucun enregistrement valide trouvé");
        setImporting(false);
        return;
      }

      toast.info(`Import de ${mapped.length} enregistrements dans ${selectedProfile.table}…`);

      const BATCH = 200;
      let errors = 0;
      for (let i = 0; i < mapped.length; i += BATCH) {
        const batch = mapped.slice(i, i + BATCH);
        const { error } = await supabase
          .from(selectedProfile.table as any)
          .upsert(batch as any, {
            onConflict: selectedProfile.conflictColumn || "id",
            ignoreDuplicates: false,
          });
        if (error) {
          console.error(`Batch error:`, error.message);
          errors++;
        }
      }

      // Update data_sources
      await supabase.from("data_sources").upsert(
        {
          id: selectedProfile.dataSourceId,
          name: selectedProfile.label,
          record_count: mapped.length,
          status: errors === 0 ? "ok" : "stale",
          last_update: new Date().toISOString(),
          format: "XLSX",
          source: "Upload manuel",
        } as any,
        { onConflict: "id" }
      );

      setResult({ table: selectedProfile.table, count: mapped.length, errors });
      toast.success(`${mapped.length} enregistrements importés (${errors} erreurs)`);
      onImportDone?.();
    } catch (err: any) {
      toast.error(`Erreur: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileSpreadsheet className="h-5 w-5 text-accent" />
          Import XLSX manuel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Drop zone */}
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 p-6 transition hover:border-accent">
          <Upload className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {file ? file.name : "Glisser un fichier XLSX ou cliquer"}
          </span>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </label>

        {/* Headers preview */}
        {headers.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Colonnes détectées : <span className="font-mono">{headers.join(", ")}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {preview.length} lignes affichées sur {file?.name}
            </p>

            {/* Profile selector */}
            <div className="flex flex-wrap gap-2">
              {PROFILES.map((p) => (
                <Button
                  key={p.table}
                  size="sm"
                  variant={selectedProfile === p ? "default" : "outline"}
                  onClick={() => setSelectedProfile(p)}
                >
                  {p.label}
                </Button>
              ))}
            </div>

            {selectedProfile && (
              <Button onClick={runImport} disabled={importing} className="w-full">
                {importing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Import en cours…
                  </>
                ) : (
                  <>Importer dans {selectedProfile.table}</>
                )}
              </Button>
            )}
          </div>
        )}

        {result && (
          <div className="flex items-center gap-2 rounded bg-muted p-3 text-sm">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span>
              {result.count} enregistrements → <strong>{result.table}</strong>
              {result.errors > 0 && ` (${result.errors} erreurs)`}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
