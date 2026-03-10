-- ===========================================
-- ProjetAB — Schema PostgreSQL consolidé
-- Toutes les migrations Supabase fusionnées
-- Sans RLS (le backend contrôle l'accès)
-- ===========================================

-- Fonction utilitaire updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- 1. ETABLISSEMENTS (FINESS)
-- ===========================================
CREATE TABLE public.etablissements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  finess_geo text UNIQUE NOT NULL,
  finess_juridique text,
  nom text NOT NULL,
  type_etab text,
  categorie_code text,
  categorie_libelle text,
  commune text,
  code_commune text,
  departement text,
  code_departement text,
  region text,
  code_region text,
  statut_juridique text,
  adresse text,
  code_postal text,
  latitude double precision,
  longitude double precision,
  telephone text,
  ght_code text,
  ght_nom text,
  nb_lits integer,
  nb_places integer,
  nb_lits_medecine integer,
  nb_lits_chirurgie integer,
  nb_lits_obstetrique integer,
  nb_lits_ssr integer,
  nb_lits_psy integer,
  nb_places_ambulatoire integer,
  nb_urgences integer,
  effectifs_med integer,
  effectifs_non_med integer,
  is_hopital_proximite boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_etablissements_finess ON public.etablissements(finess_geo);
CREATE INDEX idx_etablissements_dept ON public.etablissements(code_departement);
CREATE INDEX idx_etablissements_region ON public.etablissements(code_region);
CREATE INDEX idx_etablissements_type ON public.etablissements(type_etab);
CREATE INDEX idx_etablissements_hpr ON public.etablissements(is_hopital_proximite) WHERE is_hopital_proximite = true;

CREATE TRIGGER update_etablissements_updated_at
  BEFORE UPDATE ON public.etablissements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===========================================
-- 2. GHTs
-- ===========================================
CREATE TABLE public.ghts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ght_code text UNIQUE NOT NULL,
  ght_nom text NOT NULL,
  etablissement_support_finess text,
  region text,
  code_region text,
  nb_membres integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER update_ghts_updated_at
  BEFORE UPDATE ON public.ghts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===========================================
-- 3. FK: etablissements -> ghts
-- ===========================================
ALTER TABLE public.etablissements
  ADD CONSTRAINT fk_etab_ght
  FOREIGN KEY (ght_code) REFERENCES public.ghts(ght_code)
  ON DELETE SET NULL
  DEFERRABLE INITIALLY DEFERRED;

-- ===========================================
-- 4. PROJECTS
-- ===========================================
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'PE',
  entity_type text NOT NULL DEFAULT 'etablissement',
  finess text,
  ght_code text,
  department text,
  region text,
  modules text[] NOT NULL DEFAULT '{}',
  is_exploration boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===========================================
-- 5. DATA_SOURCES (meta-table)
-- ===========================================
CREATE TABLE public.data_sources (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  source text,
  source_url text,
  format text,
  data_date text,
  last_update timestamptz DEFAULT now(),
  record_count integer DEFAULT 0,
  status text NOT NULL DEFAULT 'ok',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ===========================================
-- 6. SAE_CAPACITES (stats annuelles par établissement)
-- ===========================================
CREATE TABLE public.sae_capacites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  finess_geo text NOT NULL,
  annee integer NOT NULL,
  nb_lits_total integer,
  nb_places_total integer,
  nb_lits_medecine integer,
  nb_lits_chirurgie integer,
  nb_lits_obstetrique integer,
  nb_lits_ssr integer,
  nb_lits_psy integer,
  nb_places_ambulatoire integer,
  nb_sejours_total integer,
  nb_sejours_ambulatoire integer,
  taux_ambulatoire numeric(5,2),
  nb_passages_urgences integer,
  nb_accouchements integer,
  duree_moyenne_sejour numeric(5,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(finess_geo, annee)
);

CREATE INDEX idx_sae_finess ON public.sae_capacites(finess_geo);
CREATE INDEX idx_sae_annee ON public.sae_capacites(annee);

ALTER TABLE public.sae_capacites
  ADD CONSTRAINT fk_sae_etab
  FOREIGN KEY (finess_geo) REFERENCES public.etablissements(finess_geo)
  ON DELETE CASCADE
  DEFERRABLE INITIALLY DEFERRED;

-- ===========================================
-- 7. POPULATION_COMMUNES (INSEE)
-- ===========================================
CREATE TABLE public.population_communes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_commune text NOT NULL,
  nom_commune text,
  code_departement text,
  code_region text,
  population integer,
  population_0_14 integer,
  population_15_29 integer,
  population_30_44 integer,
  population_45_59 integer,
  population_60_74 integer,
  population_75_plus integer,
  densite numeric(10,2),
  superficie numeric(10,2),
  latitude double precision,
  longitude double precision,
  annee_recensement integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(code_commune, annee_recensement)
);

CREATE INDEX idx_pop_commune ON public.population_communes(code_commune);
CREATE INDEX idx_pop_dept ON public.population_communes(code_departement);

-- ===========================================
-- 8. CERTIFICATION HAS (v2 enrichie)
-- ===========================================
CREATE TABLE public.certification_has (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  finess_geo text NOT NULL,
  finess_juridique text,
  code_demarche integer,
  nom_etablissement text,
  decision text,
  annee_visite integer,
  date_visite date,
  date_decision date,
  site_principal boolean DEFAULT true,
  score_patient numeric,
  score_equipes numeric,
  score_etablissement numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(finess_geo, code_demarche)
);

CREATE INDEX idx_certif_finess ON public.certification_has(finess_geo);

ALTER TABLE public.certification_has
  ADD CONSTRAINT fk_certif_etab
  FOREIGN KEY (finess_geo) REFERENCES public.etablissements(finess_geo)
  ON DELETE CASCADE
  DEFERRABLE INITIALLY DEFERRED;

-- ===========================================
-- 9. ALD DEPARTEMENT
-- ===========================================
CREATE TABLE public.ald_departement (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_departement text NOT NULL,
  code_ald integer NOT NULL,
  libelle_ald text,
  effectif integer,
  annee integer DEFAULT 2024,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(code_departement, code_ald, annee)
);

CREATE INDEX idx_ald_dep ON public.ald_departement(code_departement);

-- ===========================================
-- 10. ALD NATIONAL
-- ===========================================
CREATE TABLE public.ald_national (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_ald integer NOT NULL,
  libelle_ald text,
  annee integer NOT NULL,
  effectif integer,
  prevalence numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(code_ald, annee)
);

-- ===========================================
-- 11. IMPORT HISTORY (audit trail)
-- ===========================================
CREATE TABLE public.import_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id text NOT NULL,
  version_label text NOT NULL,
  file_hash text,
  record_count integer DEFAULT 0,
  records_inserted integer DEFAULT 0,
  records_updated integer DEFAULT 0,
  records_deleted integer DEFAULT 0,
  orphan_keys_detected integer DEFAULT 0,
  audit_report jsonb,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  status text DEFAULT 'running'
);

