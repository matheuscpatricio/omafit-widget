/*
  # Create Try-On Images Storage Bucket

  1. Storage
    - Create `tryon-images` bucket for storing customer uploaded images
    - Set bucket as public for easy access by fal.ai API
    - Add storage policies for public read access
  
  2. Security
    - Allow public read access to all images in the bucket
    - Restrict write access to authenticated service role only
*/

-- Create the tryon-images bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('tryon-images', 'tryon-images', true)
ON CONFLICT (id) DO UPDATE
SET public = true;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public read access for tryon images" ON storage.objects;
DROP POLICY IF EXISTS "Service role can upload tryon images" ON storage.objects;
DROP POLICY IF EXISTS "Service role can delete tryon images" ON storage.objects;

-- Allow public read access to all images in tryon-images bucket
CREATE POLICY "Public read access for tryon images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'tryon-images');

-- Allow service role to upload images
CREATE POLICY "Service role can upload tryon images"
ON storage.objects
FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'tryon-images');

-- Allow service role to delete old images (cleanup)
CREATE POLICY "Service role can delete tryon images"
ON storage.objects
FOR DELETE
TO service_role
USING (bucket_id = 'tryon-images');
