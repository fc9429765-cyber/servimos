-- =====================================================================
-- servimos · 04 RLS del esquema de nómina (Fase 2, 2026-08-05)
--
-- El paquete original deja el RLS explícitamente incompleto ("repetir el
-- patrón para el resto de tablas"). Este script cubre las 25 tablas de
-- 03_nomina_schema.sql, no solo las 4-5 que el paquete detalla.
--
-- Dos endurecimientos sobre el original:
--   1. `set search_path` fijo en las funciones security definer (sin esto,
--      una función security definer es un vector de escalación conocido).
--   2. Políticas para las tablas que el paquete deja sin ninguna (RLS
--      habilitado sin política = cerrado por defecto, pero mejor tenerlo
--      explícito para lo que sí necesita esta fase: turnos_definicion,
--      puestos_demanda, equipos, novedades update).
-- =====================================================================

create or replace function servimos.es_servimos() returns boolean
language sql stable security definer set search_path = servimos, public as $$
  select exists (
    select 1 from servimos.perfiles
    where id = auth.uid() and rol in ('analista','jefe_area','admin')
  );
$$;

create or replace function servimos.mi_cliente() returns uuid
language sql stable security definer set search_path = servimos, public as $$
  select cliente_id from servimos.perfiles where id = auth.uid();
$$;

-- ---------------------------------------------------------------- clientes
alter table servimos.clientes enable row level security;
create policy cli_select on servimos.clientes for select
  using (servimos.es_servimos() or id = servimos.mi_cliente());

-- ---------------------------------------------------------------- perfiles
alter table servimos.perfiles enable row level security;
create policy perfil_select on servimos.perfiles for select
  using (servimos.es_servimos() or id = auth.uid());

-- ---------------------------------------------------------------- festivos / tipos_novedad (catálogos de lectura libre)
alter table servimos.festivos enable row level security;
create policy festivos_select on servimos.festivos for select using (true);

alter table servimos.tipos_novedad enable row level security;
create policy tipos_novedad_select on servimos.tipos_novedad for select using (true);

-- ---------------------------------------------------------------- equipos
alter table servimos.equipos enable row level security;
create policy equipos_select on servimos.equipos for select
  using (servimos.es_servimos() or cliente_id = servimos.mi_cliente());
create policy equipos_write on servimos.equipos for all
  using (servimos.es_servimos() or cliente_id = servimos.mi_cliente())
  with check (servimos.es_servimos() or cliente_id = servimos.mi_cliente());

-- ---------------------------------------------------------------- trabajadores
alter table servimos.trabajadores enable row level security;
create policy trab_select on servimos.trabajadores for select
  using (servimos.es_servimos() or cliente_id = servimos.mi_cliente());

-- ---------------------------------------------------------------- contratos
alter table servimos.contratos enable row level security;
create policy contratos_select on servimos.contratos for select
  using (servimos.es_servimos() or exists (
    select 1 from servimos.trabajadores t
    where t.id = contratos.trabajador_id and t.cliente_id = servimos.mi_cliente()));

-- ---------------------------------------------------------- turnos_definicion / puestos_demanda
-- La franja de turnos y la demanda por puesto se editan desde ambos lados
-- (Servimos y el supervisor del cliente) — es la "fuente de verdad de la
-- nómina" (Programación, Nivel 1 y la franja de horarios encima de ella).
alter table servimos.turnos_definicion enable row level security;
create policy turnos_select on servimos.turnos_definicion for select
  using (servimos.es_servimos() or cliente_id = servimos.mi_cliente());
create policy turnos_write on servimos.turnos_definicion for all
  using (servimos.es_servimos() or cliente_id = servimos.mi_cliente())
  with check (servimos.es_servimos() or cliente_id = servimos.mi_cliente());

alter table servimos.puestos_demanda enable row level security;
create policy puestos_select on servimos.puestos_demanda for select
  using (servimos.es_servimos() or cliente_id = servimos.mi_cliente());
create policy puestos_write on servimos.puestos_demanda for all
  using (servimos.es_servimos() or cliente_id = servimos.mi_cliente())
  with check (servimos.es_servimos() or cliente_id = servimos.mi_cliente());

-- ---------------------------------------------------------------- programación
alter table servimos.programacion enable row level security;
create policy prog_select on servimos.programacion for select
  using (servimos.es_servimos() or exists (
    select 1 from servimos.trabajadores t
    where t.id = programacion.trabajador_id and t.cliente_id = servimos.mi_cliente()));

-- El supervisor programa, pero solo hasta que la quincena esté firmada.
create policy prog_write on servimos.programacion for all
  using (exists (
    select 1 from servimos.trabajadores t
    where t.id = programacion.trabajador_id and t.cliente_id = servimos.mi_cliente()))
  with check (not exists (
    select 1 from servimos.firmas_quincena f
    where f.cliente_id = servimos.mi_cliente()
      and programacion.fecha between f.periodo_ini and f.periodo_fin));

-- ---------------------------------------------------------------- marcaciones (tabla lista; pantalla es fase futura)
alter table servimos.marcaciones enable row level security;
create policy marc_select on servimos.marcaciones for select
  using (servimos.es_servimos() or exists (
    select 1 from servimos.trabajadores t
    where t.id = marcaciones.trabajador_id and t.cliente_id = servimos.mi_cliente()));

-- ---------------------------------------------------------------- novedades
alter table servimos.novedades enable row level security;
create policy nov_select on servimos.novedades for select
  using (servimos.es_servimos() or exists (
    select 1 from servimos.trabajadores t
    where t.id = novedades.trabajador_id and t.cliente_id = servimos.mi_cliente()));

create policy nov_insert on servimos.novedades for insert
  with check (exists (
    select 1 from servimos.trabajadores t
    where t.id = novedades.trabajador_id and t.cliente_id = servimos.mi_cliente()));

-- Aprobar/rechazar una novedad es exclusivo de Servimos (no está en el
-- paquete original — el prototipo sí permite esta acción en su pantalla
-- de Novedades del lado Servimos, así que hacía falta la política).
create policy nov_update on servimos.novedades for update
  using (servimos.es_servimos())
  with check (servimos.es_servimos());

-- ---------------------------------------------------------------- cierre quincenal
alter table servimos.aprobaciones_dia enable row level security;
create policy aprob_select on servimos.aprobaciones_dia for select
  using (servimos.es_servimos() or cliente_id = servimos.mi_cliente());
create policy aprob_insert on servimos.aprobaciones_dia for insert
  with check (cliente_id = servimos.mi_cliente() or servimos.es_servimos());

alter table servimos.firmas_quincena enable row level security;
create policy firma_select on servimos.firmas_quincena for select
  using (servimos.es_servimos() or cliente_id = servimos.mi_cliente());
-- Solo el gerente de la usuaria firma.
create policy firma_insert on servimos.firmas_quincena for insert
  with check (
    cliente_id = servimos.mi_cliente() and exists (
      select 1 from servimos.perfiles where id = auth.uid() and rol = 'gerente_usuaria'));

-- ---------------------------------------------------------------- liquidación y factura (lectura para el cliente, escritura solo Servimos)
alter table servimos.liquidaciones enable row level security;
create policy liq_select on servimos.liquidaciones for select
  using (servimos.es_servimos() or cliente_id = servimos.mi_cliente());
create policy liq_write on servimos.liquidaciones for all
  using (servimos.es_servimos()) with check (servimos.es_servimos());

alter table servimos.liquidacion_conceptos enable row level security;
create policy liqc_select on servimos.liquidacion_conceptos for select
  using (servimos.es_servimos() or exists (
    select 1 from servimos.liquidaciones l
    where l.id = liquidacion_conceptos.liquidacion_id and l.cliente_id = servimos.mi_cliente()));
create policy liqc_write on servimos.liquidacion_conceptos for all
  using (servimos.es_servimos()) with check (servimos.es_servimos());

alter table servimos.prefacturas enable row level security;
create policy pref_select on servimos.prefacturas for select
  using (servimos.es_servimos() or exists (
    select 1 from servimos.liquidaciones l
    where l.id = prefacturas.liquidacion_id and l.cliente_id = servimos.mi_cliente()));
create policy pref_write on servimos.prefacturas for all
  using (servimos.es_servimos()) with check (servimos.es_servimos());

alter table servimos.prefactura_lineas enable row level security;
create policy prefl_select on servimos.prefactura_lineas for select
  using (servimos.es_servimos() or exists (
    select 1 from servimos.prefacturas p join servimos.liquidaciones l on l.id = p.liquidacion_id
    where p.id = prefactura_lineas.prefactura_id and l.cliente_id = servimos.mi_cliente()));
create policy prefl_write on servimos.prefactura_lineas for all
  using (servimos.es_servimos()) with check (servimos.es_servimos());

alter table servimos.facturas enable row level security;
create policy fact_select on servimos.facturas for select
  using (servimos.es_servimos() or exists (
    select 1 from servimos.prefacturas p join servimos.liquidaciones l on l.id = p.liquidacion_id
    where p.id = facturas.prefactura_id and l.cliente_id = servimos.mi_cliente()));
create policy fact_write on servimos.facturas for all
  using (servimos.es_servimos()) with check (servimos.es_servimos());

-- ---------------------------------------------------------------- servicio y controles
alter table servimos.sla_areas enable row level security;
create policy sla_select on servimos.sla_areas for select using (servimos.es_servimos());

alter table servimos.solicitudes enable row level security;
create policy sol_select on servimos.solicitudes for select
  using (servimos.es_servimos() or cliente_id = servimos.mi_cliente());
create policy sol_insert on servimos.solicitudes for insert
  with check (cliente_id = servimos.mi_cliente() or servimos.es_servimos());
create policy sol_update on servimos.solicitudes for update
  using (servimos.es_servimos()) with check (servimos.es_servimos());

alter table servimos.disciplinarios enable row level security;
create policy disc_select on servimos.disciplinarios for select
  using (servimos.es_servimos() or exists (
    select 1 from servimos.trabajadores t
    where t.id = disciplinarios.trabajador_id and t.cliente_id = servimos.mi_cliente()));
create policy disc_insert on servimos.disciplinarios for insert
  with check (servimos.es_servimos() or exists (
    select 1 from servimos.trabajadores t
    where t.id = disciplinarios.trabajador_id and t.cliente_id = servimos.mi_cliente()));
create policy disc_update on servimos.disciplinarios for update
  using (servimos.es_servimos()) with check (servimos.es_servimos());

alter table servimos.planillas_pila enable row level security;
create policy pila_select on servimos.planillas_pila for select
  using (servimos.es_servimos() or cliente_id = servimos.mi_cliente());
create policy pila_write on servimos.planillas_pila for all
  using (servimos.es_servimos()) with check (servimos.es_servimos());

-- El recobro es asunto exclusivo de Servimos.
alter table servimos.recobros enable row level security;
create policy recobro_all on servimos.recobros for all
  using (servimos.es_servimos()) with check (servimos.es_servimos());
