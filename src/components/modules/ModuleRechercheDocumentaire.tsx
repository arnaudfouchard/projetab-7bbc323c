import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, FileText } from "lucide-react";

const MOCK_DOCS = [
  { id: "1", title: "PE CHU Bordeaux 2020-2025", type: "PE", region: "Nouvelle-Aquitaine", period: "2020-2025", etab: "CHR/U" },
  { id: "2", title: "PM Centre Hospitalier de Pau 2021-2026", type: "PM", region: "Nouvelle-Aquitaine", period: "2021-2026", etab: "CH" },
  { id: "3", title: "PMS GHT Pays Basque 2019-2024", type: "PMS", region: "Nouvelle-Aquitaine", period: "2019-2024", etab: "GHT" },
  { id: "4", title: "PE AP-HP 2021-2025", type: "PE", region: "Île-de-France", period: "2021-2025", etab: "CHR/U" },
  { id: "5", title: "PM CHU Toulouse 2022-2027", type: "PM", region: "Occitanie", period: "2022-2027", etab: "CHR/U" },
  { id: "6", title: "PE Hospices Civils de Lyon 2020-2024", type: "PE", region: "Auvergne-Rhône-Alpes", period: "2020-2024", etab: "CHR/U" },
];

export function ModuleRechercheDocumentaire() {
  const [query, setQuery] = useState("");
  const filtered = MOCK_DOCS.filter(
    (d) =>
      d.title.toLowerCase().includes(query.toLowerCase()) ||
      d.region.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Rechercher un document (nom, région, type…)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {filtered.map((doc) => (
          <Card key={doc.id} className="card-hover cursor-pointer">
            <CardContent className="p-4">
              <div className="mb-2 flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold leading-tight">{doc.title}</h3>
                <Badge variant="outline" className="shrink-0 text-xs">{doc.type}</Badge>
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

      {filtered.length === 0 && (
        <div className="py-12 text-center text-muted-foreground">
          <FileText className="mx-auto mb-3 h-8 w-8 opacity-40" />
          <p>Aucun document trouvé</p>
        </div>
      )}
    </div>
  );
}
