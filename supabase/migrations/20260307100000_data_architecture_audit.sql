-- ===========================================
-- DATA ARCHITECTURE REFONTE
-- FK strictes, import_history, fonction audit,
-- vues materialisees par module
-- ===========================================

-- 0. Table de versionnement / historique des imports
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

ALTER TABLE public.import_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to import_history"
  ON public.import_history FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_import_history_source ON public.import_history(source_id);
CREATE INDEX idx_import_history_status ON public.import_history(status);

-- ===========================================
-- 1. FK STRICTES (avec possibilite de correction manuelle)
-- ===========================================

-- FK: etablissements.ght_code -> ghts.ght_code
-- D'abord nettoyer les orphelins existants potentiels
-- en mettant a NULL les ght_code introuvables
UPDATE public.etablissements
SET ght_code = NULL
WHERE ght_code IS NOT NULL
  AND ght_code NOT IN (SELECT ght_code FROM public.ghts);

ALTER TABLE public.etablissements
  ADD CONSTRAINT fk_etab_ght
  FOREIGN KEY (ght_code) REFERENCES public.ghts(ght_code)
  ON DELETE SET NULL
  DEFERRABLE INITIALLY DEFERRED;

-- FK: certification_has.finess_geo -> etablissements.finess_geo
-- Supprimer les certifications orphelines
DELETE FROM public.certification_has
WHERE finess_geo NOT IN (SELECT finess_geo FROM public.etablissements);

ALTER TABLE public.certification_has
  ADD CONSTRAINT fk_certif_etab
  FOREIGN KEY (finess_geo) REFERENCES public.etablissements(finess_geo)
  ON DELETE CASCADE
  DEFERRABLE INITIALLY DEFERRED;

-- FK: sae_capacites.finess_geo -> etablissements.finess_geo
DELETE FROM public.sae_capacites
WHERE finess_geo NOT IN (SELECT finess_geo FROM public.etablissements);

ALTER TABLE public.sae_capacites
  ADD CONSTRAINT fk_sae_etab
  FOREIGN KEY (finess_geo) REFERENCES public.etablissements(finess_geo)
  ON DELETE CASCADE
  DEFERRABLE INITIALLY DEFERRED;

-- ===========================================
-- 2. TABLE DE CORRECTION MANUELLE DES LIAISONS
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

ALTER TABLE public.linkage_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to linkage_overrides"
  ON public.linkage_overrides FOR ALL USING (true) WITH CHECK (true);

-- ===========================================
-- 3. INDEX COMPOSITES POUR PERFORMANCES MODULES
-- ===========================================
CREATE INDEX IF NOT EXISTS idx_pop_dept_annee
  ON public.population_communes(code_departement, annee_recensement);
CREATE INDEX IF NOT EXISTS idx_ald_dept_annee
  ON public.ald_departement(code_departement, annee);
CREATE INDEX IF NOT EXISTS idx_certif_annee
  ON public.certification_has(annee_visite);
CREATE INDEX IF NOT EXISTS idx_sae_finess_annee
  ON public.sae_capacites(finess_geo, annee);
CREATE INDEX IF NOT EXISTS idx_etab_dept_type
  ON public.etablissements(code_departement, type_etab);