CREATE INDEX idx_import_history_source ON public.import_history(source_id);
CREATE INDEX idx_import_history_status ON public.import_history(status);

-- ===========================================
-- 12. LINKAGE OVERRIDES (corrections manuelles)
-- ===========================================
CREATE TABLE public.linkage_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_table text NOT NULL,
  source_key text NOT NULL,
  target_table text NOT NULL,
  original_value text,
  corrected_value text,
  reason text,
  created_by text,
  created_at timestamptz DEFAULT now()
);

-- ===========================================
-- 13. INDEX COMPOSITES PERFORMANCES
-- ===========================================
CREATE INDEX idx_pop_dept_annee ON public.population_communes(code_departement, annee_recensement);
CREATE INDEX idx_ald_dept_annee ON public.ald_departement(code_departement, annee);
CREATE INDEX idx_certif_annee ON public.certification_has(annee_visite);
CREATE INDEX idx_sae_finess_annee ON public.sae_capacites(finess_geo, annee);
CREATE INDEX idx_etab_dept_type ON public.etablissements(code_departement, type_etab);

-- ===========================================
-- 14. FONCTION D'AUDIT DES LIAISONS
-- ===========================================
CREATE OR REPLACE FUNCTION public.audit_data_linkages()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb := '{}';
  v_count integer;
  v_total integer;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.etablissements;
  result := result || jsonb_build_object('total_etablissements', v_count);

  SELECT COUNT(*) INTO v_count FROM public.ghts;
  result := result || jsonb_build_object('total_ghts', v_count);

  SELECT COUNT(*) INTO v_count FROM public.certification_has;
  result := result || jsonb_build_object('total_certifications', v_count);

  SELECT COUNT(*) INTO v_count FROM public.sae_capacites;
  result := result || jsonb_build_object('total_sae', v_count);

  SELECT COUNT(*) INTO v_count FROM public.population_communes;
  result := result || jsonb_build_object('total_communes_pop', v_count);

  SELECT COUNT(*) INTO v_count FROM public.ald_departement;
  result := result || jsonb_build_object('total_ald_dept', v_count);

  SELECT COUNT(*) INTO v_count FROM public.ald_national;
  result := result || jsonb_build_object('total_ald_national', v_count);

  SELECT COUNT(*) INTO v_total FROM public.etablissements WHERE ght_code IS NOT NULL;
  result := result || jsonb_build_object('etab_with_ght', v_total);

  SELECT COUNT(*) INTO v_count FROM public.etablissements e
  WHERE e.ght_code IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.ghts g WHERE g.ght_code = e.ght_code);
  result := result || jsonb_build_object('etab_orphan_ght', v_count);

  SELECT COUNT(DISTINCT finess_geo) INTO v_count FROM public.certification_has;
  result := result || jsonb_build_object('etab_with_certification', v_count);

  SELECT COUNT(*) INTO v_count FROM public.certification_has c
  WHERE NOT EXISTS (SELECT 1 FROM public.etablissements e WHERE e.finess_geo = c.finess_geo);
  result := result || jsonb_build_object('certif_orphan_finess', v_count);

  SELECT COUNT(DISTINCT finess_geo) INTO v_count FROM public.sae_capacites;
  result := result || jsonb_build_object('etab_with_sae', v_count);

  SELECT COUNT(*) INTO v_count FROM public.sae_capacites s
  WHERE NOT EXISTS (SELECT 1 FROM public.etablissements e WHERE e.finess_geo = s.finess_geo);
  result := result || jsonb_build_object('sae_orphan_finess', v_count);

  SELECT COUNT(DISTINCT e.code_departement) INTO v_count FROM public.etablissements e
  WHERE e.code_departement IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.population_communes p WHERE p.code_departement = e.code_departement);
  result := result || jsonb_build_object('dept_etab_sans_population', v_count);

  SELECT COUNT(DISTINCT code_departement) INTO v_count FROM public.population_communes WHERE code_departement IS NOT NULL;
  result := result || jsonb_build_object('dept_avec_population', v_count);

  SELECT COUNT(DISTINCT code_departement) INTO v_count FROM public.ald_departement;
  result := result || jsonb_build_object('dept_avec_ald', v_count);

  SELECT COUNT(DISTINCT ad.code_departement) INTO v_count FROM public.ald_departement ad
  WHERE NOT EXISTS (SELECT 1 FROM public.population_communes p WHERE p.code_departement = ad.code_departement);
  result := result || jsonb_build_object('dept_ald_sans_population', v_count);

  SELECT COUNT(*) INTO v_total FROM public.etablissements;
  IF v_total > 0 THEN
    SELECT COUNT(DISTINCT c.finess_geo) INTO v_count
    FROM public.certification_has c INNER JOIN public.etablissements e ON e.finess_geo = c.finess_geo;
    result := result || jsonb_build_object('pct_etab_certif', round((v_count::numeric / v_total) * 100, 1));

    SELECT COUNT(DISTINCT s.finess_geo) INTO v_count
    FROM public.sae_capacites s INNER JOIN public.etablissements e ON e.finess_geo = s.finess_geo;
    result := result || jsonb_build_object('pct_etab_sae', round((v_count::numeric / v_total) * 100, 1));

    SELECT COUNT(*) INTO v_count FROM public.etablissements WHERE ght_code IS NOT NULL;
    result := result || jsonb_build_object('pct_etab_ght', round((v_count::numeric / v_total) * 100, 1));
  END IF;

  result := result || jsonb_build_object(
    'derniere_certif_annee', (SELECT MAX(annee_visite) FROM public.certification_has),
    'derniere_sae_annee', (SELECT MAX(annee) FROM public.sae_capacites),
    'derniere_pop_annee', (SELECT MAX(annee_recensement) FROM public.population_communes),
    'derniere_ald_annee', (SELECT MAX(annee) FROM public.ald_departement)
  );

  result := result || jsonb_build_object('audit_timestamp', now());

  RETURN result;
