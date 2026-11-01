#!/usr/bin/env bash
# Runs the migration + checks against a throwaway local Postgres database.
# Usage: PGHOST=... PGPORT=... PGUSER=postgres ./supabase/tests/run.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
DB=testloop_test_$$
psql -q -c "create database $DB"
trap 'psql -q -c "drop database if exists $DB" >/dev/null' EXIT
psql -q -d "$DB" -v ON_ERROR_STOP=1 -f supabase/tests/supabase_shim.sql
psql -q -d "$DB" -v ON_ERROR_STOP=1 -f supabase/migrations/0001_init.sql
psql -q -d "$DB" -v ON_ERROR_STOP=1 -f supabase/tests/exchange.test.sql
echo "All database checks passed."
