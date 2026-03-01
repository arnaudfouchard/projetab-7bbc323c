import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload, FileText, Trash2, Loader2, CheckCircle2,
  AlertTriangle, Database, Github, FolderGit2, SkipForward,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface PendingDocument {
  id: string;
  file: File | null;
  name: string;
  text: string | null;
  extracting: boolean;
  extracted: boolean;
  error: string | null;
  metadata: {
    type_document: string;
    etablissement: string;
    annee: string;
    thematique: string;
    type_etablissement: string;
  };
}

interface IngestResult {
  name: string;
  chunks: number;
  status: string;
}

interface GitHubFile {
  path: string;
  name: string;
  download_url: string;
  size: number;
  selected: boolean;
}

const TYPE_DOCUMENT_OPTIONS = ["PE", "PM", "PMS", "CPOM", "Autre"];
const TYPE_ETAB_OPTIONS = ["CHR/U", "CH", "ESPIC", "Privé", "EHPAD", "GHT", "Autre"];
const SUPPORTED_EXTENSIONS = ["pdf", "docx", "pptx", "txt", "md"];

const DEFAULT_REPO = "arthur-lmusic/pe_pms";

/* ------------------------------------------------------------------ */
/* Text extraction helpers                                             */
/* ------------------------------------------------------------------ */

async function extractTextFromFile(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "txt" || ext === "md" || ext === "csv") {
    return await file.text();
  }

  if (ext === "docx") {
    const mammoth = await import("mammoth");
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  }

  if (ext === "pdf") {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pages: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const text = content.items.map((item: any) => item.str).join(" ");
      pages.push(text);
    }
    return pages.join("\n\n");
  }

  if (ext === "pptx") {
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const slideTexts: string[] = [];
    const slideFiles = Object.keys(zip.files)
      .filter(f => f.match(/ppt\/slides\/slide\d+\.xml$/))
      .sort();
    for (const slideFile of slideFiles) {
      const xml = await zip.files[slideFile].async("string");
      const matches = xml.match(/<a:t>([^<]*)<\/a:t>/g);
      if (matches) {
        const texts = matches.map(m => m.replace(/<\/?a:t>/g, ""));
        slideTexts.push(texts.join(" "));
      }
    }
    return slideTexts.join("\n\n");
  }

  throw new Error(`Format non supporté: .${ext}`);
}

async function extractTextFromBlob(blob: Blob, filename: string): Promise<string> {
  const file = new File([blob], filename, { type: blob.type });
  return extractTextFromFile(file);
}

