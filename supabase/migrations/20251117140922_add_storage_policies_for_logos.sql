/*
  # Add Storage Policies for Widget Logos

  1. Security
    - Enable authenticated users to upload widget logos to the "Video banner" bucket
    - Users can only manage their own files (folder structure: widget-logos/{user_id}-*)
    - Allow public read access to uploaded logos
  
  2. Policies Created
    - INSERT: Users can upload files to their own widget-logos folder
    - SELECT: Anyone can view uploaded logos (needed for public widget display)
    - UPDATE: Users can update their own logos
    - DELETE: Users can delete their own logos
*/

-- Policy for INSERT (upload)
CREATE POLICY "Users can upload widget logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'Video banner' 
  AND (storage.foldername(name))[1] = 'widget-logos'
  AND (storage.filename(name)) LIKE auth.uid()::text || '%'
);

-- Policy for SELECT (read/download)
CREATE POLICY "Anyone can view widget logos"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'Video banner' 
  AND (storage.foldername(name))[1] = 'widget-logos'
);

-- Policy for UPDATE
CREATE POLICY "Users can update their own widget logos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'Video banner' 
  AND (storage.foldername(name))[1] = 'widget-logos'
  AND (storage.filename(name)) LIKE auth.uid()::text || '%'
)
WITH CHECK (
  bucket_id = 'Video banner' 
  AND (storage.foldername(name))[1] = 'widget-logos'
  AND (storage.filename(name)) LIKE auth.uid()::text || '%'
);

-- Policy for DELETE
CREATE POLICY "Users can delete their own widget logos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'Video banner' 
  AND (storage.foldername(name))[1] = 'widget-logos'
  AND (storage.filename(name)) LIKE auth.uid()::text || '%'
);
