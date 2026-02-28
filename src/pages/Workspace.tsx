import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  MapPin, TrendingUp, Activity, GitMerge, Target,
  CalendarDays, Search, ArrowLeft, Pencil, Trash2,
  Building2, Bed, Users, Stethoscope, ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/StatusBadge";
import { MODULES } from "@/lib/constants";
import { MOCK_PROJECTS, MOCK_IDENTITY_CARD } from "@/lib/mock-data";
import type { ModuleId } from "@/lib/types";

import { ModuleDiagnosticTerritorial } from "@/components/modules/ModuleDiagnosticTerritorial";
import { ModuleDiagnosticFinancier } from "@/components/modules/ModuleDiagnosticFinancier";
import { ModuleDiagnosticOffreSoins } from "@/components/modules/ModuleDiagnosticOffreSoins";
import { ModuleFusionRegroupement } from "@/components/modules/ModuleFusionRegroupement";
import { ModuleAxesStrategiques } from "@/components/modules/ModuleAxesStrategiques";
import { ModuleFichesActions } from "@/components/modules/ModuleFichesActions";
import { ModuleRechercheDocumentaire } from "@/components/modules/ModuleRechercheDocumentaire";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  MapPin, TrendingUp, Activity, GitMerge, Target, CalendarDays, Search,
};

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

export default function Workspace() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const project = MOCK_PROJECTS.find((p) => p.id === id) || MOCK_PROJECTS[0];
  const customName = searchParams.get("projectName");
  const displayName = customName ? decodeURIComponent(customName) : project.name;
  const identity = MOCK_IDENTITY_CARD;

  const projectModules = MODULES.filter((m) => project.modules.includes(m.id));
  const defaultTab = projectModules[0]?.id || "diagnostic_territorial";

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <div className="border-b bg-card">
        <div className="container flex items-center gap-3 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="font-display text-lg font-bold">{displayName}</h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <StatusBadge status={project.status} />
              <span>{project.region}</span>
            </div>
          </div>
          <Button variant="outline" size="sm">
            <Pencil className="mr-1 h-3 w-3" /> Modifier
          </Button>
        </div>
      </div>

      <div className="container py-6">
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Identity card sidebar */}
          <aside className="w-full shrink-0 lg:w-80">
            <Card className="sticky top-24">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="h-4 w-4 text-accent" />
                  Carte d'identité
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <p className="font-semibold">{identity.nom}</p>
                  <p className="text-muted-foreground">
                    {identity.commune} — {identity.departement}
                  </p>
                  <p className="text-muted-foreground">{identity.region}</p>
                </div>

                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>FINESS géo.</span>
                    <span className="font-mono font-medium text-foreground">{identity.finess_geo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>FINESS jur.</span>
                    <span className="font-mono font-medium text-foreground">{identity.finess_juridique}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GHT</span>
                    <span className="text-right font-medium text-foreground">{identity.ght}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Statut</span>
                    <span className="text-right font-medium text-foreground">{identity.statut_juridique}</span>
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

                <Separator />

                <div className="flex items-center gap-2 text-xs">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  <div>
                    <p className="font-medium">Certification HAS — {identity.certification_niveau}</p>
                    <p className="text-muted-foreground">{identity.certification_date}</p>
                  </div>
                </div>

                <Separator />

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Pencil className="mr-1 h-3 w-3" /> Modifier
                  </Button>
                  <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </aside>

          {/* Modules as tabs */}
          <main className="flex-1 min-w-0">
            <Tabs defaultValue={defaultTab} className="w-full">
              <TabsList className="mb-6 flex h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
                {projectModules.map((mod) => {
                  const Icon = iconMap[mod.icon] || MapPin;
                  return (
                    <TabsTrigger
                      key={mod.id}
                      value={mod.id}
                      className="gap-1.5 rounded-lg border border-transparent px-3 py-2 text-xs font-medium data-[state=active]:border-accent data-[state=active]:bg-accent/10 data-[state=active]:text-accent-foreground data-[state=active]:shadow-none"
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {mod.label}
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {projectModules.map((mod) => {
                const ModuleContent = moduleComponents[mod.id];
                return (
                  <TabsContent key={mod.id} value={mod.id} className="mt-0">
                    {ModuleContent ? <ModuleContent /> : null}
                  </TabsContent>
                );
              })}
            </Tabs>
          </main>
        </div>
      </div>
    </div>
  );
}
