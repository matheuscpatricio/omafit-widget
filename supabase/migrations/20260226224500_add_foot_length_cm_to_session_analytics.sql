/*
  # Add foot_length_cm to session_analytics

  Persiste a medida calculada pelo MediaPipe do widget de calçados
  em uma coluna própria de `session_analytics`, além do JSON
  `user_measurements`.
*/

ALTER TABLE public.session_analytics
ADD COLUMN IF NOT EXISTS foot_length_cm numeric;

UPDATE public.session_analytics
SET foot_length_cm = CASE
  WHEN COALESCE(user_measurements->>'foot_length_cm', user_measurements->>'footLengthCm', '') ~ '^-?[0-9]+(\.[0-9]+)?$'
    THEN COALESCE(user_measurements->>'foot_length_cm', user_measurements->>'footLengthCm')::numeric
  ELSE foot_length_cm
END
WHERE foot_length_cm IS NULL
  AND user_measurements IS NOT NULL;
