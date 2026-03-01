-- Add HPR label to etablissements
ALTER TABLE public.etablissements 
ADD COLUMN IF NOT EXISTS is_hopital_proximite boolean DEFAULT false;

-- Add index for quick filtering
CREATE INDEX IF NOT EXISTS idx_etablissements_hpr ON public.etablissements (is_hopital_proximite) WHERE is_hopital_proximite = true;