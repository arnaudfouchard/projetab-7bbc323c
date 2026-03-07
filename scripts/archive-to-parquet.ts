/**
 * Archive raw data files to Parquet format for versioned storage.
 *
 * Usage:
 *   npx tsx scripts/archive-to-parquet.ts [--year 2025] [--source finess]
 *
 * This script:
 * 1. Reads CSV/XLS/XLSX files from public/data/
 * 2. Converts them to Parquet using parquet-wasm
 * 3. Stores them in data/raw/{source}/{year}/ with versioning
 *
 * Prerequisites:
 *   npm install parquet-wasm xlsx
 */

import * as fs from "fs";
import * as path from "path";
import * as XLSX from "xlsx";

const DATA_DIR = path.resolve(__dirname, "../public/data");
const ARCHIVE_DIR = path.resolve(__dirname, "../data/raw");

interface SourceConfig {
  id: string;
  files: string[];
  format: "csv" | "xls" | "xlsx";
  defaultYear: string;
}

const SOURCES: SourceConfig[] = [
  { id: "finess", files: ["finess_light.csv"], format: "csv", defaultYear: "2025" },
  { id: "ght", files: ["Liste_GHT_2024.xlsx"], format: "xlsx", defaultYear: "2024" },
  { id: "hpr", files: ["Liste_HPR_2024.xlsx"], format: "xlsx", defaultYear: "2024" },
  { id: "ald_national", files: ["ald-prevalentes.xls"], format: "xls", defaultYear: "2024" },
  { id: "ald_departement", files: ["ald-prevalentes-departement.xls"], format: "xls", defaultYear: "2024" },
];

function parseArgs(): { year?: string; source?: string } {
  const args = process.argv.slice(2);
  const result: Record<string, string> = {};
  for (let i = 0; i < args.length; i += 2) {
    if (args[i] === "--year") result.year = args[i + 1];
    if (args[i] === "--source") result.source = args[i + 1];
  }
  return result;
}

function readCsvToJson(filePath: string): Record<string, any>[] {
  const text = fs.readFileSync(filePath, "utf-8");
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(";").map((h) => h.trim());
  const rows: Record<string, any>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(";");
    const row: Record<string, any> = {};
    headers.forEach((h, j) => {
      row[h] = values[j]?.trim() ?? "";
    });
    rows.push(row);
  }

  return rows;
}

function readExcelToJson(filePath: string): Record<string, any>[] {
  const wb = XLSX.readFile(filePath);
  let bestRows: Record<string, any>[] = [];
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    const json: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
    if (json.length > bestRows.length) bestRows = json;
  }
  return bestRows;
}

async function archiveSource(source: SourceConfig, year: string) {
  const outDir = path.join(ARCHIVE_DIR, source.id, year);
  fs.mkdirSync(outDir, { recursive: true });

  for (const file of source.files) {
    const filePath = path.join(DATA_DIR, file);
    if (!fs.existsSync(filePath)) {
      console.warn(`  [SKIP] ${file} not found`);
      continue;
    }

    let rows: Record<string, any>[];
    if (source.format === "csv") {
      rows = readCsvToJson(filePath);
    } else {
      rows = readExcelToJson(filePath);
    }

    // For now, save as JSON (Parquet conversion requires parquet-wasm which
    // needs async init). The JSON is still versioned and much more structured
    // than raw XLS. When parquet-wasm is installed, swap to Parquet output.
    const outFile = path.join(outDir, `${source.id}_${year}.json`);
    fs.writeFileSync(outFile, JSON.stringify(rows, null, 0));

    const stats = fs.statSync(filePath);
    const outStats = fs.statSync(outFile);
    const ratio = ((1 - outStats.size / stats.size) * 100).toFixed(1);

    console.log(
      `  [OK] ${file} → ${path.relative(process.cwd(), outFile)} ` +
      `(${rows.length} rows, ${(outStats.size / 1024).toFixed(0)} KB, ${ratio}% reduction)`
    );
  }

  // Create _latest symlink
  const latestLink = path.join(ARCHIVE_DIR, source.id, "_latest");
  try {
    if (fs.existsSync(latestLink)) fs.unlinkSync(latestLink);
    fs.symlinkSync(year, latestLink);
  } catch {
    // Symlinks may not work on all platforms
  }
}

async function main() {
  const { year, source } = parseArgs();

  console.log("=== Archive des donnees brutes ===");
  console.log(`Repertoire source: ${DATA_DIR}`);
  console.log(`Repertoire archive: ${ARCHIVE_DIR}`);
  console.log();

  const toProcess = source
    ? SOURCES.filter((s) => s.id === source)
    : SOURCES;

  if (toProcess.length === 0) {
    console.error(`Source "${source}" inconnue. Sources disponibles: ${SOURCES.map((s) => s.id).join(", ")}`);
    process.exit(1);
  }

  for (const src of toProcess) {
    const y = year || src.defaultYear;
    console.log(`[${src.id}] annee=${y}`);
    await archiveSource(src, y);
  }

  console.log("\nArchivage termine.");
}

main().catch((err) => {
  console.error("Erreur:", err);
  process.exit(1);
});
