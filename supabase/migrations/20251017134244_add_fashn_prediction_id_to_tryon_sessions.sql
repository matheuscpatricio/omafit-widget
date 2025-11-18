/*
  # Add fashn_prediction_id to tryon_sessions

  1. Changes
    - Add `fashn_prediction_id` column to store the Fashn.ai prediction ID
    - This allows tracking the status of the try-on process with Fashn.ai API
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tryon_sessions' AND column_name = 'fashn_prediction_id'
  ) THEN
    ALTER TABLE tryon_sessions ADD COLUMN fashn_prediction_id text;
  END IF;
END $$;