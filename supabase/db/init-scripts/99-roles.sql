-- NOTE: change to your own passwords for production environments
\set pgpass `echo "$POSTGRES_PASSWORD"`

ALTER USER authenticator WITH PASSWORD :'pgpass';
ALTER USER supabase_auth_admin WITH PASSWORD :'pgpass';

-- supabase_functions_admin / supabase_storage_admin / pgbouncer aren't
-- created by this image build (this stack doesn't run Edge Functions,
-- Storage, or an external pooler) — set their passwords only if present.
-- (Plain \if, not a DO $$ block: psql's :'var' substitution is suppressed
-- inside dollar-quoted strings, which would otherwise leave a literal
-- ":'pgpass'" for the server to choke on.)
select exists (select from pg_roles where rolname = 'pgbouncer') as has_pgbouncer \gset
\if :has_pgbouncer
alter user pgbouncer with password :'pgpass';
\endif

select exists (select from pg_roles where rolname = 'supabase_functions_admin') as has_functions_admin \gset
\if :has_functions_admin
alter user supabase_functions_admin with password :'pgpass';
\endif

select exists (select from pg_roles where rolname = 'supabase_storage_admin') as has_storage_admin \gset
\if :has_storage_admin
alter user supabase_storage_admin with password :'pgpass';
\endif
