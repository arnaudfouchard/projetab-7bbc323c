-- Add unique constraint on code_commune for population upsert
ALTER TABLE public.population_communes 
ADD CONSTRAINT population_communes_code_commune_key UNIQUE (code_commune);

-- Also add unique constraint on ald_departement for upsert
ALTER TABLE public.ald_departement
ADD CONSTRAINT ald_departement_code_dept_ald_key UNIQUE (code_departement, code_ald);