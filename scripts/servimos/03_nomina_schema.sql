-- =====================================================================
-- servimos · 03 Esquema de nómina (Fase 2, 2026-08-05)
--
-- Adaptado del paquete de especificación "Portal Servimos Limitada"
-- (schema.sql) para este proyecto:
--   - TODO objeto va calificado `servimos.*` (el original venía sin
--     esquema — convención de este repo, ver scripts/servimos/README.md).
--   - NO se crea `servimos.parametros_nomina`: los parámetros legales
--     (SMLMV, divisor de hora, recargos, aportes, provisiones) se leen de
--     las tablas ya existentes y versionadas por año en `public`
--     (parametros_legales_anio, parametros_parafiscales,
--     parametros_prestaciones) — ver lib/servimos/parametros.ts. Por eso
--     `liquidaciones` referencia `anio_parametros`, no un `parametros_id`.
--   - `gen_random_uuid()` en vez de `uuid_generate_v4()` (pgcrypto, ya
--     disponible en este proyecto — no requiere la extensión uuid-ossp).
--   - Orden de creación corregido: el original define `trabajadores`
--     antes que `equipos` pese a referenciarla — aquí `equipos` va primero.
--
-- Ejecutar DESPUÉS de 02_drop_fase1_superseded.sql.
-- =====================================================================

-- ---------------------------------------------------------------- roles
create type servimos.rol_usuario as enum (
  'supervisor',        -- cliente: programa y reporta
  'gerente_usuaria',   -- cliente: firma la quincena
  'analista',          -- Servimos: nómina
  'jefe_area',         -- Servimos: responde por un SLA (NO es el mismo
                        -- rol "jefe_area" de Fase 1, que era del lado cliente)
  'admin'              -- Servimos: todo
);

create table servimos.clientes (
  id            uuid primary key default gen_random_uuid(),
  nombre        text not null,
  nit           text not null unique,
  sector        text,
  tarifa_arl    numeric(6,5) not null,      -- p.ej. 0.04350
  centro_costo  text,
  aiu_modo      text not null default 'pct' check (aiu_modo in ('pct','cargo','escalonado','fijo')),
  aiu_pct       numeric(5,2) default 9.5,
  aiu_fijo      numeric(12,2),
  activo        boolean not null default true,
  created_at    timestamptz not null default now()
);

-- Perfil que extiende auth.users — SOLO gobierna RLS (visibilidad de
-- filas). La visibilidad de módulos en el sidebar sigue siendo
-- public.permisos_usuarios / servimos.permisos_usuarios, sin relación con
-- este `rol`. Ver nota de reconciliación de auth en el plan de esta fase.
create table servimos.perfiles (
  id          uuid primary key references auth.users on delete cascade,
  nombre      text not null,
  rol         servimos.rol_usuario not null,
  cliente_id  uuid references servimos.clientes,   -- null para usuarios de Servimos
  cargo       text,
  created_at  timestamptz not null default now(),
  constraint perfil_cliente_coherente check (
    (rol in ('supervisor','gerente_usuaria') and cliente_id is not null) or
    (rol in ('analista','jefe_area','admin')  and cliente_id is null)
  )
);

create table servimos.festivos (
  fecha  date primary key,
  nombre text not null
);

create table servimos.equipos (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references servimos.clientes on delete cascade,
  letra       text not null,
  nombre      text not null,
  area        text,
  patron      text not null default '5x2',
  unique (cliente_id, letra)
);

-- ------------------------------------------------------------ trabajadores
create table servimos.trabajadores (
  id            uuid primary key default gen_random_uuid(),
  cedula        text not null unique,
  nombre        text not null,
  cargo         text not null,
  salario       numeric(12,2) not null,
  eps           text,
  afp           text,
  cliente_id    uuid not null references servimos.clientes,
  equipo_id     uuid references servimos.equipos,
  centro_costo  text,
  cod_novasoft  text,                        -- id en el maestro de Novasoft (placeholder)
  activo        boolean not null default true,
  created_at    timestamptz not null default now()
);

