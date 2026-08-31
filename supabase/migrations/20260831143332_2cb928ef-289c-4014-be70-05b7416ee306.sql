CREATE TABLE public.datasets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  player_type text NOT NULL,
  row_count integer NOT NULL DEFAULT 0,
  columns jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.datasets TO anon, authenticated;
GRANT ALL ON public.datasets TO service_role;
ALTER TABLE public.datasets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "datasets open access" ON public.datasets FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.position_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_type text NOT NULL UNIQUE,
  id_map jsonb NOT NULL DEFAULT '{}'::jsonb,
  metrics jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.position_profiles TO anon, authenticated;
GRANT ALL ON public.position_profiles TO service_role;
ALTER TABLE public.position_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "position_profiles open access" ON public.position_profiles FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.players (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dataset_id uuid NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
  player_type text NOT NULL,
  name text NOT NULL,
  club text,
  age numeric,
  position text,
  minutes numeric,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.players TO anon, authenticated;
GRANT ALL ON public.players TO service_role;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "players open access" ON public.players FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX players_dataset_idx ON public.players (dataset_id);
CREATE INDEX players_type_idx ON public.players (player_type);

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER position_profiles_updated_at BEFORE UPDATE ON public.position_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();