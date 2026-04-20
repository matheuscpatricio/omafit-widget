/*
  # tryon-images privado + pasta self-hosted-results sem leitura anónima

  - Bucket `tryon-images` deixa de ser público: sem acesso direto a `/object/public/...`.
  - Leitura anónima (apikey anon) só em `tryon-models/` e `tryon-garments/` (inputs do try-on).
  - Pasta `self-hosted-results/` sem SELECT para `anon` — resultados só via URL assinada (edge `tryon-status` com service role) ou utilizador autenticado no dashboard.
  - `service_role` mantém INSERT/DELETE no bucket (worker + edge uploads).

  O widget continua a mostrar imagens: após upload o cliente pede `createSignedUrl`; o resultado vem assinado em `tryon-status`.
*/

UPDATE storage.buckets
SET public = false
WHERE id = 'tryon-images';

DROP POLICY IF EXISTS "Public read access for tryon images" ON storage.objects;
DROP POLICY IF EXISTS "Anon read tryon input folders only" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated read all tryon-images" ON storage.objects;
DROP POLICY IF EXISTS "Service role full access self-hosted-results" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated read self-hosted-results" ON storage.objects;

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

-- INSERT/DELETE para service_role já existem em 20251127163506_create_tryon_images_bucket.sql
