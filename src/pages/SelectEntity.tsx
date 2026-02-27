import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Building2, Users, Search, ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ENTITY_TYPES } from "@/lib/constants";
import { MOCK_ETABLISSEMENTS } from "@/lib/mock-data";
import type { EntityType, Etablissement } from "@/lib/types";

export default function SelectEntity() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const mode = params.get("mode") || "project";

  const [entityType, setEntityType] = useState<EntityType | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Etablissement | null>(null);

  const results = useMemo(() => {
    if (!entityType || !query.trim()) return [];
    const q = query.toLowerCase();
    return MOCK_ETABLISSEMENTS.filter(
      (e) =>
        e.nom.toLowerCase().includes(q) ||
        e.finess_geo.includes(q) ||
        (e.commune && e.commune.toLowerCase().includes(q))
    ).slice(0, 15);
  }, [entityType, query]);

  const entityIcons = { etablissement: Building2, ght: Users };

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

      <div className="mb-8 animate-fade-in">
        <h1 className="font-display text-2xl font-bold">
          {mode === "exploration" ? "Mode exploration" : "Nouveau projet"}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Sélectionnez le type d'entité puis recherchez votre établissement
        </p>
      </div>

      {/* Entity type selection */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        {ENTITY_TYPES.map((et) => {
          const Icon = entityIcons[et.value];
          const isActive = entityType === et.value;
          return (
            <Card
              key={et.value}
              className={`card-hover cursor-pointer transition-all ${
                isActive ? "border-accent ring-2 ring-accent/20" : ""
              }`}
              onClick={() => {
                setEntityType(et.value);
                setSelected(null);
                setQuery("");
              }}
            >
              <CardContent className="flex items-center gap-4 p-5">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-lg ${
                    isActive ? "gold-gradient text-accent-foreground" : "bg-secondary"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">{et.label}</h3>
                  <p className="text-sm text-muted-foreground">{et.description}</p>
                </div>
                {isActive && (
                  <Check className="ml-auto h-5 w-5 text-accent" />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Search */}
      {entityType && (
        <div className="animate-fade-in">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom, FINESS ou ville…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Results */}
          {results.length > 0 && (
            <div className="mb-6 max-h-[400px] space-y-1 overflow-y-auto rounded-lg border bg-card p-2">
              {results.map((etab) => {
                const isSelected = selected?.finess_geo === etab.finess_geo;
                return (
                  <button
                    key={etab.finess_geo}
                    onClick={() => setSelected(etab)}
                    className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors ${
                      isSelected
                        ? "bg-accent/10 text-foreground"
                        : "hover:bg-muted"
                    }`}
                  >
                    <div className="flex-1">
                      <div className="font-medium">{etab.nom}</div>
                      <div className="text-xs text-muted-foreground">
                        {etab.commune} • {etab.departement} • {etab.type_etab} • FINESS {etab.finess_geo}
                      </div>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-accent" />}
                  </button>
                );
              })}
            </div>
          )}

          {query.trim().length > 0 && results.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Aucun résultat pour « {query} »
            </p>
          )}

          {/* Selected recap */}
          {selected && (
            <Card className="mb-6 border-accent/30 bg-accent/5 animate-fade-in">
              <CardContent className="p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-accent">
                  Sélectionné
                </p>
                <p className="mt-1 font-semibold">{selected.nom}</p>
                <p className="text-sm text-muted-foreground">
                  {selected.commune} — {selected.region} — FINESS {selected.finess_geo}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={() => navigate("/")}>
          Annuler
        </Button>
        <Button
          disabled={!selected}
          onClick={() =>
            navigate(
              `/projects/select-modules?mode=${mode}&finess=${selected?.finess_geo}&name=${encodeURIComponent(selected?.nom || "")}&entity=${entityType}`
            )
          }
        >
          Continuer <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
