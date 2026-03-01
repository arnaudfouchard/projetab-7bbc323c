
-- ===========================================
-- 1. ETABLISSEMENTS (from FINESS)
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
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.etablissements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to etablissements" ON public.etablissements FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_etablissements_finess ON public.etablissements(finess_geo);
CREATE INDEX idx_etablissements_dept ON public.etablissements(code_departement);
CREATE INDEX idx_etablissements_region ON public.etablissements(code_region);
CREATE INDEX idx_etablissements_type ON public.etablissements(type_etab);

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

ALTER TABLE public.ghts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to ghts" ON public.ghts FOR ALL USING (true) WITH CHECK (true);

-- ===========================================
-- 3. PROJECTS
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

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to projects" ON public.projects FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===========================================
-- 4. DATA_SOURCES (meta-table for tracking)
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

ALTER TABLE public.data_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to data_sources" ON public.data_sources FOR ALL USING (true) WITH CHECK (true);

-- ===========================================
-- 5. SAE_CAPACITES (annual stats per establishment)
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

ALTER TABLE public.sae_capacites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to sae_capacites" ON public.sae_capacites FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_sae_finess ON public.sae_capacites(finess_geo);
CREATE INDEX idx_sae_annee ON public.sae_capacites(annee);

-- ===========================================
-- 6. POPULATION_COMMUNES (INSEE demographics)
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

ALTER TABLE public.population_communes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to population_communes" ON public.population_communes FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_pop_commune ON public.population_communes(code_commune);
CREATE INDEX idx_pop_dept ON public.population_communes(code_departement);

-- ===========================================
-- 7. CERTIFICATION_HAS
-- ===========================================
CREATE TABLE public.certification_has (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  finess_geo text NOT NULL,
  niveau text,
  date_decision date,
  date_visite date,
  recommandations integer DEFAULT 0,
  reserves integer DEFAULT 0,
  reserves_majeures integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(finess_geo, date_decision)
);

ALTER TABLE public.certification_has ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to certification_has" ON public.certification_has FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_certif_finess ON public.certification_has(finess_geo);

-- ===========================================
-- Triggers for updated_at
-- ===========================================
CREATE TRIGGER update_etablissements_updated_at
  BEFORE UPDATE ON public.etablissements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ghts_updated_at
  BEFORE UPDATE ON public.ghts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===========================================
-- Seed data_sources meta-entries
-- ===========================================
INSERT INTO public.data_sources (id, name, description, source, source_url, format, data_date, record_count, status) VALUES
  ('finess', 'FINESS — Établissements', 'Fichier national des établissements sanitaires et sociaux', 'data.gouv.fr', 'https://www.data.gouv.fr/fr/datasets/finess-extraction-du-fichier-des-etablissements/', 'CSV', '2025-12', 0, 'pending'),
  ('sae', 'SAE — Capacités', 'Statistique annuelle des établissements de santé', 'DREES / opendatasoft', NULL, 'CSV/Parquet', '2023', 0, 'pending'),
  ('hospi_diag', 'Hospi Diag', 'Indicateurs qualité et performance hospitalière', 'data.gouv.fr', NULL, 'CSV/Parquet', '2022', 0, 'pending'),
  ('insee', 'INSEE — Population', 'Données démographiques communales', 'INSEE / geo.api.gouv.fr', NULL, 'API/CSV', '2021', 0, 'pending'),
  ('ght', 'GHT', 'Groupements hospitaliers de territoire', 'DGOS', NULL, 'CSV/Excel', '2024', 0, 'pending'),
  ('certification_has', 'Certification HAS', 'Résultats de certification 2014-2024', 'HAS', NULL, 'CSV/Excel', '2014-2024', 0, 'pending'),
  ('pe_pm', 'Bibliothèque PE/PM/PMS', 'Projets indexés dans Pinecone', 'GitHub pe_pms', NULL, 'PDF → Pinecone', '2015-2025', 0, 'ok'),
  ('axes', 'Axes stratégiques', 'Axes extraits des PE/PM existants', 'Extraction auto', NULL, 'Base de données', '2015-2025', 0, 'ok');