create type servimos.tipo_contrato as enum ('obra_labor','fijo');

create table servimos.contratos (
  id             uuid primary key default gen_random_uuid(),
  trabajador_id  uuid not null references servimos.trabajadores on delete cascade,
  tipo           servimos.tipo_contrato not null,
  causal         text not null,              -- art. 77 Ley 50/1990
  fecha_inicio   date not null,
  fecha_fin      date,                       -- null en obra o labor
  preaviso_enviado_at timestamptz,
  decision       text check (decision in ('pendiente','renovar','no_renovar')) default 'pendiente',
  created_at     timestamptz not null default now()
);
create index on servimos.contratos (fecha_fin) where decision = 'pendiente';

-- ------------------------------------------------------------ programación
-- Fuente de verdad del cálculo de nómina.
create table servimos.turnos_definicion (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references servimos.clientes on delete cascade,
  codigo      text not null,                 -- T1, T2, T3, AD, D
  nombre      text not null,
  hora_inicio time,
  hora_fin    time,
  descanso_min int not null default 0,
  color       text,
  unique (cliente_id, codigo)
);

create table servimos.puestos_demanda (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references servimos.clientes on delete cascade,
  puesto      text not null,
  area        text,
  turno       text not null,
  requeridos  int not null,
  -- factor aplicado a domingos y festivos
  factor_dom  numeric(4,2) not null default 0.55,
  factor_fest numeric(4,2) not null default 0.70
);

create table servimos.programacion (
  id            uuid primary key default gen_random_uuid(),
  trabajador_id uuid not null references servimos.trabajadores on delete cascade,
  fecha         date not null,
  turno         text not null,               -- T1 | T2 | T3 | AD | D
  publicada     boolean not null default false,
  creada_por    uuid references servimos.perfiles,
  updated_at    timestamptz not null default now(),
  unique (trabajador_id, fecha)
);
create index on servimos.programacion (fecha);

-- Marcación desde tablet/portería (tabla creada ya; pantalla es fase futura).
create table servimos.marcaciones (
  id            uuid primary key default gen_random_uuid(),
  trabajador_id uuid not null references servimos.trabajadores on delete cascade,
  fecha         date not null,
  hora_entrada  timestamptz,
  hora_salida   timestamptz,
  punto         text,                        -- portería principal, norte…
  metodo        text,                        -- carne | huella | cedula
  estado        text,                        -- a_tiempo | tarde | no_presentado
  minutos_tarde int default 0,
  unique (trabajador_id, fecha)
);

-- -------------------------------------------------------------- novedades
create table servimos.tipos_novedad (
  codigo        text primary key,            -- HED, HEN, RN, DOM, AUS, IEG…
  etiqueta      text not null,
  unidad        text not null check (unidad in ('horas','dias','evento')),
  es_rango      boolean not null default false,
  requiere_soporte boolean not null default false,
  bloquea_turno boolean not null default false,
  norma         text,
  cod_novasoft  text                          -- placeholder, ver README del paquete
);

insert into servimos.tipos_novedad (codigo, etiqueta, unidad, es_rango, requiere_soporte, bloquea_turno, norma, cod_novasoft) values
 ('HED','Hora extra diurna','horas',false,false,false,'25% · art. 168 CST','0101'),
 ('HEN','Hora extra nocturna','horas',false,false,false,'75% · art. 168 CST','0102'),
 ('RN','Recargo nocturno','horas',false,false,false,'35% · Ley 2466/2025','0110'),
 ('DOM','Trabajo dominical o festivo','horas',false,false,false,'90% en 2026','0120'),
 ('AUS','Ausencia injustificada','dias',true,false,true,'art. 60 CST','0045'),
 ('IEG','Incapacidad general (EPS)','dias',true,true,true,'66,67% desde el día 3','0210'),
 ('IAT','Incapacidad por AT (ARL)','dias',true,true,true,'100% ARL','0215'),
 ('AT','Accidente de trabajo','evento',false,true,false,'FURAT en 2 días hábiles',null),
 ('PRE','Permiso remunerado','dias',true,false,true,'art. 57 num. 6 CST',null),
 ('PNR','Permiso no remunerado','dias',true,false,true,'acuerdo entre partes','0055'),
 ('LIC','Licencia de ley','dias',true,true,true,'Ley 1822/2017 · Ley 1280/2009',null),
 ('VAC','Vacaciones','dias',true,false,true,'art. 186 CST','0300'),
 ('SUS','Suspensión disciplinaria','dias',true,true,true,'art. 112 CST','0060'),
 ('CTU','Cambio de turno o reemplazo','evento',false,false,false,null,null),
 ('FIN','Terminación de la misión','evento',false,true,false,'art. 77 Ley 50/1990',null)
