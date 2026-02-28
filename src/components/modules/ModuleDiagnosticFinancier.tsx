import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const MOCK_FINANCIER = {
  chiffre_affaires: 285_000_000,
  resultat_net: 4_200_000,
  taux_marge: 1.5,
  caf: 18_500_000,
  ratios: [
    { label: "Taux de marge brute", value: 3.8, ref: 3.0, unit: "%" },
    { label: "Taux d'endettement", value: 42.1, ref: 50.0, unit: "%" },
    { label: "Durée apparente de la dette", value: 4.2, ref: 5.0, unit: "ans" },
    { label: "Taux de CAF", value: 6.5, ref: 5.0, unit: "%" },
    { label: "Taux de vétusté", value: 68.2, ref: 60.0, unit: "%" },
    { label: "BFR en jours", value: 32, ref: 30, unit: "j" },
  ],
};

export function ModuleDiagnosticFinancier() {
  const d = MOCK_FINANCIER;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Chiffre d'affaires", value: `${(d.chiffre_affaires / 1e6).toFixed(0)} M€` },
          { label: "Résultat net", value: `${(d.resultat_net / 1e6).toFixed(1)} M€` },
          { label: "Taux de marge", value: `${d.taux_marge}%` },
          { label: "CAF", value: `${(d.caf / 1e6).toFixed(1)} M€` },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
              <p className="mt-2 text-2xl font-bold">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Ratios financiers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {d.ratios.map((r) => {
              const isGood = r.label.includes("endettement") || r.label.includes("vétusté") || r.label.includes("BFR")
                ? r.value <= r.ref
                : r.value >= r.ref;
              return (
                <div key={r.label} className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
                  <span className="text-sm">{r.label}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold">{r.value} {r.unit}</span>
                    <Badge variant={isGood ? "default" : "destructive"} className="text-xs">
                      réf. {r.ref} {r.unit}
                    </Badge>
                    {isGood ? (
                      <TrendingUp className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-destructive" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
