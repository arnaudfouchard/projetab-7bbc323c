import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  MapPin, TrendingUp, Activity, GitMerge, Target,
  CalendarDays, Search, ArrowLeft, Pencil, Trash2,
  Building2, Bed, Users, Stethoscope, ShieldCheck, Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";
import { MODULES } from "@/lib/constants";
import { MOCK_PROJECTS, MOCK_IDENTITY_CARD } from "@/lib/mock-data";
import type { ModuleId } from "@/lib/types";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  MapPin, TrendingUp, Activity, GitMerge, Target, CalendarDays, Search,
};

export default function Workspace() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const project = MOCK_PROJECTS.find((p) => p.id === id) || MOCK_PROJECTS[0];
  const customName = searchParams.get("projectName");
  const displayName = customName ? decodeURIComponent(customName) : project.name;
  const identity = MOCK_IDENTITY_CARD;
  const [activeModule, setActiveModule] = useState<ModuleId | null>(null);

  const projectModules = MODULES.filter((m) => project.modules.includes(m.id));

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
                  <ShieldCheck className="h-4 w-4 text-success" />
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

          {/* Modules grid */}
          <main className="flex-1">
            <h2 className="mb-4 font-display text-lg font-semibold">Modules</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {projectModules.map((mod) => {
                const Icon = iconMap[mod.icon] || MapPin;
                const isActive = activeModule === mod.id;
                return (
                  <Card
                    key={mod.id}
                    className={`card-hover cursor-pointer ${
                      isActive ? "border-accent ring-2 ring-accent/20" : ""
                    }`}
                    onClick={() => setActiveModule(isActive ? null : mod.id)}
                  >
                    <CardContent className="flex items-center gap-3 p-4">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                          isActive ? "gold-gradient text-accent-foreground" : "bg-secondary"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{mod.label}</p>
                        <p className="text-xs text-muted-foreground">{mod.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Module content placeholder */}
            {activeModule && (
              <Card className="mt-6 animate-fade-in">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                  <Clock className="mb-3 h-8 w-8 opacity-40" />
                  <p className="font-medium">
                    Module « {MODULES.find((m) => m.id === activeModule)?.label} »
                  </p>
                  <p className="mt-1 text-sm">
                    Les données de ce module seront affichées ici une fois le backend connecté.
                  </p>
                </CardContent>
              </Card>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
