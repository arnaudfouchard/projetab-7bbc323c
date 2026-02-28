import type { ModuleDefinition } from "./types";

export const MODULES: ModuleDefinition[] = [
  {
    id: "diagnostic_territorial",
    label: "Diagnostic territorial",
    description: "Démographie, accessibilité, bassin de vie",
    icon: "MapPin",
  },
  {
    id: "diagnostic_financier",
    label: "Diagnostic financier",
    description: "CREA, ratios, équilibre budgétaire",
    icon: "TrendingUp",
  },
  {
    id: "diagnostic_offre_soins",
    label: "Diagnostic offre de soins",
    description: "Activité, parts de marché, benchmark, taux d'ambulatoire",
    icon: "Activity",
  },
  {
    id: "fusion_regroupement",
    label: "Fusion / Regroupement",
    description: "Simulation impact d'une fusion",
    icon: "GitMerge",
  },
  {
    id: "analyse_axes_strategiques",
    label: "Analyse axes stratégiques",
    description: "Identification des axes stratégiques, benchmark PE/PM existants",
    icon: "Target",
  },
  {
    id: "fiches_actions_gantt",
    label: "Fiches actions & Gantt",
    description: "Plans d'actions, calendrier",
    icon: "CalendarDays",
  },
  {
    id: "recherche_documentaire",
    label: "Recherche documentaire",
    description: "Recherche sémantique dans les PE/PM/PMS",
    icon: "Search",
  },
];

export const ENTITY_TYPES = [
  { value: "etablissement" as const, label: "Établissement", description: "Hôpital, clinique, EHPAD…" },
  { value: "ght" as const, label: "GHT", description: "Groupement Hospitalier de Territoire" },
];

export const PROJECT_STATUSES = {
  draft: { label: "Brouillon", color: "secondary" },
  in_progress: { label: "En cours", color: "info" },
  completed: { label: "Terminé", color: "success" },
} as const;
