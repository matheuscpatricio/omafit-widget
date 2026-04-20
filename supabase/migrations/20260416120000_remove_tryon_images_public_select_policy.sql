/*
  # Remover política RLS pública em tryon-images

  Remove "Public read access for tryon images" (SELECT para role `public` em todo o bucket),
  criada em 20251127163506_create_tryon_images_bucket.sql.

  Substitui por leitura anónima só em tryon-models/ e tryon-garments/, e leitura autenticada
  em todo o bucket tryon-images — alinhado com 20260413120000_private_self_hosted_results_bucket.sql.

  Idempotente: pode correr várias vezes.
*/

UPDATE storage.buckets
SET public = false
WHERE id = 'tryon-images';

DROP POLICY IF EXISTS "Public read access for tryon images" ON storage.objects;

DROP POLICY IF EXISTS "Anon read tryon input folders only" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated read all tryon-images" ON storage.objects;

CREATE POLICY "Anon read tryon input folders only"
ON storage.objects
FOR SELECT
TO anon
USING (
  bucket_id = 'tryon-images'
  AND split_part(name, '/', 1) IN ('tryon-models', 'tryon-garments')
);

CREATE POLICY "Authenticated read all tryon-images"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'tryon-images');
