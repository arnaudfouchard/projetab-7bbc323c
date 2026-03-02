import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, MapPin, TrendingUp, Activity, GitMerge,
  Target, CalendarDays, Search, FolderOpen, AlertTriangle, Check,
  Building2, Bed, Users, Stethoscope, Loader2, Pencil,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MODULES, EXPLORATION_ONLY_MODULES } from "@/lib/constants";
import type { ModuleId } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

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
  const [searchParams] = useSearchParams();
  const finess = searchParams.get("finess");
  const entityName = searchParams.get("name");
  const [selected, setSelected] = useState<ModuleId | null>(null);

  // If no finess at all, redirect to entity selection
  if (!finess) {
    navigate("/projects/select-entity?mode=exploration", { replace: true });
    return null;
  }

  // Fetch identity card for the sidebar
  const { data: identity } = useQuery({
    queryKey: ["etablissement", finess],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("etablissements")
        .select("*")
        .eq("finess_geo", finess!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!finess,
  });

  const handleExplore = () => {
    if (!selected) return;
    const moduleSlug = selected === "explorer_base" ? "base" : selected;
    navigate(`/explore/${moduleSlug}?finess=${finess}&name=${encodeURIComponent(entityName || "")}`);
  };

  // ─── Module view: /explore/:module?finess=...&name=... ───
  if (module) {
    const moduleId = (module === "base" ? "explorer_base" : module) as ModuleId;
    const moduleDef = allModules.find((m) => m.id === moduleId);
    const ModuleContent = moduleComponents[moduleId];

    if (!moduleDef || !ModuleContent) {
      return (
        <div className="container max-w-4xl py-10">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/explore?finess=${finess}&name=${encodeURIComponent(entityName || "")}`)} className="mb-6 text-muted-foreground">
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

    const Icon = iconMap[moduleDef.icon] || MapPin;

    return (
      <div className="min-h-screen">
        {/* Top bar */}
        <div className="border-b bg-card">
          <div className="container flex items-center gap-3 py-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/explore?finess=${finess}&name=${encodeURIComponent(entityName || "")}`)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1">
              <h1 className="font-display text-lg font-bold">{entityName || "Exploration"}</h1>
              <p className="text-xs text-muted-foreground">Mode exploration — {moduleDef.label}</p>
            </div>
          </div>
        </div>

        <div className="container py-6">
          <div className="flex flex-col gap-6 lg:flex-row">
            {/* Identity card sidebar */}
            <IdentityCardSidebar identity={identity} />

            {/* Single module tab */}
            <main className="flex-1 min-w-0">
              <Tabs defaultValue={moduleId} className="w-full">
                <TabsList className="mb-6 flex h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
                  <TabsTrigger
                    value={moduleId}
                    className="gap-1.5 rounded-lg border border-accent px-3 py-2 text-xs font-medium bg-accent/10 text-accent-foreground"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {moduleDef.label}
                  </TabsTrigger>
                </TabsList>
                <TabsContent value={moduleId} className="mt-0">
                  <ModuleContent />
                </TabsContent>
              </Tabs>
            </main>
          </div>
        </div>
      </div>
    );
  }

  // ─── Module selector: /explore?finess=...&name=... ───
  return (
    <div className="container max-w-3xl py-10">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/projects/select-entity?mode=exploration")}
        className="mb-6 text-muted-foreground"
      >
        <ArrowLeft className="mr-1 h-4 w-4" /> Retour
      </Button>

      <div className="mb-2 animate-fade-in">
        <h1 className="font-display text-2xl font-bold">Mode exploration</h1>
        <p className="mt-1 text-sm font-medium text-accent">{entityName} — FINESS {finess}</p>
        <p className="mt-1 text-muted-foreground">
          Choisissez le module à explorer
        </p>
      </div>

      <Alert variant="default" className="mb-8 border-accent/30 bg-accent/5">
        <AlertTriangle className="h-4 w-4 text-accent" />
        <AlertDescription className="text-sm text-muted-foreground">
          Les données consultées en mode exploration <span className="font-medium text-foreground">ne sont pas enregistrées</span> dans un projet.
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
        <Button variant="outline" onClick={() => navigate("/projects/select-entity?mode=exploration")}>
          Retour
        </Button>
        <Button disabled={!selected} onClick={handleExplore}>
          Explorer
        </Button>
      </div>
    </div>
  );
}

// ─── Identity Card Sidebar (shared layout) ───
function IdentityCardSidebar({ identity }: { identity: any }) {
  return (
    <aside className="w-full shrink-0 lg:w-80">
      <Card className="sticky top-24">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4 text-accent" />
            Carte d'identité
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {identity ? (
            <>
              <div>
                <p className="font-semibold">{identity.nom}</p>
                <p className="text-muted-foreground">
                  {identity.commune} — {identity.departement || identity.code_departement}
                </p>
                <p className="text-muted-foreground">{identity.region || "—"}</p>
              </div>

              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>FINESS géo.</span>
                  <span className="font-mono font-medium text-foreground">{identity.finess_geo}</span>
                </div>
                {identity.finess_juridique && (
                  <div className="flex justify-between">
                    <span>FINESS jur.</span>
                    <span className="font-mono font-medium text-foreground">{identity.finess_juridique}</span>
                  </div>
                )}
                {identity.ght_nom && (
                  <div className="flex justify-between">
                    <span>GHT</span>
                    <span className="text-right font-medium text-foreground">{identity.ght_nom}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Statut</span>
                  <span className="text-right font-medium text-foreground">{identity.statut_juridique || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Type</span>
                  <span className="text-right font-medium text-foreground">{identity.type_etab || "—"}</span>
                </div>
              </div>

              <Separator />

              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Données clés
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: Bed, label: "Lits", value: identity.nb_lits?.toLocaleString("fr-FR") },
                  { icon: Users, label: "Places", value: identity.nb_places?.toLocaleString("fr-FR") },
                  { icon: Stethoscope, label: "Urgences", value: identity.nb_urgences?.toLocaleString("fr-FR") },
                  { icon: Users, label: "Médicaux", value: identity.effectifs_med?.toLocaleString("fr-FR") },
                ].map(({ icon: Ic, label, value }) => (
                  <div key={label} className="rounded-lg bg-muted p-2.5">
                    <Ic className="mb-1 h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-lg font-bold leading-none">{value || "—"}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-20 w-full" />
            </div>
          )}
        </CardContent>
      </Card>
    </aside>
  );
}
