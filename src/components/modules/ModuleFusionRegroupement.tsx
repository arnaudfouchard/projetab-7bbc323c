import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GitMerge, Search, MapPin, Users, Clock, TrendingUp,
  Building2, Activity, ArrowRight,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Mock data                                                           */
/* ------------------------------------------------------------------ */

const MOCK_ETABLISSEMENTS_CIBLES = [
  { finess: "750712184", nom: "CH Sud Francilien", commune: "Corbeil-Essonnes" },
  { finess: "750100208", nom: "CH de Melun", commune: "Melun" },
  { finess: "910004107", nom: "CH d'Arpajon", commune: "Arpajon" },
];

const MOCK_ACTIVITES = [
  "Toutes activités",
  "Médecine",
  "Chirurgie",
  "Obstétrique",
  "SSR",
  "Psychiatrie",
  "Urgences",
];

const MOCK_SIMULATION = {
  accessibilite: {
    apl_avant: 3.8,
    apl_apres: 3.2,
    variation: -15.8,
  },
  temps_trajet: {
    p50_avant: 12,
    p50_apres: 22,
    p90_avant: 25,
    p90_apres: 38,
    max_avant: 42,
    max_apres: 65,
  },
  impact_rh: [
    { categorie: "Médecins", etp_source: 45, etp_transferes: 12, pct: 26.7 },
    { categorie: "Infirmiers", etp_source: 180, etp_transferes: 48, pct: 26.7 },
    { categorie: "Aides-soignants", etp_source: 120, etp_transferes: 32, pct: 26.7 },
    { categorie: "Administratifs", etp_source: 60, etp_transferes: 8, pct: 13.3 },
    { categorie: "Médico-techniques", etp_source: 35, etp_transferes: 9, pct: 25.7 },
  ],
  croissance: {
    sejours_transferes: 4_200,
    ca_estime: 12.5,
    taux_occupation_cible_avant: 78,
    taux_occupation_cible_apres: 91,
    capacite_supplementaire: 32,
  },
};

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function ModuleFusionRegroupement() {
  const [cible, setCible] = useState("");
  const [activite, setActivite] = useState("Toutes activités");
  const [tauxTransfert, setTauxTransfert] = useState([50]);
  const [simulated, setSimulated] = useState(false);

  const handleSimulate = () => {
    if (!cible) return;
    setSimulated(true);
  };

  const sim = MOCK_SIMULATION;

  return (
    <div className="space-y-6">
      {/* Configuration panel */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <GitMerge className="h-4 w-4 text-accent" />
            Paramètres de simulation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Établissement cible
              </label>
              <Select value={cible} onValueChange={setCible}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner…" />
                </SelectTrigger>
                <SelectContent>
                  {MOCK_ETABLISSEMENTS_CIBLES.map((e) => (
                    <SelectItem key={e.finess} value={e.finess}>
                      {e.nom} — {e.commune}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Activité concernée
              </label>
              <Select value={activite} onValueChange={setActivite}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MOCK_ACTIVITES.map((a) => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Taux de transfert : {tauxTransfert[0]}%
              </label>
              <Slider
                value={tauxTransfert}
                onValueChange={setTauxTransfert}
                min={10}
                max={100}
                step={5}
                className="mt-3"
              />
            </div>
          </div>

          <Button onClick={handleSimulate} disabled={!cible}>
            <Search className="mr-1 h-4 w-4" />
            Lancer la simulation
          </Button>
        </CardContent>
      </Card>

      {simulated && (
        <>
          {/* Accessibility (APL) */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "APL avant",
                value: sim.accessibilite.apl_avant.toFixed(1),
                icon: MapPin,
                sub: "consultations / hab",
              },
              {
                label: "APL après transfert",
                value: sim.accessibilite.apl_apres.toFixed(1),
                icon: MapPin,
                sub: `${sim.accessibilite.variation > 0 ? "+" : ""}${sim.accessibilite.variation.toFixed(1)}%`,
                alert: sim.accessibilite.variation < -10,
              },
              {
                label: "Séjours transférés",
                value: sim.croissance.sejours_transferes.toLocaleString("fr-FR"),
                icon: Activity,
                sub: `CA estimé : ${sim.croissance.ca_estime} M€`,
              },
              {
                label: "Lits supplémentaires",
                value: sim.croissance.capacite_supplementaire.toString(),
                icon: Building2,
                sub: `Occup. cible : ${sim.croissance.taux_occupation_cible_avant}% → ${sim.croissance.taux_occupation_cible_apres}%`,
              },
            ].map((item) => (
              <Card key={item.label}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <item.icon className="h-4 w-4" />
                    <span className="text-xs font-medium">{item.label}</span>
                  </div>
                  <p className="mt-2 text-2xl font-bold">{item.value}</p>
                  <p className={`text-xs ${item.alert ? "font-semibold text-destructive" : "text-muted-foreground"}`}>
                    {item.sub}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Travel times */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4" />
                Temps de trajet patients (en minutes)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="pb-2 font-medium">Percentile</th>
                      <th className="pb-2 text-right font-medium">Avant</th>
                      <th className="pb-2 text-center font-medium" />
                      <th className="pb-2 text-right font-medium">Après</th>
                      <th className="pb-2 text-right font-medium">Δ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: "Médiane (P50)", avant: sim.temps_trajet.p50_avant, apres: sim.temps_trajet.p50_apres },
                      { label: "P90", avant: sim.temps_trajet.p90_avant, apres: sim.temps_trajet.p90_apres },
                      { label: "Maximum", avant: sim.temps_trajet.max_avant, apres: sim.temps_trajet.max_apres },
                    ].map((row) => (
                      <tr key={row.label} className="border-b last:border-0">
                        <td className="py-2.5 font-medium">{row.label}</td>
                        <td className="py-2.5 text-right">{row.avant} min</td>
                        <td className="py-2.5 text-center text-muted-foreground">
                          <ArrowRight className="mx-auto h-3 w-3" />
                        </td>
                        <td className="py-2.5 text-right font-semibold">{row.apres} min</td>
                        <td className="py-2.5 text-right text-destructive">
                          +{row.apres - row.avant} min
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* HR Impact */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4" />
                Impact sur les ressources humaines
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="pb-2 font-medium">Catégorie</th>
                      <th className="pb-2 text-right font-medium">ETP source</th>
                      <th className="pb-2 text-right font-medium">ETP transférés</th>
                      <th className="pb-2 text-right font-medium">% transféré</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sim.impact_rh.map((r) => (
                      <tr key={r.categorie} className="border-b last:border-0">
                        <td className="py-2.5 font-medium">{r.categorie}</td>
                        <td className="py-2.5 text-right">{r.etp_source}</td>
                        <td className="py-2.5 text-right font-semibold">{r.etp_transferes}</td>
                        <td className="py-2.5 text-right">
                          <Badge variant={r.pct > 25 ? "destructive" : "secondary"} className="text-xs">
                            {r.pct.toFixed(1)}%
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Growth potential */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <TrendingUp className="h-4 w-4" />
                Potentiel de croissance de l'activité
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg bg-muted p-4 text-center">
                  <p className="text-2xl font-bold">{sim.croissance.sejours_transferes.toLocaleString("fr-FR")}</p>
                  <p className="text-xs text-muted-foreground">Séjours transférés / an</p>
                </div>
                <div className="rounded-lg bg-muted p-4 text-center">
                  <p className="text-2xl font-bold">{sim.croissance.ca_estime} M€</p>
                  <p className="text-xs text-muted-foreground">CA estimé supplémentaire</p>
                </div>
                <div className="rounded-lg bg-muted p-4 text-center">
                  <p className="text-2xl font-bold">
                    {sim.croissance.taux_occupation_cible_avant}%
                    <span className="mx-1 text-base text-muted-foreground">→</span>
                    {sim.croissance.taux_occupation_cible_apres}%
                  </p>
                  <p className="text-xs text-muted-foreground">Taux d'occupation cible</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