END;
$$;

-- ===========================================
-- 15. FONCTION DETAIL ORPHELINS
-- ===========================================
CREATE OR REPLACE FUNCTION public.audit_orphan_details(p_table text, p_limit integer DEFAULT 50)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb := '[]';
BEGIN
  IF p_table = 'certification_has' THEN
    SELECT jsonb_agg(row_to_json(sub)) INTO result FROM (
      SELECT c.finess_geo, c.nom_etablissement, c.annee_visite
      FROM public.certification_has c
      WHERE NOT EXISTS (SELECT 1 FROM public.etablissements e WHERE e.finess_geo = c.finess_geo)
      LIMIT p_limit
    ) sub;
  ELSIF p_table = 'sae_capacites' THEN
    SELECT jsonb_agg(row_to_json(sub)) INTO result FROM (
      SELECT s.finess_geo, s.annee FROM public.sae_capacites s
      WHERE NOT EXISTS (SELECT 1 FROM public.etablissements e WHERE e.finess_geo = s.finess_geo)
      LIMIT p_limit
    ) sub;
  ELSIF p_table = 'etablissements_ght' THEN
    SELECT jsonb_agg(row_to_json(sub)) INTO result FROM (
      SELECT e.finess_geo, e.nom, e.ght_code FROM public.etablissements e
      WHERE e.ght_code IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM public.ghts g WHERE g.ght_code = e.ght_code)
      LIMIT p_limit
    ) sub;
  END IF;
  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

