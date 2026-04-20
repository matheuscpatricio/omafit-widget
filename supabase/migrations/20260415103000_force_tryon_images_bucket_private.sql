/*
  # Forçar tryon-images como bucket privado

  Aplica `public = false` em `storage.buckets`. Idempotente.
  Executa também no SQL Editor do Dashboard se as migrações ainda não foram corridas no projeto.
*/

UPDATE storage.buckets
SET public = false
WHERE id = 'tryon-images';
