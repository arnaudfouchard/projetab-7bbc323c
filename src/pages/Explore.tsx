import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, MapPin, TrendingUp, Activity, GitMerge,
  Target, CalendarDays, Search, FolderOpen, AlertTriangle, Check,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MODULES, EXPLORATION_ONLY_MODULES } from "@/lib/constants";
import type { ModuleId } from "@/lib/types";
import { ModuleDiagnosticTerritorial } from "@/components/modules/ModuleDiagnosticTerritorial";
import { ModuleDiagnosticFinancier } from "@/components/modules/ModuleDiagnosticFinancier";
import { ModuleDiagnosticOffreSoins } from "@/components/modules/ModuleDiagnosticOffreSoins";
import { ModuleFusionRegroupement } from "@/components/modules/ModuleFusionRegroupement";
import { ModuleAxesStrategiques } from "@/components/modules/ModuleAxesStrategiques";
import { ModuleFichesActions } from "@/components/modules/ModuleFichesActions";
import { ModuleRechercheDocumentaire } from "@/components/modules/ModuleRechercheDocumentaire";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  MapPin, TrendingUp, Activity, GitMerge, Target, CalendarDays, Search, FolderOpen,
};

const allModules = [...MODULES, ...EXPLORATION_ONLY_MODULES];

const moduleComponents: Record<ModuleId, React.ComponentType> = {
  diagnostic_territorial: ModuleDiagnosticTerritorial,
  diagnostic_financier: ModuleDiagnosticFinancier,
  diagnostic_offre_soins: ModuleDiagnosticOffreSoins,
  fusion_regroupement: ModuleFusionRegroupement,
  analyse_axes_strategiques: ModuleAxesStrategiques,
  fiches_actions_gantt: ModuleFichesActions,
  recherche_documentaire: ModuleRechercheDocumentaire,
  explorer_base: ModuleRechercheDocumentaire,
};

export default function Explore() {
  const navigate = useNavigate();
  const { module } = useParams();
  const [selected, setSelected] = useState<ModuleId | null>(null);

  const handleExplore = () => {
    if (!selected) return;
    navigate(`/projects/select-entity?mode=exploration&module=${selected}`);
  };

  const [searchParams] = useSearchParams();
  const finess = searchParams.get("finess");
  const entityName = searchParams.get("name");

  // Module view (/explore/:module)
  if (module) {
    const moduleId = (module === "base" ? "explorer_base" : module) as ModuleId;
    const moduleDef = allModules.find((m) => m.id === moduleId);
    const ModuleContent = moduleComponents[moduleId];

    if (!moduleDef || !ModuleContent) {
      return (
        <div className="container max-w-4xl py-10">
          <Button variant="ghost" size="sm" onClick={() => navigate("/explore")} className="mb-6 text-muted-foreground">
            <ArrowLeft className="mr-1 h-4 w-4" /> Retour aux modules
          </Button>
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Module introuvable.
            </CardContent>
          </Card>
        </div>
      );
    }

    // Redirect to entity selection if no finess provided
    if (!finess) {
      navigate(`/projects/select-entity?mode=exploration&module=${moduleId}`, { replace: true });
      return null;
    }

    return (
      <div className="container max-w-6xl py-10">
        <Button variant="ghost" size="sm" onClick={() => navigate("/explore")} className="mb-6 text-muted-foreground">
          <ArrowLeft className="mr-1 h-4 w-4" /> Retour aux modules
        </Button>

        <div className="mb-8 animate-fade-in">
          <h1 className="font-display text-2xl font-bold">{moduleDef.label}</h1>
          {entityName && (
            <p className="mt-1 text-sm font-medium text-accent">{entityName} — FINESS {finess}</p>
          )}
          <p className="mt-1 text-muted-foreground">Mode exploration</p>
        </div>

        <ModuleContent />
      </div>
    );
  }

  // Module selector (/explore)
  return (
    <div className="container max-w-3xl py-10">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/")}
        className="mb-6 text-muted-foreground"
      >
        <ArrowLeft className="mr-1 h-4 w-4" /> Retour
      </Button>

      <div className="mb-2 animate-fade-in">
        <h1 className="font-display text-2xl font-bold">Mode exploration</h1>
        <p className="mt-1 text-muted-foreground">
          Explorez librement un module sans créer de projet
        </p>
      </div>

      <Alert variant="default" className="mb-8 border-accent/30 bg-accent/5">
        <AlertTriangle className="h-4 w-4 text-accent" />
        <AlertDescription className="text-sm text-muted-foreground">
          Les données consultées en mode exploration <span className="font-medium text-foreground">ne sont pas enregistrées</span> dans un projet. Pour sauvegarder votre travail, créez un projet depuis le tableau de bord.
        </AlertDescription>
      </Alert>

      <div className="grid gap-3 sm:grid-cols-2">
        {allModules.map((mod, i) => {
          const Icon = iconMap[mod.icon] || MapPin;
          const isActive = selected === mod.id;
          return (
            <Card
              key={mod.id}
              className={`card-hover cursor-pointer animate-fade-in transition-all ${
                isActive ? "border-accent ring-2 ring-accent/20" : ""
              }`}
              style={{ animationDelay: `${i * 50}ms` }}
              onClick={() => setSelected(mod.id)}
            >
              <CardContent className="flex items-start gap-3 p-4">
                <div
                  className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    isActive ? "gold-gradient text-accent-foreground" : "bg-secondary"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold">{mod.label}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">{mod.description}</p>
                </div>
                {isActive && <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-between pt-8">
        <Button variant="outline" onClick={() => navigate("/")}>
          Retour
        </Button>
        <Button disabled={!selected} onClick={handleExplore}>
          Explorer
        </Button>
      </div>
    </div>
  );
}

