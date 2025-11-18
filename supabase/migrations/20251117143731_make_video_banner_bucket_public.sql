/*
  # Make Video banner bucket public

  1. Changes
    - Update the "Video banner" storage bucket to be public
    - This allows uploaded logo images to be displayed without authentication
  
  2. Security
    - Read access is public (anyone can view)
    - Write access is still restricted by RLS policies (only authenticated users can upload)
*/

UPDATE storage.buckets 
SET public = true 
WHERE id = 'Video banner';
