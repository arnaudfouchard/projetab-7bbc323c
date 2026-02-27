import { useState } from "react";
import { ArrowLeft, FileText, Users, BarChart3, Search, Upload, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const MOCK_DOCS = [
  { id: "1", title: "PE CHU Bordeaux 2020-2025", type: "PE", region: "Nouvelle-Aquitaine", period: "2020-2025", etab: "CHR/U" },
  { id: "2", title: "PM Centre Hospitalier de Pau 2021-2026", type: "PM", region: "Nouvelle-Aquitaine", period: "2021-2026", etab: "CH" },
  { id: "3", title: "PMS GHT Pays Basque 2019-2024", type: "PMS", region: "Nouvelle-Aquitaine", period: "2019-2024", etab: "GHT" },
  { id: "4", title: "PE AP-HP 2021-2025", type: "PE", region: "Île-de-France", period: "2021-2025", etab: "CHR/U" },
  { id: "5", title: "PM CHU Toulouse 2022-2027", type: "PM", region: "Occitanie", period: "2022-2027", etab: "CHR/U" },
  { id: "6", title: "PE Hospices Civils de Lyon 2020-2024", type: "PE", region: "Auvergne-Rhône-Alpes", period: "2020-2024", etab: "CHR/U" },
];

export default function Explore() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredDocs = MOCK_DOCS.filter(
    (d) =>
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.region.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container max-w-5xl py-10">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/")}
        className="mb-6 text-muted-foreground"
      >
        <ArrowLeft className="mr-1 h-4 w-4" /> Retour
      </Button>

      <div className="mb-8 animate-fade-in">
        <h1 className="font-display text-2xl font-bold">Explorer</h1>
        <p className="mt-1 text-muted-foreground">
          Recherchez dans les documents PE/PM/PMS, entretiens et diagnostics
        </p>
      </div>

      <Tabs defaultValue="documents" className="animate-fade-in">
        <TabsList className="mb-6 w-full justify-start">
          <TabsTrigger value="documents" className="gap-1.5">
            <FileText className="h-4 w-4" /> Documents PE/PMS
          </TabsTrigger>
          <TabsTrigger value="interviews" className="gap-1.5">
            <Users className="h-4 w-4" /> Entretiens
          </TabsTrigger>
          <TabsTrigger value="diagnostics" className="gap-1.5">
            <BarChart3 className="h-4 w-4" /> Diagnostic médical
          </TabsTrigger>
        </TabsList>

        {/* Documents tab */}
        <TabsContent value="documents">
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher un document (nom, région, type…)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {filteredDocs.map((doc) => (
              <Card key={doc.id} className="card-hover cursor-pointer">
                <CardContent className="p-4">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold leading-tight">{doc.title}</h3>
                    <Badge variant="outline" className="shrink-0 text-xs">
                      {doc.type}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>{doc.region}</span>
                    <span>•</span>
                    <span>{doc.period}</span>
                    <span>•</span>
                    <span>{doc.etab}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredDocs.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">
              <FileText className="mx-auto mb-3 h-8 w-8 opacity-40" />
              <p>Aucun document trouvé</p>
            </div>
          )}
        </TabsContent>

        {/* Interviews tab */}
        <TabsContent value="interviews">
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              <Upload className="mb-3 h-8 w-8 opacity-40" />
              <p className="font-medium">Gestion des entretiens</p>
              <p className="mt-1 text-sm">
                Uploadez et analysez des comptes-rendus d'entretiens (PDF, DOCX, MD).
              </p>
              <Button variant="outline" size="sm" className="mt-4">
                <Upload className="mr-1 h-4 w-4" /> Importer un entretien
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Diagnostics tab */}
        <TabsContent value="diagnostics">
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              <BarChart3 className="mb-3 h-8 w-8 opacity-40" />
              <p className="font-medium">Diagnostic médical</p>
              <p className="mt-1 text-sm">
                Importez et consultez les données diagnostiques de vos établissements.
              </p>
              <Button variant="outline" size="sm" className="mt-4">
                <Clock className="mr-1 h-4 w-4" /> Bientôt disponible
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
