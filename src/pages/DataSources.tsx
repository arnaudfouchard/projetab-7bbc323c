import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Database, RefreshCw, Play, Loader2 } from "lucide-react";
import { importAldNational, importAldDepartement } from "@/lib/import-ald";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import { IngestionPanel } from "@/components/modules/IngestionPanel";
import { XlsxImportPanel } from "@/components/modules/XlsxImportPanel";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface DataSource {
  id: string;
  name: string;
  description: string | null;
  source: string | null;
  source_url: string | null;
  format: string | null;
  data_date: string | null;
  last_update: string | null;
  record_count: number;
  status: string;
}

const IMPORTABLE: Record<string, string> = {
  finess: "import-finess",
  certification_has: "import-has-certification",
  insee: "import-population",
};

// ALD sources that use client-side import from bundled files
const ALD_SOURCES = ["ald", "ald_national"];

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ok: "bg-green-500",
    stale: "bg-yellow-500",
    error: "bg-destructive",
    pending: "bg-muted-foreground",
  };
  const labels: Record<string, string> = { ok: "À jour", stale: "Ancien", error: "Erreur", pending: "En attente" };
  return (
    <span className="flex items-center gap-1.5 text-xs">
      <span className={`h-2 w-2 rounded-full ${colors[status] || colors.pending}`} />
      {labels[status] || status}
    </span>
  );
}

export default function DataSources() {
  const navigate = useNavigate();
  const [importing, setImporting] = useState<string | null>(null);

  const { data: sources = [], isLoading, refetch } = useQuery({
    queryKey: ["data-sources"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("data_sources")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as DataSource[];
    },
  });

  const runImport = async (sourceId: string) => {
    // Client-side ALD import
    if (sourceId === "ald" || sourceId === "ald_national") {
      setImporting(sourceId);
      try {
        toast.info(`Import ALD lancé…`);
        const importFn = sourceId === "ald" ? importAldDepartement : importAldNational;
        const result = await importFn((msg) => console.log(`[ALD] ${msg}`));
        toast.success(`Import terminé : ${result.imported} enregistrements (${result.errors} erreurs)`);
        if (result.errors > 0) {
          console.warn("Colonnes détectées:", result.headers);
        }
        refetch();
      } catch (err: any) {
        toast.error(`Erreur import ALD : ${err.message}`);
      } finally {
        setImporting(null);
      }
      return;
    }

    const funcName = IMPORTABLE[sourceId];
    if (!funcName) return;
    setImporting(sourceId);
    try {
      toast.info(`Import ${sourceId} lancé…`);
      const { data, error } = await supabase.functions.invoke(funcName, {
        body: {},
      });
      if (error) throw error;
      toast.success(`Import terminé : ${data?.imported ?? 0} enregistrements`);
      refetch();
    } catch (err: any) {
      toast.error(`Erreur import : ${err.message}`);
    } finally {
      setImporting(null);
    }
  };

  return (
    <div className="container max-w-6xl py-10">
      <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="mb-6 text-muted-foreground">
        <ArrowLeft className="mr-1 h-4 w-4" /> Retour
      </Button>

      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <Database className="h-6 w-6 text-accent" />
            Données en base
          </h1>
          <p className="mt-1 text-muted-foreground">
            Vue d'ensemble des sources de données disponibles, leur format et leur fraîcheur
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="mr-1 h-4 w-4" /> Actualiser
        </Button>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="xlsx">Import XLSX</TabsTrigger>
          <TabsTrigger value="ingestion">Indexation Pinecone</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{isLoading ? "…" : sources.length}</p>
                <p className="text-xs text-muted-foreground">Sources</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{isLoading ? "…" : sources.reduce((s, d) => s + (d.record_count || 0), 0).toLocaleString("fr-FR")}</p>
                <p className="text-xs text-muted-foreground">Enregistrements</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{isLoading ? "…" : sources.filter((d) => d.status === "ok").length}</p>
                <p className="text-xs text-muted-foreground">À jour</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-yellow-600">{isLoading ? "…" : sources.filter((d) => d.status === "pending").length}</p>
                <p className="text-xs text-muted-foreground">En attente</p>
              </CardContent>
            </Card>
          </div>

          {/* Table */}
          <Card>
            {isLoading ? (
              <div className="p-6 space-y-3">
                {[1,2,3,4].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead>Format</TableHead>
                    <TableHead>Date des données</TableHead>
                    <TableHead>Dernière MAJ</TableHead>
                    <TableHead className="text-right">Enregistrements</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sources.map((ds) => (
                    <TableRow key={ds.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{ds.name}</p>
                          <p className="text-xs text-muted-foreground">{ds.description}</p>
                          <p className="mt-0.5 text-xs text-accent">{ds.source}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs font-mono">{ds.format || "—"}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{ds.data_date || "—"}</TableCell>
                      <TableCell className="text-sm">{ds.last_update ? new Date(ds.last_update).toLocaleDateString("fr-FR") : "—"}</TableCell>
                      <TableCell className="text-right text-sm font-medium">{(ds.record_count || 0).toLocaleString("fr-FR")}</TableCell>
                      <TableCell><StatusDot status={ds.status} /></TableCell>
                      <TableCell>
                        {IMPORTABLE[ds.id] && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={importing !== null}
                            onClick={() => runImport(ds.id)}
                          >
                            {importing === ds.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Play className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="xlsx">
          <XlsxImportPanel onImportDone={() => refetch()} />
        </TabsContent>

        <TabsContent value="ingestion">
          <IngestionPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
