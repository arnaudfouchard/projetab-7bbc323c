export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ald_departement: {
        Row: {
          annee: number | null
          code_ald: number
          code_departement: string
          created_at: string
          effectif: number | null
          id: string
          libelle_ald: string | null
        }
        Insert: {
          annee?: number | null
          code_ald: number
          code_departement: string
          created_at?: string
          effectif?: number | null
          id?: string
          libelle_ald?: string | null
        }
        Update: {
          annee?: number | null
          code_ald?: number
          code_departement?: string
          created_at?: string
          effectif?: number | null
          id?: string
          libelle_ald?: string | null
        }
        Relationships: []
      }
      certification_has: {
        Row: {
          annee_visite: number | null
          code_demarche: number | null
          created_at: string
          date_decision: string | null
          date_visite: string | null
          decision: string | null
          finess_geo: string
          finess_juridique: string | null
          id: string
          nom_etablissement: string | null
          score_equipes: number | null
          score_etablissement: number | null
          score_patient: number | null
          site_principal: boolean | null
        }
        Insert: {
          annee_visite?: number | null
          code_demarche?: number | null
          created_at?: string
          date_decision?: string | null
          date_visite?: string | null
          decision?: string | null
          finess_geo: string
          finess_juridique?: string | null
          id?: string
          nom_etablissement?: string | null
          score_equipes?: number | null
          score_etablissement?: number | null
          score_patient?: number | null
          site_principal?: boolean | null
        }
        Update: {
          annee_visite?: number | null
          code_demarche?: number | null
          created_at?: string
          date_decision?: string | null
          date_visite?: string | null
          decision?: string | null
          finess_geo?: string
          finess_juridique?: string | null
          id?: string
          nom_etablissement?: string | null
          score_equipes?: number | null
          score_etablissement?: number | null
          score_patient?: number | null
          site_principal?: boolean | null
        }
        Relationships: []
      }
      data_sources: {
        Row: {
          created_at: string
          data_date: string | null
          description: string | null
          format: string | null
          id: string
          last_update: string | null
          name: string
          record_count: number | null
          source: string | null
          source_url: string | null
          status: string
        }
        Insert: {
          created_at?: string
          data_date?: string | null
          description?: string | null
          format?: string | null
          id: string
          last_update?: string | null
          name: string
          record_count?: number | null
          source?: string | null
          source_url?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          data_date?: string | null
          description?: string | null
          format?: string | null
          id?: string
          last_update?: string | null
          name?: string
          record_count?: number | null
          source?: string | null
          source_url?: string | null
          status?: string
        }
        Relationships: []
      }
      enjeux_strategiques: {
        Row: {
          actions: Json | null
          created_at: string
          description: string | null
          finess: string
          id: string
          importance: string
          mentions: number | null
          synthese_globale: string | null
          titre: string
          verbatims: string[] | null
        }
        Insert: {
          actions?: Json | null
          created_at?: string
          description?: string | null
          finess: string
          id?: string
          importance?: string
          mentions?: number | null
          synthese_globale?: string | null
          titre: string
          verbatims?: string[] | null
        }
        Update: {
          actions?: Json | null
          created_at?: string
          description?: string | null
          finess?: string
          id?: string
          importance?: string
          mentions?: number | null
          synthese_globale?: string | null
          titre?: string
          verbatims?: string[] | null
        }
        Relationships: []
      }
      etablissements: {
        Row: {
          adresse: string | null
          categorie_code: string | null
          categorie_libelle: string | null
          code_commune: string | null
          code_departement: string | null
          code_postal: string | null
          code_region: string | null
          commune: string | null
          created_at: string
          departement: string | null
          effectifs_med: number | null
          effectifs_non_med: number | null
          finess_geo: string
          finess_juridique: string | null
          ght_code: string | null
          ght_nom: string | null
          id: string
          latitude: number | null
          longitude: number | null
          nb_lits: number | null
          nb_lits_chirurgie: number | null
          nb_lits_medecine: number | null
          nb_lits_obstetrique: number | null
          nb_lits_psy: number | null
          nb_lits_ssr: number | null
          nb_places: number | null
          nb_places_ambulatoire: number | null
          nb_urgences: number | null
          nom: string
          region: string | null
          statut_juridique: string | null
          telephone: string | null
          type_etab: string | null
          updated_at: string
        }
        Insert: {
          adresse?: string | null
          categorie_code?: string | null
          categorie_libelle?: string | null
          code_commune?: string | null
          code_departement?: string | null
          code_postal?: string | null
          code_region?: string | null
          commune?: string | null
          created_at?: string
          departement?: string | null
          effectifs_med?: number | null
          effectifs_non_med?: number | null
          finess_geo: string
          finess_juridique?: string | null
          ght_code?: string | null
          ght_nom?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          nb_lits?: number | null
          nb_lits_chirurgie?: number | null
          nb_lits_medecine?: number | null
          nb_lits_obstetrique?: number | null
          nb_lits_psy?: number | null
          nb_lits_ssr?: number | null
          nb_places?: number | null
          nb_places_ambulatoire?: number | null
          nb_urgences?: number | null
          nom: string
          region?: string | null
          statut_juridique?: string | null
          telephone?: string | null
          type_etab?: string | null
          updated_at?: string
        }
        Update: {
          adresse?: string | null
          categorie_code?: string | null
          categorie_libelle?: string | null
          code_commune?: string | null
          code_departement?: string | null
          code_postal?: string | null
          code_region?: string | null
          commune?: string | null
          created_at?: string
          departement?: string | null
          effectifs_med?: number | null
          effectifs_non_med?: number | null
          finess_geo?: string
          finess_juridique?: string | null
          ght_code?: string | null
          ght_nom?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          nb_lits?: number | null
          nb_lits_chirurgie?: number | null
          nb_lits_medecine?: number | null
          nb_lits_obstetrique?: number | null
          nb_lits_psy?: number | null
          nb_lits_ssr?: number | null
          nb_places?: number | null
          nb_places_ambulatoire?: number | null
          nb_urgences?: number | null
          nom?: string
          region?: string | null
          statut_juridique?: string | null
          telephone?: string | null
          type_etab?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      fiches_actions: {
        Row: {
          axe: string | null
          created_at: string
          enjeu_id: string | null
          finess: string
          id: string
          sections: Json
          statut: string
          titre: string
          updated_at: string
        }
        Insert: {
          axe?: string | null
          created_at?: string
          enjeu_id?: string | null
          finess: string
          id?: string
          sections?: Json
          statut?: string
          titre: string
          updated_at?: string
        }
        Update: {
          axe?: string | null
          created_at?: string
          enjeu_id?: string | null
          finess?: string
          id?: string
          sections?: Json
          statut?: string
          titre?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fiches_actions_enjeu_id_fkey"
            columns: ["enjeu_id"]
            isOneToOne: false
            referencedRelation: "enjeux_strategiques"
            referencedColumns: ["id"]
          },
        ]
      }
      ghts: {
        Row: {
          code_region: string | null
          created_at: string
          etablissement_support_finess: string | null
          ght_code: string
          ght_nom: string
          id: string
          nb_membres: number | null
          region: string | null
          updated_at: string
        }
        Insert: {
          code_region?: string | null
          created_at?: string
          etablissement_support_finess?: string | null
          ght_code: string
          ght_nom: string
          id?: string
          nb_membres?: number | null
          region?: string | null
          updated_at?: string
        }
        Update: {
          code_region?: string | null
          created_at?: string
          etablissement_support_finess?: string | null
          ght_code?: string
          ght_nom?: string
          id?: string
          nb_membres?: number | null
          region?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      population_communes: {
        Row: {
          annee_recensement: number | null
          code_commune: string
          code_departement: string | null
          code_region: string | null
          created_at: string
          densite: number | null
          id: string
          latitude: number | null
          longitude: number | null
          nom_commune: string | null
          population: number | null
          population_0_14: number | null
          population_15_29: number | null
          population_30_44: number | null
          population_45_59: number | null
          population_60_74: number | null
          population_75_plus: number | null
          superficie: number | null
        }
        Insert: {
          annee_recensement?: number | null
          code_commune: string
          code_departement?: string | null
          code_region?: string | null
          created_at?: string
          densite?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          nom_commune?: string | null
          population?: number | null
          population_0_14?: number | null
          population_15_29?: number | null
          population_30_44?: number | null
          population_45_59?: number | null
          population_60_74?: number | null
          population_75_plus?: number | null
          superficie?: number | null
        }
        Update: {
          annee_recensement?: number | null
          code_commune?: string
          code_departement?: string | null
          code_region?: string | null
          created_at?: string
          densite?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          nom_commune?: string | null
          population?: number | null
          population_0_14?: number | null
          population_15_29?: number | null
          population_30_44?: number | null
          population_45_59?: number | null
          population_60_74?: number | null
          population_75_plus?: number | null
          superficie?: number | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string
          department: string | null
          entity_type: string
          finess: string | null
          ght_code: string | null
          id: string
          is_exploration: boolean
          modules: string[]
          name: string
          region: string | null
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          entity_type?: string
          finess?: string | null
          ght_code?: string | null
          id?: string
          is_exploration?: boolean
          modules?: string[]
          name: string
          region?: string | null
          status?: string
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          department?: string | null
          entity_type?: string
          finess?: string | null
          ght_code?: string | null
          id?: string
          is_exploration?: boolean
          modules?: string[]
          name?: string
          region?: string | null
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      sae_capacites: {
        Row: {
          annee: number
          created_at: string
          duree_moyenne_sejour: number | null
          finess_geo: string
          id: string
          nb_accouchements: number | null
          nb_lits_chirurgie: number | null
          nb_lits_medecine: number | null
          nb_lits_obstetrique: number | null
          nb_lits_psy: number | null
          nb_lits_ssr: number | null
          nb_lits_total: number | null
          nb_passages_urgences: number | null
          nb_places_ambulatoire: number | null
          nb_places_total: number | null
          nb_sejours_ambulatoire: number | null
          nb_sejours_total: number | null
          taux_ambulatoire: number | null
        }
        Insert: {
          annee: number
          created_at?: string
          duree_moyenne_sejour?: number | null
          finess_geo: string
          id?: string
          nb_accouchements?: number | null
          nb_lits_chirurgie?: number | null
          nb_lits_medecine?: number | null
          nb_lits_obstetrique?: number | null
          nb_lits_psy?: number | null
          nb_lits_ssr?: number | null
          nb_lits_total?: number | null
          nb_passages_urgences?: number | null
          nb_places_ambulatoire?: number | null
          nb_places_total?: number | null
          nb_sejours_ambulatoire?: number | null
          nb_sejours_total?: number | null
          taux_ambulatoire?: number | null
        }
        Update: {
          annee?: number
          created_at?: string
          duree_moyenne_sejour?: number | null
          finess_geo?: string
          id?: string
          nb_accouchements?: number | null
          nb_lits_chirurgie?: number | null
          nb_lits_medecine?: number | null
          nb_lits_obstetrique?: number | null
          nb_lits_psy?: number | null
          nb_lits_ssr?: number | null
          nb_lits_total?: number | null
          nb_passages_urgences?: number | null
          nb_places_ambulatoire?: number | null
          nb_places_total?: number | null
          nb_sejours_ambulatoire?: number | null
          nb_sejours_total?: number | null
          taux_ambulatoire?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
