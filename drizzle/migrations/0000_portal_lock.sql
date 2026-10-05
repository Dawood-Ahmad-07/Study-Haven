CREATE TABLE public.portal_lock (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  locked boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.portal_lock TO anon, authenticated;
GRANT ALL ON public.portal_lock TO service_role;
ALTER TABLE public.portal_lock ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read lock state" ON public.portal_lock FOR SELECT TO anon, authenticated USING (true);
INSERT INTO public.portal_lock (id, locked) VALUES (1, false) ON CONFLICT DO NOTHING;
CREATE TRIGGER update_portal_lock_updated_at BEFORE UPDATE ON public.portal_lock FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.portal_locked()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT COALESCE((SELECT locked FROM public.portal_lock WHERE id = 1), false) $$;

CREATE POLICY "Hidden while portal locked" ON public.subjects AS RESTRICTIVE FOR SELECT TO anon, authenticated USING (NOT public.portal_locked());
CREATE POLICY "Hidden while portal locked" ON public.notes AS RESTRICTIVE FOR SELECT TO anon, authenticated USING (NOT public.portal_locked());
CREATE POLICY "Hidden while portal locked" ON public.files AS RESTRICTIVE FOR SELECT TO anon, authenticated USING (NOT public.portal_locked());
CREATE POLICY "Hidden while portal locked" ON public.links AS RESTRICTIVE FOR SELECT TO anon, authenticated USING (NOT public.portal_locked());