/*
  # Fix trigger that references non-existent public_id column

  1. Changes
    - Drop the existing trigger function that tries to access NEW.public_id
    - Since public_id doesn't exist in tryon_sessions, we'll remove the trigger entirely
    - The session_analytics table should be populated directly from the edge function
    - This prevents the error "record 'new' has no field 'public_id'"

  2. Security
    - No RLS changes needed
*/

-- Drop the trigger first
DROP TRIGGER IF EXISTS trg_sync_tryon_to_session_analytics ON tryon_sessions;

-- Drop the function
DROP FUNCTION IF EXISTS trigger_sync_tryon_to_session_analytics();
