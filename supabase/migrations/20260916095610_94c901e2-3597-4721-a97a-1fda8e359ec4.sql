CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Indexes for fast per-subject reads and search
CREATE INDEX IF NOT EXISTS idx_subjects_slug ON public.subjects (slug);
CREATE INDEX IF NOT EXISTS idx_subjects_position ON public.subjects ("position", created_at);
CREATE INDEX IF NOT EXISTS idx_notes_subject ON public.notes (subject_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_files_subject_kind ON public.files (subject_id, kind, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_links_subject ON public.links (subject_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_subjects_name_trgm ON public.subjects USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_notes_title_trgm ON public.notes USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_notes_content_trgm ON public.notes USING gin (content gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_files_title_trgm ON public.files USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_links_title_trgm ON public.links USING gin (title gin_trgm_ops);

-- Subject overview with material counts (no full-table downloads in the browser)
CREATE OR REPLACE VIEW public.subject_overview
WITH (security_invoker = true) AS
SELECT
  s.id,
  s.name,
  s.slug,
  s.description,
  s.cover_url,
  s."position",
  s.created_at,
  s.updated_at,
  (SELECT count(*) FROM public.notes n WHERE n.subject_id = s.id) AS notes_count,
  (SELECT count(*) FROM public.files f WHERE f.subject_id = s.id AND f.kind = 'pdf') AS pdfs_count,
  (SELECT count(*) FROM public.files f WHERE f.subject_id = s.id AND f.kind = 'image') AS images_count,
  (SELECT count(*) FROM public.links l WHERE l.subject_id = s.id) AS links_count
FROM public.subjects s;

GRANT SELECT ON public.subject_overview TO anon, authenticated;
GRANT SELECT ON public.subject_overview TO service_role;

-- Session revocation support
ALTER TABLE public.portal_settings
  ADD COLUMN IF NOT EXISTS session_version integer NOT NULL DEFAULT 1;

-- Login attempt throttling (private: service role only)
CREATE TABLE IF NOT EXISTS public.author_login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now(),
  locked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_login_attempts_ip ON public.author_login_attempts (ip_hash);
GRANT ALL ON public.author_login_attempts TO service_role;
ALTER TABLE public.author_login_attempts ENABLE ROW LEVEL SECURITY;

-- Author activity log (private: service role only)
CREATE TABLE IF NOT EXISTS public.author_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  target text,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.author_audit_log (created_at DESC);
GRANT ALL ON public.author_audit_log TO service_role;
ALTER TABLE public.author_audit_log ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_author_login_attempts_updated_at
BEFORE UPDATE ON public.author_login_attempts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();