on conflict (codigo) do nothing;

create type servimos.estado_novedad as enum ('pendiente','aprobada','rechazada','en_tramite_arl');

create table servimos.novedades (
  id            uuid primary key default gen_random_uuid(),
  trabajador_id uuid not null references servimos.trabajadores on delete cascade,
  tipo          text not null references servimos.tipos_novedad,
  fecha_desde   date not null,
  fecha_hasta   date not null,
  cantidad      numeric(8,2) not null,
  observacion   text,
  soporte_path  text,                        -- Supabase Storage, bucket servimos-soportes
  estado        servimos.estado_novedad not null default 'pendiente',
  reportada_por uuid references servimos.perfiles,
  aprobada_por  uuid references servimos.perfiles,
  aprobada_at   timestamptz,
  created_at    timestamptz not null default now()
);
create index on servimos.novedades (trabajador_id, fecha_desde);

-- ------------------------------------------------------- cierre quincenal
create table servimos.aprobaciones_dia (
  id           uuid primary key default gen_random_uuid(),
  cliente_id   uuid not null references servimos.clientes on delete cascade,
  fecha        date not null,
  aprobada_por uuid not null references servimos.perfiles,
  aprobada_at  timestamptz not null default now(),
  unique (cliente_id, fecha)
);

create table servimos.firmas_quincena (
  id           uuid primary key default gen_random_uuid(),
  cliente_id   uuid not null references servimos.clientes on delete cascade,
  periodo_ini  date not null,
  periodo_fin  date not null,
  firmada_por  uuid not null references servimos.perfiles,
  firmada_at   timestamptz not null default now(),
  hash_sha256  text not null,                -- Ley 527 de 1999
  unique (cliente_id, periodo_ini)
);

-- ------------------------------------------------- liquidación y factura
create table servimos.liquidaciones (
  id             uuid primary key default gen_random_uuid(),
  cliente_id     uuid not null references servimos.clientes,
  periodo_ini    date not null,
  periodo_fin    date not null,
  -- Los parámetros legales NO viven en este esquema: se leen de
  -- public.parametros_legales_anio (compartido con la nómina de LIP,
  -- misma ley colombiana). Se guarda solo el año usado, para trazabilidad.
  anio_parametros int not null references public.parametros_legales_anio(anio),
  devengado      numeric(14,2) not null,
  prestacional   numeric(14,2) not null,
  costo_total    numeric(14,2) not null,
  calculada_at   timestamptz not null default now(),
  unique (cliente_id, periodo_ini)
);

create table servimos.liquidacion_conceptos (
  id              uuid primary key default gen_random_uuid(),
  liquidacion_id  uuid not null references servimos.liquidaciones on delete cascade,
  trabajador_id   uuid references servimos.trabajadores,
  concepto        text not null,             -- ORD, RN, DOM, HED, HEN, INC…
  cantidad        numeric(10,2) not null,
  factor          numeric(6,4),
  valor           numeric(14,2) not null
);

create type servimos.estado_prefactura as enum ('borrador','en_revision','firmada','emitida');

