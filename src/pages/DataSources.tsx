import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Database, RefreshCw, FileSpreadsheet, Globe, HardDrive } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import { IngestionPanel } from "@/components/modules/IngestionPanel";

interface DataSource {
  id: string;
  name: string;
  description: string;
  source: string;
  sourceUrl?: string;
  format: string;
  dataDate: string;
  lastUpdate: string;
  recordCount: number;
  status: "ok" | "stale" | "error";
}

const MOCK_DATA_SOURCES: DataSource[] = [
  {
    id: "finess",
    name: "FINESS — Établissements",
    description: "Fichier national des établissements sanitaires et sociaux",
    source: "data.gouv.fr",
    sourceUrl: "https://www.data.gouv.fr/fr/datasets/finess-extraction-du-fichier-des-etablissements/",
    format: "CSV / SQLite",
    dataDate: "2025-12-01",
    lastUpdate: "2026-01-15",
    recordCount: 102458,
    status: "ok",
  },
  {
    id: "sae",
    name: "SAE — Capacités",
    description: "Statistique annuelle des établissements de santé (lits, places, urgences)",
    source: "DREES / opendatasoft",
    format: "Parquet",
    dataDate: "2023",
    lastUpdate: "2026-01-10",
    recordCount: 45200,
    status: "ok",
  },
  {
    id: "hospi_diag",
    name: "Hospi Diag",
    description: "Indicateurs qualité et performance hospitalière",
    source: "data.gouv.fr",
    format: "Parquet",
    dataDate: "2022",
    lastUpdate: "2025-11-20",
    recordCount: 38000,
    status: "stale",
  },
  {
    id: "insee",
    name: "INSEE — Population",
    description: "Données démographiques et centroïdes communaux",
    source: "INSEE / geo.api.gouv.fr",
    format: "Parquet",
    dataDate: "2021",
    lastUpdate: "2026-01-12",
    recordCount: 34968,
    status: "ok",
  },
  {
    id: "ght",
    name: "GHT",
    description: "Groupements hospitaliers de territoire",
    source: "DGOS (Excel)",
    format: "SQLite",
    dataDate: "2024",
    lastUpdate: "2026-02-01",
    recordCount: 137,
    status: "ok",
  },
  {
    id: "certification_has",
    name: "Certification HAS",
    description: "Résultats de certification 2014-2020",
    source: "HAS (Excel)",
    format: "SQLite",
    dataDate: "2014-2020",
    lastUpdate: "2026-02-01",
    recordCount: 2800,
    status: "ok",
  },
  {
    id: "pe_pm",
    name: "Bibliothèque PE/PM/PMS",
    description: "Projets d'établissement et projets médicaux indexés",
    source: "arnaudfouchard/pe_pms (GitHub)",
    format: "PDF → Pinecone",
    dataDate: "2015-2025",
    lastUpdate: "2026-02-20",
    recordCount: 52,
    status: "ok",
  },
  {
    id: "axes",
    name: "Axes stratégiques",
    description: "Axes et sous-axes extraits des PE/PM existants",
    source: "Extraction automatique",
    format: "SQLite",
    dataDate: "2015-2025",
    lastUpdate: "2026-02-20",
    recordCount: 224,
    status: "ok",
  },
];

function StatusDot({ status }: { status: DataSource["status"] }) {
  const colors = {
    ok: "bg-green-500",
    stale: "bg-yellow-500",
    error: "bg-destructive",
  };
  const labels = { ok: "À jour", stale: "Ancien", error: "Erreur" };
  return (
    <span className="flex items-center gap-1.5 text-xs">
      <span className={`h-2 w-2 rounded-full ${colors[status]}`} />
      {labels[status]}
    </span>
  );
}

const formatIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  "CSV / SQLite": HardDrive,
  "Parquet": FileSpreadsheet,
  "SQLite": HardDrive,
  "PDF → Pinecone": Globe,
};

export default function DataSources() {
  const navigate = useNavigate();

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
        <Button variant="outline" size="sm">
          <RefreshCw className="mr-1 h-4 w-4" /> Actualiser
        </Button>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="ingestion">Indexation Pinecone</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{MOCK_DATA_SOURCES.length}</p>
                <p className="text-xs text-muted-foreground">Sources</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{MOCK_DATA_SOURCES.reduce((s, d) => s + d.recordCount, 0).toLocaleString("fr-FR")}</p>
                <p className="text-xs text-muted-foreground">Enregistrements</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{MOCK_DATA_SOURCES.filter((d) => d.status === "ok").length}</p>
                <p className="text-xs text-muted-foreground">À jour</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-yellow-600">{MOCK_DATA_SOURCES.filter((d) => d.status === "stale").length}</p>
                <p className="text-xs text-muted-foreground">À actualiser</p>
              </CardContent>
            </Card>
          </div>

          {/* Table */}
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead>Date des données</TableHead>
                  <TableHead>Dernière MAJ</TableHead>
                  <TableHead className="text-right">Enregistrements</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_DATA_SOURCES.map((ds) => (
                  <TableRow key={ds.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{ds.name}</p>
                        <p className="text-xs text-muted-foreground">{ds.description}</p>
                        <p className="mt-0.5 text-xs text-accent">{ds.source}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs font-mono">{ds.format}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{ds.dataDate}</TableCell>
                    <TableCell className="text-sm">{ds.lastUpdate}</TableCell>
                    <TableCell className="text-right text-sm font-medium">{ds.recordCount.toLocaleString("fr-FR")}</TableCell>
                    <TableCell><StatusDot status={ds.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="ingestion">
          <IngestionPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
