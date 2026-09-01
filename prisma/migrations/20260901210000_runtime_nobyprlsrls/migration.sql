-- Neon / table-owner roles often have BYPASSRLS, which ignores FORCE ROW LEVEL SECURITY.
-- Application queries SET ROLE aether_runtime so policies actually evaluate.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'aether_runtime') THEN
    CREATE ROLE aether_runtime NOLOGIN NOBYPASSRLS NOSUPERUSER;
  END IF;
END $$;

GRANT aether_runtime TO CURRENT_USER;

GRANT USAGE ON SCHEMA public TO aether_runtime;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO aether_runtime;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO aether_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO aether_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO aether_runtime;

GRANT USAGE ON SCHEMA app TO aether_runtime;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA app TO aether_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA app GRANT EXECUTE ON FUNCTIONS TO aether_runtime;
