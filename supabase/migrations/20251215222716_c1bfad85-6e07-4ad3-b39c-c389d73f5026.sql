-- Fix security warning: set search_path on functions
CREATE OR REPLACE FUNCTION public.update_eventos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;