/* ------------------------------------------------------------------ */
/* Auto-detect metadata from filename                                  */
/* ------------------------------------------------------------------ */
function autoDetect(name: string) {
  const meta = {
    type_document: "",
    etablissement: "",
    annee: "",
    thematique: "",
    type_etablissement: "",
  };

  const upper = name.toUpperCase();
  if (upper.includes("PE ") || upper.startsWith("PE_") || upper.startsWith("PE-") || upper.includes("PE_")) meta.type_document = "PE";
  else if (upper.includes("PM ") || upper.startsWith("PM_") || upper.startsWith("PM-")) meta.type_document = "PM";
  else if (upper.includes("PMS")) meta.type_document = "PMS";
  else if (upper.includes("CPOM")) meta.type_document = "CPOM";

  const yearMatch = name.match(/(20\d{2})/);
  if (yearMatch) meta.annee = yearMatch[1];

  if (upper.includes("CHU") || upper.includes("CHR")) meta.type_etablissement = "CHR/U";
  else if (upper.includes("EHPAD")) meta.type_etablissement = "EHPAD";
  else if (upper.match(/\bCH[\s_-]/)) meta.type_etablissement = "CH";

  // Try to extract establishment name from path/filename
  const parts = name.replace(/\.[^.]+$/, "").split(/[_\-\s/\\]+/);
  const filtered = parts.filter(p => 
    p.length > 2 && 
    !["PE", "PM", "PMS", "CPOM", "CHU", "CHR", "CH", "EHPAD"].includes(p.toUpperCase()) &&
    !p.match(/^20\d{2}$/)
  );
  if (filtered.length > 0) {
    meta.etablissement = filtered[0];
  }

  return meta;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function IngestionPanel() {
  // --- Upload tab state ---
  const [documents, setDocuments] = useState<PendingDocument[]>([]);
  const [ingesting, setIngesting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<IngestResult[] | null>(null);

  // --- GitHub tab state ---
  const [repoUrl, setRepoUrl] = useState(DEFAULT_REPO);
  const [ghFiles, setGhFiles] = useState<GitHubFile[]>([]);
  const [loadingRepo, setLoadingRepo] = useState(false);
  const [ghDocuments, setGhDocuments] = useState<PendingDocument[]>([]);
  const [ghIngesting, setGhIngesting] = useState(false);
  const [ghProgress, setGhProgress] = useState(0);
  const [ghResults, setGhResults] = useState<IngestResult[] | null>(null);
  const [ghStep, setGhStep] = useState<"list" | "extract" | "ingest">("list");

  /* ======== Upload tab handlers ======== */

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newDocs: PendingDocument[] = [];
    for (const file of Array.from(files)) {
      const doc: PendingDocument = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        file,
        name: file.name,
        text: null,
        extracting: true,
        extracted: false,
        error: null,
        metadata: { type_document: "", etablissement: "", annee: "", thematique: "", type_etablissement: "" },
      };
      newDocs.push(doc);
    }
    setDocuments(prev => [...prev, ...newDocs]);
    for (const doc of newDocs) {
      try {
        const text = await extractTextFromFile(doc.file!);
        setDocuments(prev => prev.map(d => d.id === doc.id ? { ...d, text, extracting: false, extracted: true } : d));
      } catch (err: any) {
        setDocuments(prev => prev.map(d => d.id === doc.id ? { ...d, extracting: false, error: err.message } : d));
      }
    }
    e.target.value = "";
  };

  const removeDoc = (id: string) => setDocuments(prev => prev.filter(d => d.id !== id));

  const updateMetadata = (id: string, key: string, value: string, isGh = false) => {
    const setter = isGh ? setGhDocuments : setDocuments;
    setter(prev => prev.map(d => d.id === id ? { ...d, metadata: { ...d.metadata, [key]: value } } : d));
  };

  const autoDetectAll = (isGh = false) => {
    const setter = isGh ? setGhDocuments : setDocuments;
    setter(prev => prev.map(d => ({ ...d, metadata: { ...d.metadata, ...autoDetect(d.name) } })));
    toast.info("Métadonnées auto-détectées depuis les noms de fichiers");
  };

  const runIngestion = async (docs: PendingDocument[], isGh = false) => {
    const ready = docs.filter(d => d.extracted && d.text);
    if (ready.length === 0) {
      toast.error("Aucun document prêt à indexer");
      return;
    }

    const setIng = isGh ? setGhIngesting : setIngesting;
    const setProg = isGh ? setGhProgress : setProgress;
    const setRes = isGh ? setGhResults : setResults;

    setIng(true);
    setRes(null);
    setProg(0);

    try {
      const BATCH_SIZE = 3;
      const allResults: IngestResult[] = [];

      for (let i = 0; i < ready.length; i += BATCH_SIZE) {
        const batch = ready.slice(i, i + BATCH_SIZE);
        const payload = batch.map(d => ({
          name: d.name,
          text: d.text,
          metadata: Object.fromEntries(Object.entries(d.metadata).filter(([, v]) => v)),
        }));

        const { data, error } = await supabase.functions.invoke("ingest-documents", {
          body: { documents: payload, skipExisting: true },
        });

        if (error) throw error;
        if (data?.results) allResults.push(...data.results);
        setProg(Math.round(((i + batch.length) / ready.length) * 100));
      }

      setRes(allResults);
      const indexed = allResults.filter(r => r.status === "indexed").length;
      const skipped = allResults.filter(r => r.status === "skipped_duplicate").length;
      toast.success(`${indexed} indexé(s), ${skipped} doublon(s) ignoré(s) sur ${ready.length} documents`);
    } catch (err: any) {
      console.error("Ingestion error:", err);
      toast.error(err?.message || "Erreur lors de l'indexation");
    } finally {
      setIng(false);
    }
  };

  /* ======== GitHub tab handlers ======== */

  const fetchRepoFiles = async () => {
    setLoadingRepo(true);
    setGhFiles([]);
    setGhDocuments([]);
    setGhResults(null);
    setGhStep("list");

    try {
      const repo = repoUrl.replace("https://github.com/", "").replace(/\/$/, "");
      // Use GitHub Trees API to get all files recursively
      const res = await fetch(`https://api.github.com/repos/${repo}/git/trees/main?recursive=1`);
      
      if (!res.ok) {
        // Try 'master' branch
        const res2 = await fetch(`https://api.github.com/repos/${repo}/git/trees/master?recursive=1`);
        if (!res2.ok) throw new Error(`Repo introuvable (${res.status})`);
        const data2 = await res2.json();
        processTreeData(data2, repo);
        return;
      }
      
      const data = await res.json();
      processTreeData(data, repo);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors du scan du repo");
    } finally {
      setLoadingRepo(false);
    }
  };

  const processTreeData = (data: any, repo: string) => {
    const files: GitHubFile[] = (data.tree || [])
      .filter((f: any) => {
        if (f.type !== "blob") return false;
        const ext = f.path.split(".").pop()?.toLowerCase();
        return ext && SUPPORTED_EXTENSIONS.includes(ext);
      })
      .map((f: any) => ({
        path: f.path,
        name: f.path.split("/").pop() || f.path,
        download_url: `https://raw.githubusercontent.com/${repo}/main/${f.path}`,
        size: f.size || 0,
        selected: true,
      }));

    setGhFiles(files);
    if (files.length === 0) {
      toast.info("Aucun fichier supporté trouvé dans ce repo");
    } else {
      toast.success(`${files.length} fichier(s) trouvé(s)`);
    }
  };

  const toggleFileSelection = (path: string) => {
    setGhFiles(prev => prev.map(f => f.path === path ? { ...f, selected: !f.selected } : f));
  };

  const selectAll = (selected: boolean) => {
    setGhFiles(prev => prev.map(f => ({ ...f, selected })));
  };

  const startGitHubExtraction = async () => {
    const selected = ghFiles.filter(f => f.selected);
    if (selected.length === 0) {
      toast.error("Aucun fichier sélectionné");
      return;
    }

    setGhStep("extract");
    const newDocs: PendingDocument[] = selected.map(f => ({
      id: `gh-${f.path}`,
      file: null,
      name: f.name,
      text: null,
      extracting: true,
      extracted: false,
      error: null,
      metadata: autoDetect(f.path),
    }));
    setGhDocuments(newDocs);

    // Download and extract each file
    for (const f of selected) {
      try {
        const res = await fetch(f.download_url);
        if (!res.ok) throw new Error(`Download failed (${res.status})`);
        const blob = await res.blob();
        const text = await extractTextFromBlob(blob, f.name);

        setGhDocuments(prev => prev.map(d =>
          d.id === `gh-${f.path}`
            ? { ...d, text, extracting: false, extracted: true }
            : d
        ));
      } catch (err: any) {
        setGhDocuments(prev => prev.map(d =>
          d.id === `gh-${f.path}`
            ? { ...d, extracting: false, error: err.message }
            : d
        ));
      }
    }

    setGhStep("ingest");
  };

  /* ======== Render helpers ======== */

  const readyCount = documents.filter(d => d.extracted && d.text).length;
  const totalChars = documents.filter(d => d.text).reduce((s, d) => s + (d.text?.length || 0), 0);
  const ghReadyCount = ghDocuments.filter(d => d.extracted && d.text).length;
  const ghExtracting = ghDocuments.some(d => d.extracting);
  const selectedCount = ghFiles.filter(f => f.selected).length;

  const renderResults = (res: IngestResult[]) => (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          Résultats de l'indexation
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {res.map((r, i) => (
            <div key={i} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
              <span className="truncate flex-1">{r.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{r.chunks} chunks</span>
                <Badge
                  variant={r.status === "indexed" ? "default" : r.status === "skipped_duplicate" ? "secondary" : "destructive"}
                  className="text-xs"
                >
                  {r.status === "indexed" ? "Indexé" : r.status === "skipped_duplicate" ? "Doublon" : r.status === "skipped_too_short" ? "Trop court" : r.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-600" />{res.filter(r => r.status === "indexed").length} indexé(s)</span>
          <span className="flex items-center gap-1"><SkipForward className="h-3 w-3" />{res.filter(r => r.status === "skipped_duplicate").length} doublon(s)</span>
          <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-destructive" />{res.filter(r => r.status.startsWith("error")).length} erreur(s)</span>
        </div>
      </CardContent>
    </Card>
  );

  const renderMetadataFields = (doc: PendingDocument, isGh: boolean) => (
    <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
      <div>
        <label className="mb-0.5 block text-[10px] text-muted-foreground">Type doc</label>
        <Select value={doc.metadata.type_document} onValueChange={v => updateMetadata(doc.id, "type_document", v, isGh)}>
          <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
          <SelectContent>{TYPE_DOCUMENT_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <label className="mb-0.5 block text-[10px] text-muted-foreground">Établissement</label>
        <Input value={doc.metadata.etablissement} onChange={e => updateMetadata(doc.id, "etablissement", e.target.value, isGh)} className="h-7 text-xs" placeholder="Nom…" />
      </div>
      <div>
        <label className="mb-0.5 block text-[10px] text-muted-foreground">Année</label>
        <Input value={doc.metadata.annee} onChange={e => updateMetadata(doc.id, "annee", e.target.value, isGh)} className="h-7 text-xs" placeholder="2024" />
      </div>
      <div>
        <label className="mb-0.5 block text-[10px] text-muted-foreground">Thématique</label>
        <Input value={doc.metadata.thematique} onChange={e => updateMetadata(doc.id, "thematique", e.target.value, isGh)} className="h-7 text-xs" placeholder="Ex: RH" />
      </div>
      <div>
        <label className="mb-0.5 block text-[10px] text-muted-foreground">Type étab.</label>
        <Select value={doc.metadata.type_etablissement} onValueChange={v => updateMetadata(doc.id, "type_etablissement", v, isGh)}>
          <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
          <SelectContent>{TYPE_ETAB_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <Tabs defaultValue="github" className="space-y-4">
      <TabsList>
        <TabsTrigger value="github" className="gap-1.5"><Github className="h-3.5 w-3.5" />Import GitHub</TabsTrigger>
        <TabsTrigger value="upload" className="gap-1.5"><Upload className="h-3.5 w-3.5" />Upload manuel</TabsTrigger>
      </TabsList>

      {/* ==================== GitHub Import Tab ==================== */}
      <TabsContent value="github" className="space-y-4">
        {/* Repo input */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <FolderGit2 className="h-4 w-4 text-primary" />
              Importer depuis un dépôt GitHub
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Scannez un repo public pour trouver les fichiers PDF, DOCX, PPTX, TXT, MD. 
              Les fichiers seront téléchargés, le texte extrait côté navigateur, puis indexés dans Pinecone avec détection des doublons.
            </p>
            <div className="flex gap-2">
              <Input
                value={repoUrl}
                onChange={e => setRepoUrl(e.target.value)}
                placeholder="owner/repo (ex: arthur-lmusic/pe_pms)"
                className="flex-1"
              />
              <Button onClick={fetchRepoFiles} disabled={loadingRepo || !repoUrl.trim()}>
                {loadingRepo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Github className="mr-2 h-4 w-4" />}
                Scanner
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* File list */}
        {ghFiles.length > 0 && ghStep === "list" && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">
                  {ghFiles.length} fichier(s) trouvé(s) — {selectedCount} sélectionné(s)
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => selectAll(true)}>Tout sélectionner</Button>
                  <Button variant="outline" size="sm" onClick={() => selectAll(false)}>Aucun</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="max-h-[400px] overflow-y-auto space-y-1">
                {ghFiles.map(f => (
                  <label key={f.path} className="flex items-center gap-3 rounded px-2 py-1.5 hover:bg-muted/50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={f.selected}
                      onChange={() => toggleFileSelection(f.path)}
                      className="rounded"
                    />
                    <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="text-sm truncate flex-1">{f.path}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {f.size > 1024 * 1024 ? `${(f.size / 1024 / 1024).toFixed(1)} MB` : `${Math.round(f.size / 1024)} KB`}
                    </span>
                  </label>
                ))}
              </div>
              <div className="mt-4 flex justify-end">
                <Button onClick={startGitHubExtraction} disabled={selectedCount === 0}>
                  <Database className="mr-2 h-4 w-4" />
                  Extraire et indexer ({selectedCount} fichiers)
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Extraction & ingestion progress */}
        {ghDocuments.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Database className="h-4 w-4 text-primary" />
                  Extraction et indexation ({ghReadyCount}/{ghDocuments.length} prêts)
                </CardTitle>
                {!ghExtracting && ghStep === "ingest" && (
                  <Button variant="outline" size="sm" onClick={() => autoDetectAll(true)}>
                    Auto-détecter métadonnées
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="max-h-[300px] overflow-y-auto space-y-2">
                {ghDocuments.map(doc => (
                  <div key={doc.id} className="rounded border px-3 py-2 space-y-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5 shrink-0 text-primary" />
                      <span className="text-sm truncate flex-1">{doc.name}</span>
                      {doc.extracting && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                      {doc.extracted && doc.text && (
                        <span className="text-xs text-green-600 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          {doc.text.length.toLocaleString("fr-FR")} car.
                        </span>
                      )}
                      {doc.error && (
                        <span className="text-xs text-destructive flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> {doc.error}
                        </span>
                      )}
                    </div>
                    {doc.extracted && !doc.error && renderMetadataFields(doc, true)}
                  </div>
                ))}
              </div>

              {!ghExtracting && ghStep === "ingest" && (
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-xs text-muted-foreground">
                    {ghReadyCount} document(s) prêt(s) — doublons détectés automatiquement
                  </span>
                  <Button onClick={() => runIngestion(ghDocuments, true)} disabled={ghReadyCount === 0 || ghIngesting}>
                    {ghIngesting ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Indexation…</>
                    ) : (
                      <><Database className="mr-2 h-4 w-4" /> Indexer ({ghReadyCount})</>
                    )}
                  </Button>
                </div>
              )}

              {ghIngesting && (
                <div className="space-y-1">
                  <Progress value={ghProgress} className="h-2" />
                  <p className="text-xs text-center text-muted-foreground">
                    Dedup → Chunking → Embedding → Upsert Pinecone
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {ghResults && renderResults(ghResults)}
      </TabsContent>

      {/* ==================== Upload Tab ==================== */}
      <TabsContent value="upload" className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Upload className="h-4 w-4 text-primary" />
              Ajouter des documents à indexer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Uploadez des fichiers PDF, DOCX, PPTX, TXT ou MD. Le texte sera extrait automatiquement
              côté navigateur, puis découpé en chunks et indexé dans Pinecone.
            </p>
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 p-6 transition-colors hover:border-primary/50 hover:bg-muted/30">
              <Upload className="h-8 w-8 text-muted-foreground/50" />
              <span className="text-sm font-medium">Glissez-déposez ou cliquez</span>
              <span className="text-xs text-muted-foreground">.pdf, .docx, .pptx, .txt, .md</span>
              <input type="file" className="hidden" multiple accept=".pdf,.docx,.pptx,.txt,.md,.csv" onChange={handleFileSelect} />
            </label>
          </CardContent>
        </Card>

        {documents.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Database className="h-4 w-4 text-primary" />
                  Documents ({documents.length}) — {readyCount} prêt(s)
                </CardTitle>
                <Button variant="outline" size="sm" onClick={() => autoDetectAll(false)}>Auto-détecter métadonnées</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {documents.map(doc => (
                <div key={doc.id} className="rounded-lg border p-3 space-y-3">
                  <div className="flex items-start gap-3">
                    <FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium">{doc.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {doc.extracting && <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Extraction…</span>}
                        {doc.extracted && doc.text && <span className="flex items-center gap-1 text-green-600"><CheckCircle2 className="h-3 w-3" />{doc.text.length.toLocaleString("fr-FR")} caractères</span>}
                        {doc.error && <span className="flex items-center gap-1 text-destructive"><AlertTriangle className="h-3 w-3" /> {doc.error}</span>}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeDoc(doc.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                  {doc.extracted && renderMetadataFields(doc, false)}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {documents.length > 0 && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  {readyCount} document(s) prêt(s) — {totalChars.toLocaleString("fr-FR")} caractères
                </div>
                <Button onClick={() => runIngestion(documents)} disabled={readyCount === 0 || ingesting}>
                  {ingesting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Indexation…</> : <><Database className="mr-2 h-4 w-4" /> Indexer</>}
                </Button>
              </div>
              {ingesting && (
                <div className="space-y-1">
                  <Progress value={progress} className="h-2" />
                  <p className="text-xs text-center text-muted-foreground">Chunking → Embedding → Upsert Pinecone</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {results && renderResults(results)}
      </TabsContent>
    </Tabs>
  );
}
