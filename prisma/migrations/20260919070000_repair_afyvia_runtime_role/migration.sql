-- Repair the runtime RLS role after the Aether -> Afyvia rename.
--
-- Historical migration 20260901210000_runtime_nobyprlsrls created
-- "aether_runtime", while the application now correctly SET ROLEs to
-- "afyvia_runtime". Because the historical migration is already applied in
-- production, this must be a new forward migration rather than an edit.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'afyvia_runtime') THEN
    CREATE ROLE afyvia_runtime NOLOGIN NOBYPASSRLS NOSUPERUSER;
  END IF;
END $$;

-- The database connection role must be able to SET ROLE afyvia_runtime.
GRANT afyvia_runtime TO CURRENT_USER;

-- Grant the runtime role access to all existing application objects.
GRANT USAGE ON SCHEMA public TO afyvia_runtime;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO afyvia_runtime;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO afyvia_runtime;

-- Ensure future Prisma migrations automatically remain accessible to the
-- runtime role without needing one-off grants.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO afyvia_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO afyvia_runtime;

-- RLS helper functions live in the app schema.
GRANT USAGE ON SCHEMA app TO afyvia_runtime;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA app TO afyvia_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA app GRANT EXECUTE ON FUNCTIONS TO afyvia_runtime;
