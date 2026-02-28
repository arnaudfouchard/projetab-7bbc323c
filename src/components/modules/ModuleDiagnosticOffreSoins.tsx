import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const MOCK_OFFRE = {
  activites: [
    { discipline: "Médecine", sejours: 18_420, evolution: "+3.2%", pdm: 34.5 },
    { discipline: "Chirurgie", sejours: 12_800, evolution: "-1.1%", pdm: 28.2 },
    { discipline: "Obstétrique", sejours: 3_200, evolution: "+0.8%", pdm: 52.1 },
    { discipline: "SSR", sejours: 4_100, evolution: "+5.6%", pdm: 22.4 },
    { discipline: "Psychiatrie", sejours: 2_900, evolution: "+1.9%", pdm: 18.7 },
  ],
  indicateurs: [
    { label: "Taux d'occupation MCO", value: "87.3%", statut: "normal" },
    { label: "DMS médecine", value: "5.2 j", statut: "normal" },
    { label: "Taux ambulatoire chirurgie", value: "62.1%", statut: "warning" },
    { label: "IP-DMS", value: "0.98", statut: "normal" },
  ],
};

export function ModuleDiagnosticOffreSoins() {
  const d = MOCK_OFFRE;
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Activité par discipline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="pb-2 font-medium">Discipline</th>
                  <th className="pb-2 text-right font-medium">Séjours</th>
                  <th className="pb-2 text-right font-medium">Évolution</th>
                  <th className="pb-2 text-right font-medium">Part de marché</th>
                </tr>
              </thead>
              <tbody>
                {d.activites.map((a) => (
                  <tr key={a.discipline} className="border-b last:border-0">
                    <td className="py-2.5 font-medium">{a.discipline}</td>
                    <td className="py-2.5 text-right">{a.sejours.toLocaleString("fr-FR")}</td>
                    <td className="py-2.5 text-right">
                      <span className={a.evolution.startsWith("+") ? "text-emerald-600" : "text-destructive"}>
                        {a.evolution}
                      </span>
                    </td>
                    <td className="py-2.5 text-right">{a.pdm}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {d.indicateurs.map((ind) => (
          <Card key={ind.label}>
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground">{ind.label}</p>
              <p className="mt-2 text-2xl font-bold">{ind.value}</p>
              <Badge variant={ind.statut === "warning" ? "destructive" : "secondary"} className="mt-1 text-xs">
                {ind.statut === "warning" ? "Attention" : "Normal"}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
