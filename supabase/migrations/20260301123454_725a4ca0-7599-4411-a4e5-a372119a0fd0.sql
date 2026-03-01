-- Table for national ALD prevalence (annual series)
CREATE TABLE IF NOT EXISTS public.ald_national (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  code_ald integer NOT NULL,
  libelle_ald text,
  annee integer NOT NULL,
  effectif integer,
  prevalence numeric,
  UNIQUE(code_ald, annee)
);

ALTER TABLE public.ald_national ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to ald_national"
  ON public.ald_national FOR ALL
  USING (true) WITH CHECK (true);