import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Home, Activity, MapPin } from "lucide-react";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

interface Props {
  finessGeo?: string;
  codeDepartement?: string;
}

const MOCK_TERRITORIAL = {
  population: 850_000,
  evolution: "+2.3%",
  densite: 312,
  communes: 45,
  accessibilite: { medecins: 8.2, pharmacies: 4.1, urgences_min: 12 },
  tranches_age: [
    { label: "0-14 ans", pct: 18.2 },
    { label: "15-29 ans", pct: 16.8 },
    { label: "30-44 ans", pct: 19.5 },
    { label: "45-59 ans", pct: 20.1 },
    { label: "60-74 ans", pct: 15.4 },
    { label: "75 ans et +", pct: 10.0 },
  ],
};

export function ModuleDiagnosticTerritorial({ codeDepartement }: Props) {
  // Fetch real population data aggregated by department
  const { data: popData, isLoading } = useQuery({
    queryKey: ["pop-departement", codeDepartement],
    queryFn: () => api.get(`/population/${codeDepartement}`),
    enabled: !!codeDepartement,
  });

  // Compute aggregates from real data or fall back to mock
  const hasRealData = popData && popData.length > 0;

  let d: typeof MOCK_TERRITORIAL;

  if (hasRealData) {
    const totalPop = popData.reduce((s, r) => s + (r.population || 0), 0);
    const pop0_14 = popData.reduce((s, r) => s + (r.population_0_14 || 0), 0);
    const pop15_29 = popData.reduce((s, r) => s + (r.population_15_29 || 0), 0);
    const pop30_44 = popData.reduce((s, r) => s + (r.population_30_44 || 0), 0);
    const pop45_59 = popData.reduce((s, r) => s + (r.population_45_59 || 0), 0);
    const pop60_74 = popData.reduce((s, r) => s + (r.population_60_74 || 0), 0);
    const pop75 = popData.reduce((s, r) => s + (r.population_75_plus || 0), 0);
    const avgDensite =
      popData.reduce((s, r) => s + (r.densite || 0), 0) / popData.length;

    const pct = (v: number) =>
      totalPop > 0 ? Math.round((v / totalPop) * 1000) / 10 : 0;

    d = {
      population: totalPop,
      evolution: "—",
      densite: Math.round(avgDensite),
      communes: popData.length,
      accessibilite: MOCK_TERRITORIAL.accessibilite, // no real source yet
      tranches_age: [
        { label: "0-14 ans", pct: pct(pop0_14) },
        { label: "15-29 ans", pct: pct(pop15_29) },
        { label: "30-44 ans", pct: pct(pop30_44) },
        { label: "45-59 ans", pct: pct(pop45_59) },
        { label: "60-74 ans", pct: pct(pop60_74) },
        { label: "75 ans et +", pct: pct(pop75) },
      ],
    };
  } else {
    d = MOCK_TERRITORIAL;
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!hasRealData && codeDepartement && (
        <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-300">
          Donnees population non disponibles pour ce departement — affichage mock
        </Badge>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Population", value: d.population.toLocaleString("fr-FR"), sub: d.evolution, icon: Users },
          { label: "Densite", value: `${d.densite} hab/km²`, sub: `${d.communes} communes`, icon: Home },
          { label: "Medecins / 10k hab", value: d.accessibilite.medecins.toString(), sub: "Densite medicale", icon: Activity },
          { label: "Urgences", value: `${d.accessibilite.urgences_min} min`, sub: "Temps d'acces moyen", icon: MapPin },
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
          <CardTitle className="text-sm">Repartition par tranche d'age</CardTitle>
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
