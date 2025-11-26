/*
  # Fix Security Issues - Fix Multiple Permissive Policies

  1. Security Improvements
    - Remove duplicate permissive policies on image table
    - Keep only the service policy which covers all operations
    - This prevents potential security issues from conflicting policies
    
  2. Changes
    - Drop "Public can view images" policy (redundant with service policy)
    - Keep "Service can manage images" policy for full access control
*/

DROP POLICY IF EXISTS "Public can view images" ON image;