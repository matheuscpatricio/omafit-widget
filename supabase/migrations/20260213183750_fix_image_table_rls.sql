/*
  # Fix Image Table RLS

  ## Changes
  
  ### Add user_id and proper RLS policies to image table
    Table currently has RLS enabled but no policies (blocks all access)
    Table is currently empty, so safe to add user_id column
    
  ### Changes:
    1. Add user_id column with foreign key to users
    2. Create proper RLS policies for authenticated users
*/

-- Add user_id column
ALTER TABLE image 
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Create index on user_id for performance
CREATE INDEX IF NOT EXISTS idx_image_user_id ON image(user_id);

-- Create RLS policies
CREATE POLICY "Users can view own images"
  ON image FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own images"
  ON image FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own images"
  ON image FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own images"
  ON image FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);