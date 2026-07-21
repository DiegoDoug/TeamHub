FROM supabase/postgres:17.6.1.136

# Supabase's own migrate.sh globs *.sql inside these two directories
# (alongside the files it already ships there for role/schema bootstrap),
# so ours just need to be added, not replace the directory outright.
COPY init-scripts/99-jwt.sql /docker-entrypoint-initdb.d/init-scripts/99-jwt.sql
COPY init-scripts/99-roles.sql /docker-entrypoint-initdb.d/init-scripts/99-roles.sql
COPY migrations/99-realtime.sql /docker-entrypoint-initdb.d/migrations/99-realtime.sql
COPY migrations/100_schema.sql /docker-entrypoint-initdb.d/migrations/100_schema.sql
COPY migrations/101_functions_triggers.sql /docker-entrypoint-initdb.d/migrations/101_functions_triggers.sql
COPY migrations/102_rls_policies.sql /docker-entrypoint-initdb.d/migrations/102_rls_policies.sql
COPY migrations/200_roster_lookup.sql /docker-entrypoint-initdb.d/migrations/200_roster_lookup.sql
COPY migrations/201_roster_import.sql /docker-entrypoint-initdb.d/migrations/201_roster_import.sql
