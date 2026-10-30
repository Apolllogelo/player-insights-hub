-- Add uid column to players table for Football Manager face lookup
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS uid TEXT;
CREATE INDEX IF NOT EXISTS players_uid_idx ON public.players (uid);
