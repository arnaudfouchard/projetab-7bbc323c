import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { query } from "./db.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.BACKEND_PORT || "4001", 10);

// ─── Middleware ──────────────────────────────────────────────
app.use(cors({ origin: true }));
app.use(express.json({ limit: "10mb" }));

// ─── Health ─────────────────────────────────────────────────
app.get("/api/health", async (_req, res) => {
  try {
    const r = await query("SELECT 1 AS ok");
    res.json({ status: "ok", db: r.rows.length > 0 ? "connected" : "error", timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.json({ status: "ok", db: "disconnected", error: err.message, timestamp: new Date().toISOString() });
  }
});

// ─── Projects ───────────────────────────────────────────────
app.get("/api/projects", async (_req, res) => {
  try {
    const { rows } = await query("SELECT * FROM projects ORDER BY updated_at DESC");
    res.json(rows);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.get("/api/projects/:id", async (req, res) => {
  try {
    const { rows } = await query("SELECT * FROM projects WHERE id = $1", [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: "Projet introuvable" });
    res.json(rows[0]);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post("/api/projects", async (req, res) => {
  try {
    const { name, entity_type, finess, ght_code, department, region, modules, type, status, is_exploration } = req.body;
    const { rows } = await query(
      `INSERT INTO projects (name, entity_type, finess, ght_code, department, region, modules, type, status, is_exploration)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [name, entity_type || "etablissement", finess, ght_code, department, region, modules || [], type || "PE", status || "draft", is_exploration || false]
    );
    res.json(rows[0]);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── Etablissements ─────────────────────────────────────────
app.get("/api/etablissements/search", async (req, res) => {
  try {
    const q = `%${req.query.q || ""}%`;
    const excludes = (req.query.exclude as string || "").split(",").filter(Boolean);
    let sql = `SELECT finess_geo, finess_juridique, nom, type_etab, categorie_libelle, commune, departement, region, statut_juridique
               FROM etablissements WHERE (nom ILIKE $1 OR finess_geo ILIKE $1 OR commune ILIKE $1 OR code_postal ILIKE $1)`;
    const params: any[] = [q];
    for (let i = 0; i < excludes.length; i++) {
      params.push(excludes[i]);
      sql += ` AND (categorie_libelle IS NULL OR categorie_libelle != $${params.length})`;
    }
    sql += " LIMIT 15";
    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.get("/api/etablissements/:finess", async (req, res) => {
  try {
    const { rows } = await query("SELECT * FROM etablissements WHERE finess_geo = $1", [req.params.finess]);
    if (rows.length === 0) return res.status(404).json({ error: "Établissement introuvable" });
    res.json(rows[0]);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── GHTs ───────────────────────────────────────────────────
app.get("/api/ghts/search", async (req, res) => {
  try {
    const q = `%${req.query.q || ""}%`;
    const { rows } = await query(
      "SELECT ght_code, ght_nom, region, nb_membres FROM ghts WHERE ght_nom ILIKE $1 OR ght_code ILIKE $1 OR region ILIKE $1 LIMIT 15",
      [q]
    );
    res.json(rows);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── Population ─────────────────────────────────────────────
app.get("/api/population/:codeDept", async (req, res) => {
  try {
    const { rows } = await query(
      "SELECT population, population_0_14, population_15_29, population_30_44, population_45_59, population_60_74, population_75_plus, densite FROM population_communes WHERE code_departement = $1",
      [req.params.codeDept]
    );
    res.json(rows);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── SAE ────────────────────────────────────────────────────
app.get("/api/sae/:finess", async (req, res) => {
  try {
    const { rows } = await query(
      "SELECT * FROM sae_capacites WHERE finess_geo = $1 ORDER BY annee DESC",
      [req.params.finess]
    );
    res.json(rows);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── Certification HAS ──────────────────────────────────────
app.get("/api/certification/:finess", async (req, res) => {
  try {
    const { rows } = await query(
      "SELECT * FROM certification_has WHERE finess_geo = $1 ORDER BY annee_visite DESC",
      [req.params.finess]
    );
    res.json(rows);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── ALD ────────────────────────────────────────────────────
app.get("/api/ald/:codeDept", async (req, res) => {
  try {
    const { rows } = await query("SELECT * FROM ald_departement WHERE code_departement = $1", [req.params.codeDept]);
    res.json(rows);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── Data Sources ───────────────────────────────────────────
app.get("/api/data-sources", async (_req, res) => {
  try {
    const { rows } = await query("SELECT * FROM data_sources ORDER BY name");
    res.json(rows);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── Audit ──────────────────────────────────────────────────
app.get("/api/audit", async (_req, res) => {
  try {
    const { rows } = await query("SELECT audit_data_linkages() AS result");
    res.json({ audit: rows[0]?.result });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post("/api/audit/run", async (_req, res) => {
  try {
    const { rows } = await query("SELECT audit_data_linkages() AS result");
    const auditResult = rows[0]?.result;
    await query(
      `INSERT INTO import_history (source_id, version_label, audit_report, status, completed_at)
       VALUES ('_audit', $1, $2, 'success', now())`,
      [new Date().toISOString().slice(0, 10), JSON.stringify(auditResult)]
    );
    res.json({ audit: auditResult });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── Import History ─────────────────────────────────────────
app.get("/api/import-history", async (_req, res) => {
  try {
    const { rows } = await query("SELECT * FROM import_history ORDER BY started_at DESC LIMIT 50");
    res.json(rows);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post("/api/import-history", async (req, res) => {
  try {
    const { source_id, version_label, record_count, records_inserted, records_updated, records_deleted, orphan_keys_detected, status } = req.body;
    const { rows } = await query(
      `INSERT INTO import_history (source_id, version_label, record_count, records_inserted, records_updated, records_deleted, orphan_keys_detected, status, completed_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,now()) RETURNING *`,
      [source_id, version_label, record_count || 0, records_inserted || 0, records_updated || 0, records_deleted || 0, orphan_keys_detected || 0, status || "success"]
    );
    res.json(rows[0]);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── Linkage Overrides ──────────────────────────────────────
app.get("/api/linkage-overrides", async (_req, res) => {
  try {
    const { rows } = await query("SELECT * FROM linkage_overrides ORDER BY created_at DESC");
    res.json(rows);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.get("/api/linkage-overrides/count", async (_req, res) => {
  try {
    const { rows } = await query("SELECT COUNT(*) AS count FROM linkage_overrides");
    res.json({ count: parseInt(rows[0].count, 10) });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post("/api/linkage-overrides", async (req, res) => {
  try {
    const { source_table, source_key, target_table, original_value, corrected_value, reason, created_by } = req.body;
    const { rows } = await query(
      `INSERT INTO linkage_overrides (source_table, source_key, target_table, original_value, corrected_value, reason, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [source_table, source_key, target_table, original_value, corrected_value, reason, created_by]
    );
    res.json(rows[0]);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/linkage-overrides/:id", async (req, res) => {
  try {
    await query("DELETE FROM linkage_overrides WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── Generic Upsert (for XLSX imports & client-side imports) ─
app.post("/api/upsert", async (req, res) => {
  try {
    const { table, records, conflict_column } = req.body;
    const ALLOWED = ["etablissements", "ghts", "sae_capacites", "population_communes", "certification_has", "ald_departement", "ald_national", "data_sources"];
    if (!ALLOWED.includes(table)) return res.status(400).json({ error: `Table non autorisée: ${table}` });
    if (!records || !Array.isArray(records) || records.length === 0) return res.status(400).json({ error: "Aucun enregistrement" });

    let inserted = 0;
    let errors = 0;

    const cols = Object.keys(records[0]);
    const colsList = cols.map(c => `"${c}"`).join(", ");
    const conflictCols = conflict_column ? conflict_column.split(",").map((s: string) => s.trim()) : [];
    const updateCols = cols.filter(c => !conflictCols.includes(c));
    const onConflict = conflict_column
      ? `ON CONFLICT (${conflict_column}) DO UPDATE SET ${updateCols.map(c => `"${c}" = EXCLUDED."${c}"`).join(", ")}`
      : "";

    for (const row of records) {
      const vals = cols.map(c => row[c]);
      const placeholders = vals.map((_, j) => `$${j + 1}`).join(", ");
      try {
        await query(`INSERT INTO "${table}" (${colsList}) VALUES (${placeholders}) ${onConflict}`, vals);
        inserted++;
      } catch (err: any) {
        console.error(`Upsert error [${table}]:`, err.message);
        errors++;
      }
    }

    res.json({ inserted, errors, total: records.length });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── Bulk Delete + Insert (for full-replace imports) ────────
app.post("/api/bulk-replace", async (req, res) => {
  try {
    const { table, records } = req.body;
    const ALLOWED = ["etablissements", "ghts", "sae_capacites", "population_communes", "certification_has", "ald_departement", "ald_national"];
    if (!ALLOWED.includes(table)) return res.status(400).json({ error: `Table non autorisée: ${table}` });

    await query(`DELETE FROM "${table}" WHERE true`);

    if (!records || records.length === 0) return res.json({ inserted: 0, errors: 0 });

    let inserted = 0;
    let errors = 0;
    const cols = Object.keys(records[0]);
    const colsList = cols.map(c => `"${c}"`).join(", ");

    for (const row of records) {
      const vals = cols.map(c => row[c]);
      const placeholders = vals.map((_, j) => `$${j + 1}`).join(", ");
      try {
        await query(`INSERT INTO "${table}" (${colsList}) VALUES (${placeholders})`, vals);
        inserted++;
      } catch (err: any) {
        console.error(`Insert error [${table}]:`, err.message);
        errors++;
      }
    }

    res.json({ inserted, errors, total: records.length });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── Data Source meta upsert ────────────────────────────────
app.post("/api/data-sources/upsert", async (req, res) => {
  try {
    const { id, name, description, record_count, status, format, source } = req.body;
    const { rows } = await query(
      `INSERT INTO data_sources (id, name, description, record_count, status, last_update, format, source)
       VALUES ($1,$2,$3,$4,$5,now(),$6,$7)
       ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, description=COALESCE(EXCLUDED.description, data_sources.description),
         record_count=EXCLUDED.record_count, status=EXCLUDED.status, last_update=now(),
         format=COALESCE(EXCLUDED.format, data_sources.format), source=COALESCE(EXCLUDED.source, data_sources.source)
       RETURNING *`,
      [id, name, description, record_count || 0, status || "ok", format, source]
    );
    res.json(rows[0]);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── Pinecone Search (proxy to Pinecone API) ────────────────
app.post("/api/pinecone/search", async (req, res) => {
  try {
    const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
    const PINECONE_INDEX_HOST = process.env.PINECONE_INDEX_HOST;
    if (!PINECONE_API_KEY || !PINECONE_INDEX_HOST) {
      return res.status(503).json({ error: "Pinecone non configuré" });
    }

    const { action, query: searchQuery, filters, topK, id } = req.body;

    if (action === "list-filters") {
      const r = await fetch(`${PINECONE_INDEX_HOST}/describe_index_stats`, {
        method: "POST", headers: { "Api-Key": PINECONE_API_KEY, "Content-Type": "application/json" }, body: "{}",
      });
      return res.json(await r.json());
    }

    if (action === "fetch" && id) {
      const r = await fetch(`${PINECONE_INDEX_HOST}/vectors/fetch?ids=${encodeURIComponent(id)}`, {
        headers: { "Api-Key": PINECONE_API_KEY },
      });
      return res.json(await r.json());
    }

    // Embed the query
    const embedRes = await fetch("https://api.pinecone.io/embed", {
      method: "POST",
      headers: { "Api-Key": PINECONE_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "multilingual-e5-large", inputs: [{ text: searchQuery }], parameters: { input_type: "query" } }),
    });
    const embedData = await embedRes.json();
    const vector = embedData?.data?.[0]?.values;
    if (!vector) return res.status(500).json({ error: "Embedding échoué" });

    // Build filter
    const pcFilter: Record<string, any> = {};
    if (filters) {
      const conditions: any[] = [];
      for (const [key, val] of Object.entries(filters)) {
        if (val) conditions.push({ [key]: { $eq: val } });
      }
      if (conditions.length === 1) Object.assign(pcFilter, conditions[0]);
      else if (conditions.length > 1) Object.assign(pcFilter, { $and: conditions });
    }

    // Query Pinecone
    const searchRes = await fetch(`${PINECONE_INDEX_HOST}/query`, {
      method: "POST",
      headers: { "Api-Key": PINECONE_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ vector, topK: topK || 10, includeMetadata: true, filter: Object.keys(pcFilter).length > 0 ? pcFilter : undefined }),
    });
    res.json(await searchRes.json());
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── Pinecone Ingest (proxy) ────────────────────────────────
app.post("/api/pinecone/ingest", async (req, res) => {
  try {
    const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
    const PINECONE_INDEX_HOST = process.env.PINECONE_INDEX_HOST;
    if (!PINECONE_API_KEY || !PINECONE_INDEX_HOST) {
      return res.status(503).json({ error: "Pinecone non configuré" });
    }

    const { documents, skipExisting } = req.body;
    const results: any[] = [];

    for (const doc of documents) {
      const { name, text, metadata } = doc;
      if (!text || text.length < 100) {
        results.push({ name, chunks: 0, status: "skipped_too_short" });
        continue;
      }

      // Chunk text
      const CHUNK_SIZE = 1500;
      const OVERLAP = 200;
      const chunks: string[] = [];
      let start = 0;
      while (start < text.length) {
        let end = Math.min(start + CHUNK_SIZE, text.length);
        if (end < text.length) {
          const para = text.lastIndexOf("\n\n", end);
          if (para > start + CHUNK_SIZE / 2) end = para;
        }
        chunks.push(text.slice(start, end).trim());
        start = end - OVERLAP;
        if (start >= text.length) break;
      }

      const ids = chunks.map((_: string, i: number) => `${name.replace(/[^a-zA-Z0-9]/g, "_")}_chunk_${i}`);

      // Check duplicates
      if (skipExisting) {
        try {
          const fetchRes = await fetch(`${PINECONE_INDEX_HOST}/vectors/fetch`, {
            method: "POST",
            headers: { "Api-Key": PINECONE_API_KEY, "Content-Type": "application/json" },
            body: JSON.stringify({ ids: ids.slice(0, 10) }),
          });
          const fetchData = await fetchRes.json();
          if (fetchData.vectors && Object.keys(fetchData.vectors).length > 0) {
            results.push({ name, chunks: chunks.length, status: "skipped_duplicate" });
            continue;
          }
        } catch { /* continue */ }
      }

      // Embed
      const allVectors: any[] = [];
      for (let i = 0; i < chunks.length; i += 96) {
        const batch = chunks.slice(i, i + 96);
        const batchIds = ids.slice(i, i + 96);
        const embedRes = await fetch("https://api.pinecone.io/embed", {
          method: "POST",
          headers: { "Api-Key": PINECONE_API_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({ model: "multilingual-e5-large", inputs: batch.map((t: string) => ({ text: t })), parameters: { input_type: "passage" } }),
        });
        const embedData = await embedRes.json();
        if (embedData?.data) {
          embedData.data.forEach((d: any, j: number) => {
            allVectors.push({ id: batchIds[j], values: d.values, metadata: { ...metadata, text: batch[j], title: name, source: name } });
          });
        }
      }

      // Upsert to Pinecone
      for (let i = 0; i < allVectors.length; i += 100) {
        await fetch(`${PINECONE_INDEX_HOST}/vectors/upsert`, {
          method: "POST",
          headers: { "Api-Key": PINECONE_API_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({ vectors: allVectors.slice(i, i + 100) }),
        });
      }

      results.push({ name, chunks: chunks.length, status: "indexed" });
    }

    const totalIndexed = results.filter((r: any) => r.status === "indexed").reduce((s: number, r: any) => s + r.chunks, 0);
    if (totalIndexed > 0) {
      await query("UPDATE data_sources SET record_count = record_count + $1, last_update = now() WHERE id = 'pinecone-documents'", [totalIndexed]);
    }

    res.json({ results });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── Doc Synthesis (proxy to AI API) ────────────────────────
app.post("/api/doc-synthesis", async (req, res) => {
  try {
    const AI_API_KEY = process.env.AI_API_KEY || process.env.GOOGLE_AI_KEY;
    const AI_API_URL = process.env.AI_API_URL || "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
    if (!AI_API_KEY) return res.status(503).json({ error: "Clé API IA non configurée" });

    const { query: userQuery, results: searchResults } = req.body;

    const context = (searchResults || []).map((r: any, i: number) => {
      const m = r.metadata || {};
      return `[Doc ${i + 1}] ${m.title || m.source || "sans titre"} (${m.type_document || ""} ${m.annee || ""} ${m.etablissement || ""}):\n${(m.text || m.content || "").substring(0, 2000)}`;
    }).join("\n\n---\n\n");

    const systemPrompt = `Tu es un expert en stratégie hospitalière. Synthétise les extraits de documents fournis pour répondre à la question de l'utilisateur. Cite tes sources avec [Doc N]. Structure ta réponse en markdown.`;

    const aiRes = await fetch(`${AI_API_URL}?key=${AI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemPrompt}\n\nQuestion: ${userQuery}\n\nDocuments:\n${context}` }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 2048 },
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      throw new Error(`API IA erreur ${aiRes.status}: ${errText.substring(0, 200)}`);
    }

    const aiData = await aiRes.json();
    const synthesis = aiData?.candidates?.[0]?.content?.parts?.[0]?.text || "Pas de synthèse générée.";
    res.json({ synthesis });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── Static files (production) ──────────────────────────────
const distPath = path.resolve(__dirname, "../dist");
app.use(express.static(distPath));

// SPA fallback
app.get("/{*splat}", (req, res) => {
  if (req.path.startsWith("/api")) return res.status(404).json({ error: "Not found" });
  res.sendFile(path.join(distPath, "index.html"));
});

// ─── Start ──────────────────────────────────────────────────
app.listen(PORT, "0.0.0.0", () => {
  console.log(`[backend] Server running on http://0.0.0.0:${PORT}`);
  console.log(`[backend] PostgreSQL: ${process.env.PGHOST || "localhost"}:${process.env.PGPORT || "5432"}/${process.env.PGDATABASE || "projetab"}`);
  console.log(`[backend] Mode: ${process.env.NODE_ENV || "development"}`);
});
