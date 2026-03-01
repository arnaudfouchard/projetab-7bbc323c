import React, { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search, FileText, Loader2, Brain, Filter, X,
  ChevronDown, ChevronRight, Sparkles, BookOpen,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface SearchResult {
  id: string;
  score: number;
  metadata: {
    title?: string;
    source?: string;
    text?: string;
    content?: string;
    type_document?: string;
    etablissement?: string;
    annee?: string;
    thematique?: string;
    type_etablissement?: string;
    [key: string]: any;
  };
}

interface Filters {
  type_document: string;
  etablissement: string;
  annee: string;
  thematique: string;
  type_etablissement: string;
}

const EMPTY_FILTERS: Filters = {
  type_document: "",
  etablissement: "",
  annee: "",
  thematique: "",
  type_etablissement: "",
};

const TYPE_DOCUMENT_OPTIONS = ["PE", "PM", "PMS", "CPOM", "Autre"];
const TYPE_ETAB_OPTIONS = ["CHR/U", "CH", "ESPIC", "Privé", "EHPAD", "GHT", "Autre"];

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function ModuleRechercheDocumentaire() {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filters>({ ...EMPTY_FILTERS });
  const [showFilters, setShowFilters] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);

  // Synthesis
  const [synthesis, setSynthesis] = useState<string | null>(null);
  const [synthesizing, setSynthesizing] = useState(false);

  const hasActiveFilters = Object.values(filters).some(Boolean);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) {
      toast.error("Saisissez une requête de recherche");
      return;
    }

    setSearching(true);
    setResults([]);
    setSynthesis(null);

    try {
      const activeFilters: Record<string, string> = {};
      Object.entries(filters).forEach(([k, v]) => {
        if (v) activeFilters[k] = v;
      });

      const { data, error } = await supabase.functions.invoke("pinecone-search", {
        body: {
          action: "search",
          query: query.trim(),
          filters: Object.keys(activeFilters).length > 0 ? activeFilters : undefined,
          topK: 10,
        },
      });

      if (error) throw error;

      const matches = data?.matches || [];
      setResults(matches);

      if (matches.length === 0) {
        toast.info("Aucun résultat trouvé");
      } else {
        toast.success(`${matches.length} résultat(s) trouvé(s)`);
      }
    } catch (err: any) {
      console.error("Search error:", err);
      toast.error(err?.message || "Erreur lors de la recherche");
    } finally {
      setSearching(false);
    }
  }, [query, filters]);

  const handleSynthesis = useCallback(async () => {
    if (results.length === 0) return;

    setSynthesizing(true);
    setSynthesis(null);

    try {
      const { data, error } = await supabase.functions.invoke("doc-synthesis", {
        body: {
          query: query.trim(),
          results: results.slice(0, 5).map((r) => ({
            score: r.score,
            metadata: r.metadata,
          })),
        },
      });

      if (error) throw error;
      setSynthesis(data?.synthesis || "Pas de synthèse générée.");
    } catch (err: any) {
      console.error("Synthesis error:", err);
      toast.error(err?.message || "Erreur lors de la synthèse");
    } finally {
      setSynthesizing(false);
    }
  }, [query, results]);

  const clearFilters = () => setFilters({ ...EMPTY_FILTERS });

  const updateFilter = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Search bar */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Recherche sémantique : ex. 'politique ambulatoire en chirurgie'…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10"
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} disabled={searching || !query.trim()}>
              {searching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant={showFilters ? "default" : "outline"}
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="space-y-3 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Filtres par champ
                </p>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 text-xs">
                    <X className="mr-1 h-3 w-3" /> Réinitialiser
                  </Button>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Type de document</label>
                  <Select value={filters.type_document} onValueChange={(v) => updateFilter("type_document", v)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Tous" />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPE_DOCUMENT_OPTIONS.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Établissement</label>
                  <Input
                    placeholder="Nom…"
                    value={filters.etablissement}
                    onChange={(e) => updateFilter("etablissement", e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Année</label>
                  <Input
                    placeholder="Ex: 2024"
                    value={filters.annee}
                    onChange={(e) => updateFilter("annee", e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Thématique</label>
                  <Input
                    placeholder="Ex: parcours patient"
                    value={filters.thematique}
                    onChange={(e) => updateFilter("thematique", e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Type d'établissement</label>
                  <Select value={filters.type_etablissement} onValueChange={(v) => updateFilter("type_etablissement", v)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Tous" />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPE_ETAB_OPTIONS.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results count + synthesis button */}
      {results.length > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {results.length} résultat(s) — Score max : {(results[0].score * 100).toFixed(1)}%
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSynthesis}
            disabled={synthesizing}
          >
            {synthesizing ? (
              <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Synthèse en cours…</>
            ) : (
              <><Sparkles className="mr-1.5 h-3.5 w-3.5" /> Synthèse IA</>
            )}
          </Button>
        </div>
      )}

      {/* AI Synthesis */}
      {synthesis && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Brain className="h-4 w-4 text-primary" />
              Synthèse IA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none text-sm">
              <ReactMarkdown>{synthesis}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search results */}
      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((result) => {
            const meta = result.metadata;
            const isExpanded = expandedDoc === result.id;
            const title = meta.title || meta.source || result.id;
            const text = meta.text || meta.content || "";

            return (
              <Card
                key={result.id}
                className="cursor-pointer transition-colors hover:bg-muted/30"
                onClick={() => setExpandedDoc(isExpanded ? null : result.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      {isExpanded ? (
                        <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-semibold">{title}</h3>
                          <Badge variant="outline" className="text-[10px]">
                            {(result.score * 100).toFixed(1)}%
                          </Badge>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                          {meta.type_document && (
                            <Badge variant="secondary" className="text-[10px]">{meta.type_document}</Badge>
                          )}
                          {meta.etablissement && <span>{meta.etablissement}</span>}
                          {meta.annee && <span>• {meta.annee}</span>}
                          {meta.type_etablissement && <span>• {meta.type_etablissement}</span>}
                          {meta.thematique && <span>• {meta.thematique}</span>}
                        </div>
                        {!isExpanded && text && (
                          <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">
                            {text.substring(0, 200)}…
                          </p>
                        )}
                      </div>
                    </div>
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </div>

                  {isExpanded && (
                    <>
                      <Separator className="my-3" />
                      <div className="space-y-3">
                        {/* Full text content */}
                        {text && (
                          <div>
                            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              Contenu extrait
                            </p>
                            <div className="max-h-[400px] overflow-y-auto rounded-lg bg-muted/30 p-3 text-xs leading-relaxed whitespace-pre-wrap">
                              {text}
                            </div>
                          </div>
                        )}

                        {/* All metadata */}
                        <div>
                          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Métadonnées
                          </p>
                          <div className="grid gap-1.5 text-xs sm:grid-cols-2">
                            {Object.entries(meta)
                              .filter(([k]) => !["text", "content"].includes(k))
                              .map(([key, value]) => (
                                <div key={key} className="flex gap-2">
                                  <span className="text-muted-foreground">{key} :</span>
                                  <span className="font-medium">
                                    {typeof value === "string" ? value : JSON.stringify(value)}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!searching && results.length === 0 && (
        <div className="py-12 text-center text-muted-foreground">
          <BookOpen className="mx-auto mb-3 h-10 w-10 opacity-30" />
          <p className="font-medium">Recherche documentaire</p>
          <p className="mt-1 text-xs max-w-md mx-auto">
            Recherchez dans la base de projets d'établissement et médico-soignants par requête sémantique ou par filtres (type, établissement, année, thématique).
          </p>
        </div>
      )}
    </div>
  );
}
