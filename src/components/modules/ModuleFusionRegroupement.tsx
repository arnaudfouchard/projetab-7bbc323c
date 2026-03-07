import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

export function ModuleFusionRegroupement(_props: { finessGeo?: string; codeDepartement?: string }) {
  return (
    <div className="space-y-6">
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
          <AlertTriangle className="mb-3 h-8 w-8 opacity-40" />
          <p className="font-medium">Simulation de fusion / regroupement</p>
          <p className="mt-2 max-w-md text-sm">
            Ce module permet de simuler l'impact d'un transfert d'activité entre
            deux établissements : volumes, temps de trajet, score qualité.
          </p>
          <p className="mt-4 text-xs">
            Sélectionnez un établissement cible pour lancer la simulation.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
