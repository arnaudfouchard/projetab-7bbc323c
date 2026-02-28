import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Home, TrendingUp, MapPin, Activity } from "lucide-react";

const MOCK_TERRITORIAL = {
  population: 850_000,
  evolution: "+2.3%",
  densite: 312,
  communes: 45,
  cantons: 12,
  accessibilite: {
    medecins: 8.2,
    pharmacies: 4.1,
    urgences_min: 12,
  },
  tranches_age: [
    { label: "0-14 ans", pct: 18.2 },
    { label: "15-29 ans", pct: 16.8 },
    { label: "30-44 ans", pct: 19.5 },
    { label: "45-59 ans", pct: 20.1 },
    { label: "60-74 ans", pct: 15.4 },
    { label: "75 ans et +", pct: 10.0 },
  ],
};

export function ModuleDiagnosticTerritorial() {
  const d = MOCK_TERRITORIAL;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Population", value: d.population.toLocaleString("fr-FR"), sub: d.evolution, icon: Users },
          { label: "Densité", value: `${d.densite} hab/km²`, sub: `${d.communes} communes`, icon: Home },
          { label: "Médecins / 10k hab", value: d.accessibilite.medecins.toString(), sub: "Densité médicale", icon: Activity },
          { label: "Urgences", value: `${d.accessibilite.urgences_min} min`, sub: "Temps d'accès moyen", icon: MapPin },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <item.icon className="h-4 w-4" />
                <span className="text-xs font-medium">{item.label}</span>
              </div>
              <p className="mt-2 text-2xl font-bold">{item.value}</p>
              <p className="text-xs text-muted-foreground">{item.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Répartition par tranche d'âge</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {d.tranches_age.map((t) => (
              <div key={t.label} className="flex items-center gap-3">
                <span className="w-24 text-xs text-muted-foreground">{t.label}</span>
                <div className="flex-1">
                  <div className="h-5 w-full rounded-full bg-secondary">
                    <div
                      className="h-5 rounded-full bg-primary/70"
                      style={{ width: `${t.pct * 4}%` }}
                    />
                  </div>
                </div>
                <span className="w-12 text-right text-xs font-medium">{t.pct}%</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
