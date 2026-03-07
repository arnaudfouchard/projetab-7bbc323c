import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, AlertTriangle } from "lucide-react";

const MOCK_FICHES = [
  {
    axe: "Parcours patient",
    title: "Développement de l'ambulatoire en chirurgie",
    statut: "en_cours",
    pilote: "Dr Martin",
    echeance: "T2 2026",
    actions: 5,
    avancement: 40,
  },
  {
    axe: "Parcours patient",
    title: "Structuration du parcours gériatrique",
    statut: "a_faire",
    pilote: "Mme Dupont",
    echeance: "T4 2026",
    actions: 8,
    avancement: 0,
  },
  {
    axe: "Attractivité RH",
    title: "Plan d'attractivité médicale",
    statut: "en_cours",
    pilote: "DRH",
    echeance: "T3 2026",
    actions: 6,
    avancement: 25,
  },
  {
    axe: "Qualité",
    title: "Préparation certification HAS V2024",
    statut: "en_cours",
    pilote: "Mme Laurent",
    echeance: "T1 2027",
    actions: 12,
    avancement: 60,
  },
];

const statutConfig = {
  en_cours: { label: "En cours", icon: Clock, color: "default" as const },
  a_faire: { label: "À faire", icon: AlertTriangle, color: "secondary" as const },
  termine: { label: "Terminé", icon: CheckCircle2, color: "default" as const },
};

export function ModuleFichesActions(_props: { finessGeo?: string; codeDepartement?: string }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Fiches actions", value: MOCK_FICHES.length },
          { label: "Actions totales", value: MOCK_FICHES.reduce((s, f) => s + f.actions, 0) },
          { label: "Avancement moyen", value: `${Math.round(MOCK_FICHES.reduce((s, f) => s + f.avancement, 0) / MOCK_FICHES.length)}%` },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Fiches actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {MOCK_FICHES.map((f) => {
            const st = statutConfig[f.statut as keyof typeof statutConfig];
            return (
              <div key={f.title} className="rounded-lg border p-4">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-semibold">{f.title}</h4>
                    <p className="text-xs text-muted-foreground">{f.axe} — Pilote : {f.pilote}</p>
                  </div>
                  <Badge variant={st.color} className="shrink-0 text-xs">{st.label}</Badge>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{f.actions} actions</span>
                  <span>Échéance : {f.echeance}</span>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-secondary">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: `${f.avancement}%` }}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
