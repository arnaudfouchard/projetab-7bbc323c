import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.BACKEND_PORT || "3001", 10);

// Supabase service client (server-side, uses service role key if available)
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ─── Middleware ──────────────────────────────────────────────
app.use(cors({ origin: true }));
app.use(express.json({ limit: "10mb" }));

// ─── API Routes ─────────────────────────────────────────────

// Health check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    supabase_url: SUPABASE_URL ? "configured" : "missing",
    service_key: SUPABASE_SERVICE_KEY ? "configured" : "missing",
  });
});

// Audit: run the audit function server-side
app.get("/api/audit", async (_req, res) => {
  try {
    const { data, error } = await supabase.rpc("audit_data_linkages");
    if (error) throw error;
    res.json({ audit: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Import history
app.get("/api/import-history", async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from("import_history")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Data sources overview
app.get("/api/data-sources", async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from("data_sources")
      .select("*")
      .order("name");
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Linkage overrides CRUD
app.get("/api/linkage-overrides", async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from("linkage_overrides")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/linkage-overrides", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("linkage_overrides")
      .insert(req.body)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/linkage-overrides/:id", async (req, res) => {
  try {
    const { error } = await supabase
      .from("linkage_overrides")
      .delete()
      .eq("id", req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Etablissement lookup by FINESS
app.get("/api/etablissements/:finess", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("etablissements")
      .select("*")
      .eq("finess_geo", req.params.finess)
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Population by department
app.get("/api/population/:codeDept", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("population_communes")
      .select("*")
      .eq("code_departement", req.params.codeDept);
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// SAE capacites by FINESS
app.get("/api/sae/:finess", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("sae_capacites")
      .select("*")
      .eq("finess_geo", req.params.finess)
      .order("annee", { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Certification HAS by FINESS
app.get("/api/certification/:finess", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("certification_has")
      .select("*")
      .eq("finess_geo", req.params.finess)
      .order("annee_visite", { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ALD by department
app.get("/api/ald/:codeDept", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("ald_departement")
      .select("*")
      .eq("code_departement", req.params.codeDept);
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Static files (production) ──────────────────────────────
const distPath = path.resolve(__dirname, "../dist");
app.use(express.static(distPath));

// SPA fallback: serve index.html for all non-API routes (Express 5 syntax)
app.get("/{*splat}", (req, res) => {
  if (req.path.startsWith("/api")) return res.status(404).json({ error: "Not found" });
  res.sendFile(path.join(distPath, "index.html"));
});

// ─── Start ──────────────────────────────────────────────────
app.listen(PORT, "0.0.0.0", () => {
  console.log(`[backend] Server running on http://0.0.0.0:${PORT}`);
  console.log(`[backend] Supabase: ${SUPABASE_URL ? "connected" : "NOT CONFIGURED"}`);
  console.log(`[backend] Mode: ${process.env.NODE_ENV || "development"}`);
});
