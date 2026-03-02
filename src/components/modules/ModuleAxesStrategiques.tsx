import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Upload, FileText, Trash2, Loader2, CheckCircle2,
  AlertTriangle, Target, ChevronDown, ChevronUp, Quote,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface PendingFile {
  id: string;
  file: File;
  name: string;
  text: string | null;
  extracting: boolean;
  extracted: boolean;
  error: string | null;
}

interface EnjeuResult {
  titre: string;
  importance: string;
  description: string;
  mentions: number;
  verbatims: string[];
  actions: string[];
}

interface AnalysisResult {
  synthese_globale: string;
  enjeux: EnjeuResult[];
}

const SUPPORTED = ["txt", "md", "csv", "docx", "pdf", "pptx"];

/* ------------------------------------------------------------------ */
/* Text extraction (reuse same logic as IngestionPanel)                */
/* ------------------------------------------------------------------ */

async function extractText(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "txt" || ext === "md" || ext === "csv") {
    return await file.text();
  }
  if (ext === "docx") {
    const mammoth = await import("mammoth");
    const buf = await file.arrayBuffer();
    return (await mammoth.extractRawText({ arrayBuffer: buf })).value;
  }
  if (ext === "pdf") {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
    const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
    const pages: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      pages.push(content.items.map((it: any) => it.str).join(" "));
    }
    return pages.join("\n\n");
  }
  if (ext === "pptx") {
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const slides = Object.keys(zip.files)
      .filter((f) => f.match(/ppt\/slides\/slide\d+\.xml$/))
      .sort();
    const texts: string[] = [];
    for (const s of slides) {
      const xml = await zip.files[s].async("string");
      const matches = xml.match(/<a:t>([^<]*)<\/a:t>/g);
      if (matches) texts.push(matches.map((m) => m.replace(/<\/?a:t>/g, "")).join(" "));
    }
    return texts.join("\n\n");
  }
  throw new Error(`Format non supporté : .${ext}`);
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function ModuleAxesStrategiques() {
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [analysing, setAnalysing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  /* -------- File handling -------- */

  const handleSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const incoming = e.target.files;
    if (!incoming) return;
    const selected = Array.from(incoming).filter((f) => {
      const ext = f.name.split(".").pop()?.toLowerCase();
      return ext && SUPPORTED.includes(ext);
    });

    const newFiles: PendingFile[] = selected.map((f) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      file: f,
      name: f.name,
      text: null,
      extracting: true,
      extracted: false,
      error: null,
    }));

    setFiles((prev) => [...prev, ...newFiles]);

    // Extract text
    for (const nf of newFiles) {
      try {
        const text = await extractText(nf.file);
        setFiles((prev) =>
          prev.map((d) => (d.id === nf.id ? { ...d, text, extracting: false, extracted: true } : d))
        );
      } catch (err: any) {
        setFiles((prev) =>
          prev.map((d) => (d.id === nf.id ? { ...d, extracting: false, error: err.message } : d))
        );
      }
    }
    e.target.value = "";
  };

  const removeFile = (id: string) => setFiles((prev) => prev.filter((f) => f.id !== id));

  /* -------- Analysis -------- */

  const handleAnalyse = async () => {
    const ready = files.filter((f) => f.extracted && f.text);
    if (ready.length === 0) {
      toast.error("Aucun document prêt pour l'analyse");
      return;
    }

    setAnalysing(true);
    setProgress(10);
    setResult(null);

    try {
      const combinedText = ready
        .map((f) => `--- ${f.name} ---\n${f.text!.slice(0, 15_000)}`)
        .join("\n\n");

      setProgress(30);

      const { data, error } = await supabase.functions.invoke("doc-synthesis", {
        body: {
          query: `Analyse ces comptes rendus d'entretiens stratégiques. Identifie les enjeux stratégiques majeurs, classe-les par importance, extrais des verbatims significatifs et propose des pistes d'actions concrètes. Fournis une synthèse globale. Réponds en JSON avec le format : { "synthese_globale": "...", "enjeux": [{ "titre": "...", "importance": "haute|moyenne|basse", "description": "...", "mentions": N, "verbatims": ["..."], "actions": ["..."] }] }`,
          results: [
            {
              score: 1,
              metadata: {
                title: "Comptes rendus d'entretiens",
                text: combinedText,
              },
            },
          ],
        },
      });

      setProgress(80);

      if (error) throw error;

      // Try to parse JSON from the synthesis
      const synthesis = data?.synthesis || "";
      let parsed: AnalysisResult | null = null;

      try {
        // Extract JSON from potential markdown code blocks
        const jsonMatch = synthesis.match(/```json\s*([\s\S]*?)```/) || synthesis.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const jsonStr = jsonMatch[1] || jsonMatch[0];
          parsed = JSON.parse(jsonStr);
        }
      } catch {
        // Fallback: show raw synthesis
        parsed = {
          synthese_globale: synthesis,
          enjeux: [],
        };
      }

      setResult(parsed);
      setProgress(100);
      toast.success("Analyse terminée");
    } catch (err: any) {
      console.error("Analysis error:", err);
      toast.error(err?.message || "Erreur lors de l'analyse");
    } finally {
      setAnalysing(false);
    }
  };

  const toggleExpand = (i: number) => setExpanded((prev) => ({ ...prev, [i]: !prev[i] }));

  const readyCount = files.filter((f) => f.extracted && f.text).length;
  const extracting = files.some((f) => f.extracting);

  const importanceColor = (imp: string) => {
    if (imp === "haute") return "destructive" as const;
    if (imp === "moyenne") return "default" as const;
    return "secondary" as const;
  };

  return (
    <div className="space-y-6">
      {/* Upload zone */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Upload className="h-4 w-4" />
            Comptes rendus d'entretiens
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Uploadez vos comptes rendus d'entretiens stratégiques (.txt, .md, .csv, .docx, .pdf, .pptx).
            L'IA identifiera les enjeux, extraira les verbatims et proposera des pistes d'actions.
          </p>

          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-8 transition-colors hover:border-primary/50 hover:bg-muted/50">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <span className="text-sm font-medium">Cliquez ou glissez vos fichiers ici</span>
            <span className="text-xs text-muted-foreground">
              Formats : {SUPPORTED.map((s) => `.${s}`).join(", ")}
            </span>
            <input
              type="file"
              multiple
              accept={SUPPORTED.map((s) => `.${s}`).join(",")}
              onChange={handleSelect}
              className="hidden"
            />
          </label>

          {/* File list */}
          {files.length > 0 && (
            <div className="space-y-2">
              {files.map((f) => (
                <div key={f.id} className="flex items-center gap-3 rounded-lg border px-3 py-2">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate text-sm">{f.name}</span>
                  {f.extracting && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  {f.extracted && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                  {f.error && (
                    <Badge variant="destructive" className="text-xs">{f.error}</Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {f.text ? `${(f.text.length / 1000).toFixed(0)}k car.` : ""}
                  </span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFile(f.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button onClick={handleAnalyse} disabled={readyCount === 0 || analysing || extracting}>
              {analysing ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  Analyse en cours…
                </>
              ) : (
                <>
                  <Target className="mr-1 h-4 w-4" />
                  Analyser ({readyCount} document{readyCount > 1 ? "s" : ""})
                </>
              )}
            </Button>
            {analysing && <Progress value={progress} className="flex-1" />}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <>
          {/* Global synthesis */}
          {result.synthese_globale && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Synthèse globale</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {result.synthese_globale}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Strategic issues */}
          {result.enjeux.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">
                  Enjeux stratégiques identifiés ({result.enjeux.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.enjeux.map((enjeu, i) => (
                  <div key={i} className="rounded-lg border p-4">
                    <div
                      className="flex cursor-pointer items-center justify-between"
                      onClick={() => toggleExpand(i)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                          {i + 1}
                        </span>
                        <h4 className="font-semibold">{enjeu.titre}</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={importanceColor(enjeu.importance)} className="text-xs">
                          {enjeu.importance}
                        </Badge>
                        {enjeu.mentions > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {enjeu.mentions} mentions
                          </Badge>
                        )}
                        {expanded[i] ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>

                    {expanded[i] && (
                      <div className="mt-3 space-y-3 pl-8">
                        <p className="text-sm text-muted-foreground">{enjeu.description}</p>

                        {enjeu.verbatims.length > 0 && (
                          <div>
                            <p className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              <Quote className="h-3 w-3" /> Verbatims
                            </p>
                            <div className="space-y-1">
                              {enjeu.verbatims.map((v, j) => (
                                <p key={j} className="rounded bg-muted px-3 py-1.5 text-xs italic text-muted-foreground">
                                  « {v} »
                                </p>
                              ))}
                            </div>
                          </div>
                        )}

                        {enjeu.actions.length > 0 && (
                          <div>
                            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              Pistes d'actions
                            </p>
                            <ul className="list-inside list-disc space-y-1 text-xs text-muted-foreground">
                              {enjeu.actions.map((a, j) => (
                                <li key={j}>{a}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
