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
  AlertTriangle, Database,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface PendingDocument {
  id: string;
  file: File;
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

const TYPE_DOCUMENT_OPTIONS = ["PE", "PM", "PMS", "CPOM", "Autre"];
const TYPE_ETAB_OPTIONS = ["CHR/U", "CH", "ESPIC", "Privé", "EHPAD", "GHT", "Autre"];

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
    // Set worker source
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pages: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const text = content.items
        .map((item: any) => item.str)
        .join(" ");
      pages.push(text);
    }

    return pages.join("\n\n");
  }

  if (ext === "pptx") {
    // PPTX is a zip of XML files — extract text from slides
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const slideTexts: string[] = [];

    const slideFiles = Object.keys(zip.files)
      .filter(f => f.match(/ppt\/slides\/slide\d+\.xml$/))
      .sort();

    for (const slideFile of slideFiles) {
      const xml = await zip.files[slideFile].async("string");
      // Extract text between <a:t> tags
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

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function IngestionPanel() {
  const [documents, setDocuments] = useState<PendingDocument[]>([]);
  const [ingesting, setIngesting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<IngestResult[] | null>(null);

  // Handle file selection
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
        metadata: {
          type_document: "",
          etablissement: "",
          annee: "",
          thematique: "",
          type_etablissement: "",
        },
      };
      newDocs.push(doc);
    }

    setDocuments(prev => [...prev, ...newDocs]);

    // Extract text from each file
    for (const doc of newDocs) {
      try {
        const text = await extractTextFromFile(doc.file);
        setDocuments(prev =>
          prev.map(d =>
            d.id === doc.id
              ? { ...d, text, extracting: false, extracted: true }
              : d
          )
        );
      } catch (err: any) {
        setDocuments(prev =>
          prev.map(d =>
            d.id === doc.id
              ? { ...d, extracting: false, error: err.message }
              : d
          )
        );
      }
    }

    e.target.value = "";
  };

  const removeDoc = (id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
  };

  const updateMetadata = (id: string, key: string, value: string) => {
    setDocuments(prev =>
      prev.map(d =>
        d.id === id ? { ...d, metadata: { ...d.metadata, [key]: value } } : d
      )
    );
  };

  // Auto-detect metadata from filename
  const autoDetect = (name: string) => {
    const meta: PendingDocument["metadata"] = {
      type_document: "",
      etablissement: "",
      annee: "",
      thematique: "",
      type_etablissement: "",
    };

    const upper = name.toUpperCase();
    if (upper.includes("PE ") || upper.startsWith("PE_") || upper.startsWith("PE-")) meta.type_document = "PE";
    else if (upper.includes("PM ") || upper.startsWith("PM_") || upper.startsWith("PM-")) meta.type_document = "PM";
    else if (upper.includes("PMS")) meta.type_document = "PMS";
    else if (upper.includes("CPOM")) meta.type_document = "CPOM";

    const yearMatch = name.match(/(20\d{2})/);
    if (yearMatch) meta.annee = yearMatch[1];

    if (upper.includes("CHU") || upper.includes("CHR")) meta.type_etablissement = "CHR/U";
    else if (upper.includes("CH ") || upper.startsWith("CH_")) meta.type_etablissement = "CH";

    return meta;
  };

  // Apply auto-detect to all
  const autoDetectAll = () => {
    setDocuments(prev =>
      prev.map(d => ({
        ...d,
        metadata: { ...d.metadata, ...autoDetect(d.name) },
      }))
    );
    toast.info("Métadonnées auto-détectées depuis les noms de fichiers");
  };

  // Run ingestion
  const runIngestion = async () => {
    const ready = documents.filter(d => d.extracted && d.text);
    if (ready.length === 0) {
      toast.error("Aucun document prêt à indexer");
      return;
    }

    setIngesting(true);
    setResults(null);
    setProgress(0);

    try {
      // Send documents in batches of 5
      const BATCH_SIZE = 5;
      const allResults: IngestResult[] = [];

      for (let i = 0; i < ready.length; i += BATCH_SIZE) {
        const batch = ready.slice(i, i + BATCH_SIZE);
        const payload = batch.map(d => ({
          name: d.name,
          text: d.text,
          metadata: Object.fromEntries(
            Object.entries(d.metadata).filter(([, v]) => v)
          ),
        }));

        const { data, error } = await supabase.functions.invoke("ingest-documents", {
          body: { documents: payload },
        });

        if (error) throw error;

        if (data?.results) {
          allResults.push(...data.results);
        }

        setProgress(Math.round(((i + batch.length) / ready.length) * 100));
      }

      setResults(allResults);
      const indexed = allResults.filter(r => r.status === "indexed").length;
      toast.success(`${indexed}/${ready.length} documents indexés avec succès`);
    } catch (err: any) {
      console.error("Ingestion error:", err);
      toast.error(err?.message || "Erreur lors de l'indexation");
    } finally {
      setIngesting(false);
    }
  };

  const readyCount = documents.filter(d => d.extracted && d.text).length;
  const totalChars = documents
    .filter(d => d.text)
    .reduce((s, d) => s + (d.text?.length || 0), 0);

  return (
    <div className="space-y-6">
      {/* Upload zone */}
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
            <input
              type="file"
              className="hidden"
              multiple
              accept=".pdf,.docx,.pptx,.txt,.md,.csv"
              onChange={handleFileSelect}
            />
          </label>
        </CardContent>
      </Card>

      {/* Document list with metadata */}
      {documents.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Database className="h-4 w-4 text-primary" />
                Documents ({documents.length}) — {readyCount} prêt(s)
              </CardTitle>
              <Button variant="outline" size="sm" onClick={autoDetectAll}>
                Auto-détecter métadonnées
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {documents.map(doc => (
              <div key={doc.id} className="rounded-lg border p-3 space-y-3">
                {/* Header */}
                <div className="flex items-start gap-3">
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium">{doc.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {doc.extracting && (
                        <span className="flex items-center gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" /> Extraction…
                        </span>
                      )}
                      {doc.extracted && doc.text && (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle2 className="h-3 w-3" />
                          {doc.text.length.toLocaleString("fr-FR")} caractères
                        </span>
                      )}
                      {doc.error && (
                        <span className="flex items-center gap-1 text-destructive">
                          <AlertTriangle className="h-3 w-3" /> {doc.error}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeDoc(doc.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* Metadata fields */}
                {doc.extracted && (
                  <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
                    <div>
                      <label className="mb-0.5 block text-[10px] text-muted-foreground">Type doc</label>
                      <Select
                        value={doc.metadata.type_document}
                        onValueChange={v => updateMetadata(doc.id, "type_document", v)}
                      >
                        <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          {TYPE_DOCUMENT_OPTIONS.map(t => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="mb-0.5 block text-[10px] text-muted-foreground">Établissement</label>
                      <Input
                        value={doc.metadata.etablissement}
                        onChange={e => updateMetadata(doc.id, "etablissement", e.target.value)}
                        className="h-7 text-xs"
                        placeholder="Nom…"
                      />
                    </div>
                    <div>
                      <label className="mb-0.5 block text-[10px] text-muted-foreground">Année</label>
                      <Input
                        value={doc.metadata.annee}
                        onChange={e => updateMetadata(doc.id, "annee", e.target.value)}
                        className="h-7 text-xs"
                        placeholder="2024"
                      />
                    </div>
                    <div>
                      <label className="mb-0.5 block text-[10px] text-muted-foreground">Thématique</label>
                      <Input
                        value={doc.metadata.thematique}
                        onChange={e => updateMetadata(doc.id, "thematique", e.target.value)}
                        className="h-7 text-xs"
                        placeholder="Ex: RH"
                      />
                    </div>
                    <div>
                      <label className="mb-0.5 block text-[10px] text-muted-foreground">Type étab.</label>
                      <Select
                        value={doc.metadata.type_etablissement}
                        onValueChange={v => updateMetadata(doc.id, "type_etablissement", v)}
                      >
                        <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          {TYPE_ETAB_OPTIONS.map(t => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Ingestion button + progress */}
      {documents.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                {readyCount} document(s) prêt(s) — {totalChars.toLocaleString("fr-FR")} caractères au total
              </div>
              <Button onClick={runIngestion} disabled={readyCount === 0 || ingesting}>
                {ingesting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Indexation en cours…</>
                ) : (
                  <><Database className="mr-2 h-4 w-4" /> Indexer dans Pinecone</>
                )}
              </Button>
            </div>

            {ingesting && (
              <div className="space-y-1">
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-center text-muted-foreground">
                  Chunking → Embedding (multilingual-e5-large) → Upsert Pinecone
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {results && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Résultats de l'indexation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {results.map((r, i) => (
                <div key={i} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                  <span className="truncate flex-1">{r.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{r.chunks} chunks</span>
                    <Badge
                      variant={r.status === "indexed" ? "default" : "destructive"}
                      className="text-xs"
                    >
                      {r.status === "indexed" ? "Indexé" : r.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
