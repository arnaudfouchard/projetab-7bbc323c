import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRightLeft } from "lucide-react";

const MOCK_AXES = [
  { axe: "Parcours patient", mentions: 42, sous_axes: ["Parcours ambulatoire", "Parcours gériatrique", "Parcours oncologique"] },
  { axe: "Attractivité et coopérations", mentions: 38, sous_axes: ["Coopérations territoriales", "Filières de soins", "Image et communication"] },
  { axe: "Innovation et recherche", mentions: 31, sous_axes: ["Recherche clinique", "E-santé", "Intelligence artificielle"] },
  { axe: "Ressources humaines", mentions: 29, sous_axes: ["Attractivité RH", "Qualité de vie au travail", "Formation continue"] },
  { axe: "Qualité et sécurité des soins", mentions: 27, sous_axes: ["Gestion des risques", "Certification HAS", "Indicateurs IQSS"] },
  { axe: "Développement durable", mentions: 18, sous_axes: ["Transition écologique", "Responsabilité sociétale"] },
];

export function ModuleAxesStrategiques() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Axes stratégiques identifiés — Benchmark de 52 PE/PM</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {MOCK_AXES.map((a, i) => (
              <div key={a.axe} className="rounded-lg border p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                      {i + 1}
                    </span>
                    <h4 className="font-semibold">{a.axe}</h4>
                  </div>
                  <Badge variant="secondary">{a.mentions} mentions</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {a.sous_axes.map((sa) => (
                    <Badge key={sa} variant="outline" className="text-xs">
                      {sa}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