create table servimos.prefacturas (
  id             uuid primary key default gen_random_uuid(),
  liquidacion_id uuid not null references servimos.liquidaciones on delete cascade,
  numero         text not null unique,
  aiu_modo       text not null,
  aiu_valor      numeric(14,2) not null,
  base_iva       numeric(14,2) not null,
  iva            numeric(14,2) not null,
  total          numeric(14,2) not null,
  estado         servimos.estado_prefactura not null default 'borrador',
  created_at     timestamptz not null default now()
);

create table servimos.prefactura_lineas (
  id             uuid primary key default gen_random_uuid(),
  prefactura_id  uuid not null references servimos.prefacturas on delete cascade,
  concepto       text not null,
  detalle        text,
  cantidad       text,
  valor          numeric(14,2) not null,
  orden          int not null default 0
);

create table servimos.facturas (
  id             uuid primary key default gen_random_uuid(),
  prefactura_id  uuid not null references servimos.prefacturas,
  numero         text not null unique,
  cufe           text,
  emitida_at     timestamptz,
  vence_at       date,
  estado         text not null default 'emitida',  -- emitida | aceptada | pagada | glosada
  valor          numeric(14,2) not null
);

-- --------------------------------------------------- servicio y controles
create table servimos.sla_areas (
  id         uuid primary key default gen_random_uuid(),
  area       text not null unique,
  jefe_id    uuid references servimos.perfiles,
  indicador  text not null,
  meta_pct   numeric(5,2) not null
);

create table servimos.solicitudes (
  id           uuid primary key default gen_random_uuid(),
  codigo       text not null unique,
  cliente_id   uuid not null references servimos.clientes,
  tipo         text not null,   -- requisicion | certificado | disciplinario | sst | facturacion
  titulo       text not null,
  descripcion  text,
  area         text references servimos.sla_areas(area),
  sla_horas    int not null,
  estado       text not null default 'abierta',
  creada_por   uuid references servimos.perfiles,
  creada_at    timestamptz not null default now(),
  primera_respuesta_at timestamptz,
  cerrada_at   timestamptz
);
create index on servimos.solicitudes (cliente_id, estado);

create table servimos.disciplinarios (
  id             uuid primary key default gen_random_uuid(),
  codigo         text not null unique,
  trabajador_id  uuid not null references servimos.trabajadores,
  falta          text not null,
  relato         text not null,
  testigo        text,
  fecha_hecho    date not null,
  -- el cliente solicita; Servimos instruye y decide
  solicitada_por uuid references servimos.perfiles,
  estado         text not null default 'radicado',  -- radicado | descargos | decidido | archivado
  descargos_at   timestamptz,
  decision       text,
  sancion_dias   int,
  novedad_id     uuid references servimos.novedades,   -- la sanción se traslada a nómina
  created_at     timestamptz not null default now()
);

create table servimos.planillas_pila (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references servimos.clientes,
  periodo     date not null,
  numero      text not null,
  tipo        text not null,      -- E | N | A
  operador    text,
  cotizantes  int not null,
  valor       numeric(14,2) not null,
  fecha_pago  date,
  archivo_path text,
  estado      text not null default 'en_proceso'
);

create table servimos.recobros (
  id            uuid primary key default gen_random_uuid(),
  codigo        text not null unique,
  novedad_id    uuid not null references servimos.novedades,
  trabajador_id uuid not null references servimos.trabajadores,
  origen        text not null check (origen in ('EPS','ARL','AFP')),
  entidad       text not null,
  diagnostico   text,
  dias          int not null,
  valor         numeric(14,2) not null,
  estado        text not null default 'en_transcripcion',
  -- en_transcripcion | radicado | glosado | subsanado | pagado | prescrito
  radicado_at   timestamptz,
  pagado_at     timestamptz,
  glosa         text,
  -- La acción de recobro prescribe a los 3 años.
  prescribe_at  date generated always as ((created_at + interval '3 years')::date) stored,
  created_at    timestamptz not null default now()
);
