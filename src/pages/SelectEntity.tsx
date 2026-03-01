import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Building2, Users, Search, ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ENTITY_TYPES } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import type { EntityType, Etablissement } from "@/lib/types";

// Only show relevant sanitaire categories (exclude SSIAD, CPH, CPFSE, etc.)
const EXCLUDED_CATEGORIES = [
  "Service de Soins Infirmiers A Domicile (S.S.I.A.D)",
  "Centre Provisoire Hébergement (C.P.H.)",
  "Centre Placement Familial Socio-Educatif (C.P.F.S.E.)",
  "Centre d'Accueil Familial Spécialisé",
  "Centre de santé sexuelle",
  "Centre de Vaccination BCG",
  "Dispensaire Antituberculeux",
  "Atelier Thérapeutique",
];

function useSearchEtablissements(query: string, entityType: EntityType | null) {
  return useQuery({
    queryKey: ["search-etablissements", query, entityType],
    queryFn: async () => {
      if (!entityType || !query.trim() || query.trim().length < 2) return [];

      if (entityType === "ght") {
        const { data, error } = await supabase
          .from("ghts")
          .select("ght_code, ght_nom, region, nb_membres")
          .or(`ght_nom.ilike.%${query}%,ght_code.ilike.%${query}%,region.ilike.%${query}%`)
          .limit(15);
        if (error) throw error;
        return (data || []).map((g) => ({
          finess_geo: g.ght_code,
          nom: g.ght_nom,
          commune: `${g.nb_membres || 0} membres`,
          departement: "",
          region: g.region || "",
          type_etab: "GHT",
        })) as Etablissement[];
      }

      let req = supabase
        .from("etablissements")
        .select("finess_geo, finess_juridique, nom, type_etab, categorie_libelle, commune, departement, region, statut_juridique")
        .or(`nom.ilike.%${query}%,finess_geo.ilike.%${query}%,commune.ilike.%${query}%,code_postal.ilike.%${query}%`);

      // Exclude non-sanitaire categories
      for (const cat of EXCLUDED_CATEGORIES) {
        req = req.neq("categorie_libelle", cat);
      }

      const { data, error } = await req.limit(15);
      if (error) throw error;
      return (data || []) as Etablissement[];
    },
    enabled: !!entityType && query.trim().length >= 2,
    staleTime: 30_000,
  });
}

export default function SelectEntity() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const mode = params.get("mode") || "project";
  const explorationModule = params.get("module");

  const [entityType, setEntityType] = useState<EntityType | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Etablissement | null>(null);

  const { data: results = [], isLoading } = useSearchEtablissements(query, entityType);

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
              placeholder="Rechercher par nom, FINESS, ville ou code postal…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-6 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Recherche…
            </div>
          )}

          {/* Results */}
          {!isLoading && results.length > 0 && (
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

          {!isLoading && query.trim().length >= 2 && results.length === 0 && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              <p>Aucun résultat pour « {query} »</p>
              {entityType === "ght" && (
                <p className="mt-2 text-xs">
                  La table GHT est peut-être vide. Lancez l'import depuis la page{" "}
                  <button onClick={() => navigate("/data-sources")} className="underline text-accent">Données en base</button>.
                </p>
              )}
            </div>
          )}

          {query.trim().length > 0 && query.trim().length < 2 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Tapez au moins 2 caractères…
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
          onClick={() => {
            if (mode === "exploration" && explorationModule) {
              navigate(
                `/explore/${explorationModule}?finess=${selected?.finess_geo}&name=${encodeURIComponent(selected?.nom || "")}`
              );
            } else {
              navigate(
                `/projects/select-modules?mode=${mode}&finess=${selected?.finess_geo}&name=${encodeURIComponent(selected?.nom || "")}&entity=${entityType}`
              );
            }
          }}
        >
          Continuer <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