-- ===========================================
-- 4. FONCTION D'AUDIT DES LIAISONS
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
  -- === COMPTAGES GLOBAUX ===
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

  -- === LIAISONS ETABLISSEMENTS -> GHT ===
  -- Etab avec ght_code renseigne
  SELECT COUNT(*) INTO v_total
  FROM public.etablissements WHERE ght_code IS NOT NULL;
  result := result || jsonb_build_object('etab_with_ght', v_total);

  -- Etab dont le ght_code n'est pas dans ghts (devrait etre 0 avec FK)
  -- Mais utile avant l'ajout des FK
  SELECT COUNT(*) INTO v_count
  FROM public.etablissements e
  WHERE e.ght_code IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.ghts g WHERE g.ght_code = e.ght_code);
  result := result || jsonb_build_object('etab_orphan_ght', v_count);

  -- === LIAISONS CERTIFICATION -> ETABLISSEMENTS ===
  SELECT COUNT(DISTINCT finess_geo) INTO v_count FROM public.certification_has;
  result := result || jsonb_build_object('etab_with_certification', v_count);

  SELECT COUNT(*) INTO v_count
  FROM public.certification_has c
  WHERE NOT EXISTS (SELECT 1 FROM public.etablissements e WHERE e.finess_geo = c.finess_geo);
  result := result || jsonb_build_object('certif_orphan_finess', v_count);

  -- === LIAISONS SAE -> ETABLISSEMENTS ===
  SELECT COUNT(DISTINCT finess_geo) INTO v_count FROM public.sae_capacites;
  result := result || jsonb_build_object('etab_with_sae', v_count);

  SELECT COUNT(*) INTO v_count
  FROM public.sae_capacites s
  WHERE NOT EXISTS (SELECT 1 FROM public.etablissements e WHERE e.finess_geo = s.finess_geo);
  result := result || jsonb_build_object('sae_orphan_finess', v_count);

  -- === COUVERTURE POPULATION ===
  -- Departements ayant des etablissements mais pas de pop
  SELECT COUNT(DISTINCT e.code_departement) INTO v_count
  FROM public.etablissements e
  WHERE e.code_departement IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.population_communes p
      WHERE p.code_departement = e.code_departement
    );
  result := result || jsonb_build_object('dept_etab_sans_population', v_count);

  -- Nombre de departements couverts par population
  SELECT COUNT(DISTINCT code_departement) INTO v_count
  FROM public.population_communes
  WHERE code_departement IS NOT NULL;
  result := result || jsonb_build_object('dept_avec_population', v_count);

  -- === COUVERTURE ALD ===
  SELECT COUNT(DISTINCT code_departement) INTO v_count
  FROM public.ald_departement;
  result := result || jsonb_build_object('dept_avec_ald', v_count);

  -- Departements ALD sans population
  SELECT COUNT(DISTINCT ad.code_departement) INTO v_count
  FROM public.ald_departement ad
  WHERE NOT EXISTS (
    SELECT 1 FROM public.population_communes p
    WHERE p.code_departement = ad.code_departement
  );
  result := result || jsonb_build_object('dept_ald_sans_population', v_count);

  -- === TAUX DE COUVERTURE (pourcentages) ===
  SELECT COUNT(*) INTO v_total FROM public.etablissements;
  IF v_total > 0 THEN
    SELECT COUNT(DISTINCT c.finess_geo) INTO v_count
    FROM public.certification_has c
    INNER JOIN public.etablissements e ON e.finess_geo = c.finess_geo;
    result := result || jsonb_build_object(
      'pct_etab_certif', round((v_count::numeric / v_total) * 100, 1)
    );

    SELECT COUNT(DISTINCT s.finess_geo) INTO v_count
    FROM public.sae_capacites s
    INNER JOIN public.etablissements e ON e.finess_geo = s.finess_geo;
    result := result || jsonb_build_object(
      'pct_etab_sae', round((v_count::numeric / v_total) * 100, 1)
    );

    SELECT COUNT(*) INTO v_count
    FROM public.etablissements WHERE ght_code IS NOT NULL;
    result := result || jsonb_build_object(
      'pct_etab_ght', round((v_count::numeric / v_total) * 100, 1)
    );
  END IF;

  -- === FRAICHEUR DES DONNEES ===
  result := result || jsonb_build_object(
    'derniere_certif_annee', (SELECT MAX(annee_visite) FROM public.certification_has),
    'derniere_sae_annee', (SELECT MAX(annee) FROM public.sae_capacites),
    'derniere_pop_annee', (SELECT MAX(annee_recensement) FROM public.population_communes),
    'derniere_ald_annee', (SELECT MAX(annee) FROM public.ald_departement)
  );

  -- === TIMESTAMP ===
  result := result || jsonb_build_object('audit_timestamp', now());

  RETURN result;
END;
$$;

-- ===========================================
-- 5. FONCTION DE DETAIL DES ORPHELINS
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
    SELECT jsonb_agg(row_to_json(sub))
    INTO result
    FROM (
      SELECT c.finess_geo, c.nom_etablissement, c.annee_visite
      FROM public.certification_has c
      WHERE NOT EXISTS (SELECT 1 FROM public.etablissements e WHERE e.finess_geo = c.finess_geo)
      LIMIT p_limit
    ) sub;

  ELSIF p_table = 'sae_capacites' THEN
    SELECT jsonb_agg(row_to_json(sub))
    INTO result
    FROM (
      SELECT s.finess_geo, s.annee
      FROM public.sae_capacites s
      WHERE NOT EXISTS (SELECT 1 FROM public.etablissements e WHERE e.finess_geo = s.finess_geo)
      LIMIT p_limit
    ) sub;

  ELSIF p_table = 'etablissements_ght' THEN
    SELECT jsonb_agg(row_to_json(sub))
    INTO result
    FROM (
      SELECT e.finess_geo, e.nom, e.ght_code
      FROM public.etablissements e
      WHERE e.ght_code IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM public.ghts g WHERE g.ght_code = e.ght_code)
      LIMIT p_limit
    ) sub;
  END IF;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;
