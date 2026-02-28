// Types for ProjetEtab frontend

export type EntityType = "etablissement" | "ght";

export type ModuleId =
  | "diagnostic_territorial"
  | "diagnostic_financier"
  | "diagnostic_offre_soins"
  | "fusion_regroupement"
  | "analyse_axes_strategiques"
  | "fiches_actions_gantt"
  | "recherche_documentaire"
  | "explorer_base";

export interface ModuleDefinition {
  id: ModuleId;
  label: string;
  description: string;
  icon: string;
}

export interface Etablissement {
  finess_geo: string;
  finess_juridique?: string;
  nom: string;
  type_etab?: string;
  categorie_libelle?: string;
  commune?: string;
  departement?: string;
  region?: string;
  statut_juridique?: string;
  latitude?: number;
  longitude?: number;
}

export interface GHT {
  ght_code: string;
  ght_nom: string;
  region?: string;
  nb_membres?: number;
}

export interface Project {
  id: string;
  name: string;
  type: string;
  entity_type: EntityType;
  finess?: string;
  department?: string;
  region?: string;
  modules: ModuleId[];
  is_exploration: boolean;
  status: "draft" | "in_progress" | "completed";
  created_at: string;
  updated_at: string;
}

export interface IdentityCard {
  finess_geo: string;
  finess_juridique?: string;
  nom: string;
  commune?: string;
  departement?: string;
  region?: string;
  ght?: string;
  statut_juridique?: string;
  nb_lits?: number;
  nb_places?: number;
  nb_urgences?: number;
  effectifs_med?: number;
  certification_niveau?: string;
  certification_date?: string;
}
