/*
  # Simplify Measurement Weights to Garment Types
  
  1. Changes
    - Replace complex product_category with simple garment_type
    - Define 3 clear categories: upper, lower, full
    - Update default weights to be simple and intuitive
    
  2. Garment Types
    - `upper`: Parte superior (camisas, blusas) - Busto é mais importante
    - `lower`: Parte inferior (calças, shorts) - Cintura e Quadril mais importantes
    - `full`: Peça completa (vestidos, macacões) - Todas as medidas igualmente importantes
    
  3. Weight System (simplified)
    - `upper`: Busto weight = 2.0, outros = 1.0
    - `lower`: Cintura weight = 2.0, Quadril weight = 2.0, outros = 1.0
    - `full`: Todos weight = 1.0 (igual)
*/

-- Drop old enum type if exists
DO $$ 
BEGIN
  DROP TYPE IF EXISTS product_category CASCADE;
EXCEPTION
  WHEN undefined_object THEN null;
END $$;

-- Create new garment type enum
DO $$ BEGIN
  CREATE TYPE garment_type AS ENUM ('upper', 'lower', 'full');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Update collections table to use garment_type
DO $$
BEGIN
  -- Drop old column if exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'collections' AND column_name = 'product_category'
  ) THEN
    ALTER TABLE collections DROP COLUMN product_category;
  END IF;
  
  -- Add garment_type column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'collections' AND column_name = 'garment_type'
  ) THEN
    ALTER TABLE collections 
    ADD COLUMN garment_type garment_type DEFAULT 'full';
  END IF;
END $$;

-- Update comment
COMMENT ON COLUMN collections.garment_type IS 'Type of garment: upper (tops), lower (bottoms), or full (dresses/full-body)';

-- Drop old function
DROP FUNCTION IF EXISTS get_default_measurement_weights(product_category);

-- Create simplified function to get default weights for a garment type
CREATE OR REPLACE FUNCTION get_default_measurement_weights(type garment_type)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE type
    -- Upper: Busto é mais importante (peso 2.0)
    WHEN 'upper' THEN '{"Busto": 2.0, "Peito": 2.0, "Cintura": 1.0, "Quadril": 1.0, "Comprimento": 1.0, "Ombro": 1.0}'::jsonb
    
    -- Lower: Cintura e Quadril são mais importantes (peso 2.0 cada)
    WHEN 'lower' THEN '{"Busto": 1.0, "Peito": 1.0, "Cintura": 2.0, "Quadril": 2.0, "Comprimento": 1.0, "Tornozelo": 1.0}'::jsonb
    
    -- Full: Todas as medidas igualmente importantes (peso 1.0)
    WHEN 'full' THEN '{"Busto": 1.0, "Peito": 1.0, "Cintura": 1.0, "Quadril": 1.0, "Comprimento": 1.0, "Ombro": 1.0}'::jsonb
    
    ELSE '{}'::jsonb
  END;
END;
$$;

-- Drop old view
DROP VIEW IF EXISTS collection_measurement_weights;

-- Create updated view to get effective measurement weights
CREATE OR REPLACE VIEW collection_measurement_weights AS
SELECT 
  id,
  user_id,
  name,
  garment_type,
  COALESCE(
    measurement_weights,
    get_default_measurement_weights(garment_type)
  ) as effective_weights
FROM collections;

-- Grant access to view
GRANT SELECT ON collection_measurement_weights TO authenticated, anon;
