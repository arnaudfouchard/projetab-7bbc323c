import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

interface Props {
  finessGeo?: string;
  codeDepartement?: string;
}

const MOCK_OFFRE = {
  activites: [
    { discipline: "Medecine", sejours: 18_420, evolution: "+3.2%", pdm: 34.5 },
    { discipline: "Chirurgie", sejours: 12_800, evolution: "-1.1%", pdm: 28.2 },
    { discipline: "Obstetrique", sejours: 3_200, evolution: "+0.8%", pdm: 52.1 },
    { discipline: "SSR", sejours: 4_100, evolution: "+5.6%", pdm: 22.4 },
    { discipline: "Psychiatrie", sejours: 2_900, evolution: "+1.9%", pdm: 18.7 },
  ],
  indicateurs: [
    { label: "Taux d'occupation MCO", value: "87.3%", statut: "normal" },
    { label: "DMS medecine", value: "5.2 j", statut: "normal" },
    { label: "Taux ambulatoire chirurgie", value: "62.1%", statut: "warning" },
    { label: "IP-DMS", value: "0.98", statut: "normal" },
  ],
};

export function ModuleDiagnosticOffreSoins({ finessGeo }: Props) {
  // Fetch SAE data for this establishment
  const { data: saeData, isLoading } = useQuery({
    queryKey: ["sae-etab", finessGeo],
    queryFn: async () => {
      const data = await api.get<any[]>(`/sae/${finessGeo}`);
      return data?.[0] || null;
    },
    enabled: !!finessGeo,
  });

  // Fetch certification HAS
  const { data: certifData } = useQuery({
    queryKey: ["certif-etab", finessGeo],
    queryFn: async () => {
      const data = await api.get<any[]>(`/certification/${finessGeo}`);
      return data?.[0] || null;
    },
    enabled: !!finessGeo,
  });

  const hasRealData = !!saeData;

  // Build display data from SAE or mock
  const activites = hasRealData
    ? [
        { discipline: "Medecine", sejours: saeData.nb_lits_medecine ?? 0, evolution: "—", pdm: 0 },
        { discipline: "Chirurgie", sejours: saeData.nb_lits_chirurgie ?? 0, evolution: "—", pdm: 0 },
        { discipline: "Obstetrique", sejours: saeData.nb_lits_obstetrique ?? 0, evolution: "—", pdm: 0 },
        { discipline: "SSR", sejours: saeData.nb_lits_ssr ?? 0, evolution: "—", pdm: 0 },
        { discipline: "Psychiatrie", sejours: saeData.nb_lits_psy ?? 0, evolution: "—", pdm: 0 },
      ]
    : MOCK_OFFRE.activites;

  const indicateurs = hasRealData
    ? [
        {
          label: "Taux ambulatoire",
          value: saeData.taux_ambulatoire != null ? `${saeData.taux_ambulatoire}%` : "—",
          statut: saeData.taux_ambulatoire != null && saeData.taux_ambulatoire < 60 ? "warning" : "normal",
        },
        {
          label: "DMS",
          value: saeData.duree_moyenne_sejour != null ? `${saeData.duree_moyenne_sejour} j` : "—",
          statut: "normal",
        },
        {
          label: "Lits totaux",
          value: saeData.nb_lits_total?.toLocaleString("fr-FR") ?? "—",
          statut: "normal",
        },
        {
          label: "Passages urgences",
          value: saeData.nb_passages_urgences?.toLocaleString("fr-FR") ?? "—",
          statut: "normal",
        },
      ]
    : MOCK_OFFRE.indicateurs;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full" />
        <div className="grid gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!hasRealData && finessGeo && (
        <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-300">
          Donnees SAE non disponibles pour cet etablissement — affichage mock
        </Badge>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">
              {hasRealData ? `Capacites par discipline (SAE ${saeData.annee})` : "Activite par discipline"}
            </CardTitle>
            {certifData && (
              <Badge variant="secondary" className="text-xs">
                Certification HAS : {certifData.decision || "—"} ({certifData.annee_visite})
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="pb-2 font-medium">Discipline</th>
                  <th className="pb-2 text-right font-medium">
                    {hasRealData ? "Lits" : "Sejours"}
                  </th>
                  <th className="pb-2 text-right font-medium">Evolution</th>
                  {!hasRealData && <th className="pb-2 text-right font-medium">Part de marche</th>}
                </tr>
              </thead>
              <tbody>
                {activites.map((a) => (
                  <tr key={a.discipline} className="border-b last:border-0">
                    <td className="py-2.5 font-medium">{a.discipline}</td>
                    <td className="py-2.5 text-right">{a.sejours.toLocaleString("fr-FR")}</td>
                    <td className="py-2.5 text-right">
                      <span className={a.evolution.startsWith("+") ? "text-emerald-600" : a.evolution.startsWith("-") ? "text-destructive" : ""}>
                        {a.evolution}
                      </span>
                    </td>
                    {!hasRealData && <td className="py-2.5 text-right">{a.pdm}%</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {certifData && (certifData.score_patient != null || certifData.score_equipes != null) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Scores Certification HAS ({certifData.annee_visite})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { label: "Score Patient", value: certifData.score_patient },
                { label: "Score Equipes", value: certifData.score_equipes },
                { label: "Score Etablissement", value: certifData.score_etablissement },
              ].map((s) => (
                <div key={s.label} className="rounded-lg border p-3 text-center">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="mt-1 text-2xl font-bold">
                    {s.value != null ? `${s.value}%` : "—"}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {indicateurs.map((ind) => (
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
