-- =====================================================================
-- servimos · Grants del esquema (correr una vez en Supabase → SQL Editor).
-- Aditivo e idempotente: los GRANT no fallan si el privilegio ya existe.
--
-- Supabase NO otorga privilegios a un esquema nuevo automáticamente como
-- hace con `public`. Sin este script, aunque el esquema esté expuesto en
-- Settings → API, PostgREST devuelve error de permisos al consultarlo.
-- =====================================================================

create schema if not exists servimos;

grant usage on schema servimos to anon, authenticated, service_role;

grant select, insert, update, delete on all tables in schema servimos
  to anon, authenticated, service_role;
grant usage, select on all sequences in schema servimos
  to anon, authenticated, service_role;
grant execute on all functions in schema servimos
  to anon, authenticated, service_role;

-- Para que las tablas/funciones que se creen DESPUÉS de este script también
-- queden con permisos automáticamente (sin repetir los GRANT de arriba):
alter default privileges in schema servimos
  grant select, insert, update, delete on tables to anon, authenticated, service_role;
alter default privileges in schema servimos
  grant usage, select on sequences to anon, authenticated, service_role;
alter default privileges in schema servimos
  grant execute on functions to anon, authenticated, service_role;
