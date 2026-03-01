
-- Restructure certification_has with richer HAS open data fields
DROP TABLE IF EXISTS public.certification_has;
CREATE TABLE public.certification_has (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
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
ALTER TABLE public.certification_has ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to certification_has" ON public.certification_has FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_certif_finess ON public.certification_has(finess_geo);

-- ALD prevalence by department
CREATE TABLE public.ald_departement (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code_departement text NOT NULL,
  code_ald integer NOT NULL,
  libelle_ald text,
  effectif integer,
  annee integer DEFAULT 2024,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(code_departement, code_ald, annee)
);
ALTER TABLE public.ald_departement ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to ald_departement" ON public.ald_departement FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_ald_dep ON public.ald_departement(code_departement);

-- Add data_source entries for new datasets
INSERT INTO public.data_sources (id, name, description, source, format, status, record_count)
VALUES 
  ('ald', 'ALD — Prévalence', 'Affections longue durée par département (régime général)', 'CNAM / data.gouv.fr', 'xlsx', 'pending', 0),
  ('pinecone-documents', 'Documents indexés Pinecone', 'Documents PE/PM/PMS indexés dans Pinecone', 'Upload / GitHub', 'vectors', 'ok', 0)
ON CONFLICT (id) DO NOTHING;