-- ===========================================
-- 16. SEED DATA_SOURCES
-- ===========================================
INSERT INTO public.data_sources (id, name, description, source, source_url, format, data_date, record_count, status) VALUES
  ('finess', 'FINESS — Établissements', 'Fichier national des établissements sanitaires et sociaux', 'data.gouv.fr', 'https://www.data.gouv.fr/fr/datasets/finess-extraction-du-fichier-des-etablissements/', 'CSV', '2025-12', 0, 'pending'),
  ('sae', 'SAE — Capacités', 'Statistique annuelle des établissements de santé', 'DREES / opendatasoft', NULL, 'CSV/Parquet', '2023', 0, 'pending'),
  ('hospi_diag', 'Hospi Diag', 'Indicateurs qualité et performance hospitalière', 'data.gouv.fr', NULL, 'CSV/Parquet', '2022', 0, 'pending'),
  ('insee', 'INSEE — Population', 'Données démographiques communales', 'INSEE / geo.api.gouv.fr', NULL, 'API/CSV', '2021', 0, 'pending'),
  ('ght', 'GHT', 'Groupements hospitaliers de territoire', 'DGOS', NULL, 'CSV/Excel', '2024', 0, 'pending'),
  ('certification_has', 'Certification HAS', 'Résultats de certification 2014-2024', 'HAS', NULL, 'CSV/Excel', '2014-2024', 0, 'pending'),
  ('ald', 'ALD — Prévalence', 'Affections longue durée par département (régime général)', 'CNAM / data.gouv.fr', 'xlsx', NULL, 0, 'pending'),
  ('ald_national', 'ALD — Prévalence nationale', 'Série ALD nationale annuelle', 'CNAM / data.gouv.fr', NULL, 'XLS', NULL, 0, 'pending'),
  ('hpr', 'Hôpitaux de proximité', 'Liste des hôpitaux de proximité', 'DGOS', NULL, 'XLSX', '2024', 0, 'pending'),
  ('pe_pm', 'Bibliothèque PE/PM/PMS', 'Projets indexés dans Pinecone', 'GitHub pe_pms', NULL, 'PDF → Pinecone', '2015-2025', 0, 'ok'),
  ('pinecone-documents', 'Documents indexés Pinecone', 'Documents PE/PM/PMS indexés dans Pinecone', 'Upload / GitHub', NULL, 'vectors', NULL, 0, 'ok'),
  ('axes', 'Axes stratégiques', 'Axes extraits des PE/PM existants', 'Extraction auto', NULL, 'Base de données', '2015-2025', 0, 'ok');
