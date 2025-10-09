-- Migration: add damaged and lost quantity tracking to items
-- Non destructive; default 0

ALTER TABLE public.items
  ADD COLUMN IF NOT EXISTS damaged_quantity integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lost_quantity integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.items.damaged_quantity IS 'Jumlah unit rusak (tidak bisa dipinjam)';
COMMENT ON COLUMN public.items.lost_quantity IS 'Jumlah unit hilang (dicatat untuk arsip)';

-- Optional: ensure available_quantity never exceeds (quantity - damaged - lost)
CREATE OR REPLACE FUNCTION public.normalize_available_quantity()
RETURNS trigger AS $$
BEGIN
  IF NEW.available_quantity IS NULL THEN
    NEW.available_quantity := GREATEST(NEW.quantity - COALESCE(NEW.damaged_quantity,0) - COALESCE(NEW.lost_quantity,0),0);
  ELSE
    NEW.available_quantity := LEAST(NEW.available_quantity, GREATEST(NEW.quantity - COALESCE(NEW.damaged_quantity,0) - COALESCE(NEW.lost_quantity,0),0));
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_items_normalize_available ON public.items;
CREATE TRIGGER trg_items_normalize_available
BEFORE INSERT OR UPDATE ON public.items
FOR EACH ROW
EXECUTE FUNCTION public.normalize_available_quantity();
