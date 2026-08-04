-- =====================================================================
-- servimos · 01 Fundación (Fase 1): empresas cliente, personal en misión,
-- accesos (staff interno + portal empresa cliente), solicitudes con SLA,
-- programación de turnos, horas extra (aprobación 2 niveles), novedades,
-- incapacidades (portal trabajador) y nómina generada (cálculo básico).
--
-- Aditivo e idempotente (CREATE TABLE IF NOT EXISTS). Correr DESPUÉS de
-- 00_grants_servimos.sql — ese script ya dejó `alter default privileges`
-- para el esquema, así que las tablas nuevas creadas aquí heredan
-- automáticamente los grants para anon/authenticated/service_role sin
-- tener que repetirlos.
--
-- El motor de nómina "con todo lo de ley" (recargos, HED/HEN/HEF,
-- festivos) y la revisión de incapacidades por LIPbot NO están en esta
-- fase — ver memoria `project_servimos_product_vision` para el alcance
-- completo. Aquí `nomina_generada` es un cálculo básico (horas × tarifa)
-- y `incapacidades` se aprueba manualmente.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Empresas cliente de Servimos (las que piden personal en misión)
-- ---------------------------------------------------------------------
create table if not exists servimos.empresas_cliente (
  id bigint generated always as identity primary key,
  nombre text not null,
  nit text,
  ciudad text,
  contacto_nombre text,
  contacto_email text,
  contacto_telefono text,
  sla_horas_objetivo integer not null default 48,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Personal en misión (equivalente a `headcount` de LIP, pero de Servimos)
-- ---------------------------------------------------------------------
create table if not exists servimos.personal_mision (
  id bigint generated always as identity primary key,
  identificacion text not null,
  nombre text not null,
  cargo text,
  empresa_cliente_id bigint references servimos.empresas_cliente(id),
  estado text not null default 'Activo', -- Activo | Retirado
  fecha_ingreso date,
  tarifa_hora numeric(12,2), -- para el cálculo básico de nómina de esta fase
  created_at timestamptz not null default now()
);
create unique index if not exists personal_mision_identificacion_idx
  on servimos.personal_mision (identificacion);
create index if not exists personal_mision_empresa_idx
  on servimos.personal_mision (empresa_cliente_id);

-- ---------------------------------------------------------------------
-- Acceso: usuarios de la empresa cliente (portal externo, Supabase Auth
-- real). rol: 'solicitante' (default) | 'supervisor' (asigna horas
-- extra) | 'jefe_area' (aprueba horas extra).
-- ---------------------------------------------------------------------
create table if not exists servimos.usuarios_empresa_cliente (
  id bigint generated always as identity primary key,
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  empresa_cliente_id bigint not null references servimos.empresas_cliente(id),
  nombre text,
  rol text not null default 'solicitante',
  activo boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index if not exists usuarios_empresa_cliente_auth_user_idx
  on servimos.usuarios_empresa_cliente (auth_user_id);

-- ---------------------------------------------------------------------
-- Acceso: staff interno de Servimos (permisos por módulo — mismo patrón
-- que `public.permisos_usuarios` de LIP, aislado en este esquema)
-- ---------------------------------------------------------------------
create table if not exists servimos.permisos_usuarios (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  servimos_solicitudes boolean not null default false,
  servimos_programacion boolean not null default false,
  servimos_horas_extra boolean not null default false,
  servimos_novedades boolean not null default false,
  servimos_cuadro_control boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index if not exists permisos_usuarios_usuario_id_idx
  on servimos.permisos_usuarios (usuario_id);

-- ---------------------------------------------------------------------
-- Solicitudes de personal (con indicador de cumplimiento SLA). El
-- cálculo de `fecha_limite_sla`/`cumplio_sla` lo hace la server action al
-- crear/entregar (no queda como columna generada, para no depender de
-- particularidades de la versión de Postgres del proyecto).
-- ---------------------------------------------------------------------
create table if not exists servimos.solicitudes_personal (
  id bigint generated always as identity primary key,
  empresa_cliente_id bigint not null references servimos.empresas_cliente(id),
  puesto text not null,
  cantidad integer not null default 1,
  fecha_requerida date not null,
  observaciones text,
  estado text not null default 'pendiente', -- pendiente | en_proceso | entregada | rechazada
  fecha_solicitud timestamptz not null default now(),
  sla_horas_objetivo integer not null default 48,
  fecha_limite_sla timestamptz,
  fecha_entrega timestamptz,
  cumplio_sla boolean,
  solicitado_por uuid references auth.users(id),
  aprobado_por uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists solicitudes_personal_empresa_idx
  on servimos.solicitudes_personal (empresa_cliente_id);

-- ---------------------------------------------------------------------
-- Qué personal_mision cubrió qué solicitud (entrega real del trabajador)
-- ---------------------------------------------------------------------
create table if not exists servimos.solicitud_personal_asignacion (
  id bigint generated always as identity primary key,
  solicitud_id bigint not null references servimos.solicitudes_personal(id),
  personal_mision_id bigint not null references servimos.personal_mision(id),
  fecha_asignacion timestamptz not null default now()
);
create index if not exists solicitud_personal_asignacion_solicitud_idx
  on servimos.solicitud_personal_asignacion (solicitud_id);

-- ---------------------------------------------------------------------
-- Programación de turnos/horarios (la programa el cliente sobre personal
-- ya asignado). Cada fila dispara una fila básica en `nomina_generada`
-- (lo hace la server action, no un trigger, para mantener la lógica en
-- el código de la app).
-- ---------------------------------------------------------------------
create table if not exists servimos.programacion_turnos (
  id bigint generated always as identity primary key,
  personal_mision_id bigint not null references servimos.personal_mision(id),
  empresa_cliente_id bigint not null references servimos.empresas_cliente(id),
  fecha date not null,
  hora_inicio time not null,
  hora_fin time not null,
  puesto text,
  programado_por uuid references auth.users(id),
  estado text not null default 'programado', -- programado | cumplido | cancelado
  created_at timestamptz not null default now()
);
create index if not exists programacion_turnos_empresa_idx
  on servimos.programacion_turnos (empresa_cliente_id);
create index if not exists programacion_turnos_personal_idx
  on servimos.programacion_turnos (personal_mision_id);

-- ---------------------------------------------------------------------
-- Horas extra: el supervisor del cliente las asigna (ya es su
-- autorización inicial); quedan pendientes de aprobación del jefe de
-- área antes de impactar nómina.
-- ---------------------------------------------------------------------
create table if not exists servimos.horas_extra (
  id bigint generated always as identity primary key,
  personal_mision_id bigint not null references servimos.personal_mision(id),
  empresa_cliente_id bigint not null references servimos.empresas_cliente(id),
  fecha date not null,
  horas numeric(5,2) not null,
  motivo text,
  asignado_por uuid references auth.users(id), -- supervisor
  estado text not null default 'pendiente_jefe_area', -- pendiente_jefe_area | aprobada | rechazada
  aprobado_jefe_area_por uuid references auth.users(id),
  aprobado_jefe_area_fecha timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists horas_extra_empresa_idx
  on servimos.horas_extra (empresa_cliente_id);
create index if not exists horas_extra_personal_idx
  on servimos.horas_extra (personal_mision_id);

-- ---------------------------------------------------------------------
-- Novedades generales reportadas por el cliente (ausentismos, permisos,
-- etc.) sobre personal ya asignado. El catálogo de códigos vive en la
-- app (ver components/personnel-notices.tsx de LIP como referencia), no
-- se restringe aquí para no migrar el catálogo todavía.
-- ---------------------------------------------------------------------
create table if not exists servimos.novedades (
  id bigint generated always as identity primary key,
  personal_mision_id bigint not null references servimos.personal_mision(id),
  empresa_cliente_id bigint not null references servimos.empresas_cliente(id),
  codigo text not null,
  tipo_novedad text not null default 'Dias', -- Valor | Dias | Horas (alineado al archivo plano de NovaSoft, fase siguiente)
  cantidad_valor numeric(12,2),
  fecha_inicio date not null,
  fecha_fin date,
  observaciones text,
  origen text not null default 'cliente', -- cliente | incapacidad (autogenerada al aprobar una incapacidad)
  reportado_por uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists novedades_empresa_idx
  on servimos.novedades (empresa_cliente_id);
create index if not exists novedades_personal_idx
  on servimos.novedades (personal_mision_id);

-- ---------------------------------------------------------------------
-- Incapacidades subidas por el trabajador desde el portal-trabajador.
-- Aprobación MANUAL en esta fase (un usuario interno de Servimos
-- revisa); `revisado_por_ia` queda reservado para cuando se conecte
-- LIPbot (fase siguiente).
-- ---------------------------------------------------------------------
create table if not exists servimos.incapacidades (
  id bigint generated always as identity primary key,
  personal_mision_id bigint not null references servimos.personal_mision(id),
  tipo text, -- EG | AT
  fecha_inicio date not null,
  fecha_fin date not null,
  archivo_url text,
  estado text not null default 'pendiente_revision', -- pendiente_revision | aprobada | rechazada
  revisado_por uuid references auth.users(id),
  fecha_revision timestamptz,
  revisado_por_ia boolean not null default false, -- reservado para LIPbot (fase siguiente)
  observaciones text,
  novedad_id bigint references servimos.novedades(id), -- se llena al aprobar
  created_at timestamptz not null default now()
);
create index if not exists incapacidades_personal_idx
  on servimos.incapacidades (personal_mision_id);

-- ---------------------------------------------------------------------
-- Nómina generada — cálculo BÁSICO (horas × tarifa_hora) en esta fase.
-- El motor legal completo (recargos, HED/HEN/HEF, festivos) llega en la
-- fase siguiente y puede recalcular/reemplazar estas filas.
-- ---------------------------------------------------------------------
create table if not exists servimos.nomina_generada (
  id bigint generated always as identity primary key,
  personal_mision_id bigint not null references servimos.personal_mision(id),
  origen text not null, -- turno | hora_extra | incapacidad
  origen_id bigint, -- id de programacion_turnos / horas_extra / novedades según origen
  fecha date not null,
  concepto text not null,
  horas numeric(6,2),
  valor numeric(12,2),
  es_calculo_basico boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists nomina_generada_personal_idx
  on servimos.nomina_generada (personal_mision_id);

-- =====================================================================
-- RLS — solo en lo que el portal-cliente toca directo desde el
-- navegador con la anon key (autenticado vía Supabase Auth real). Las
-- acciones internas de Servimos y el portal-trabajador (login liviano
-- por identificación, sin sesión de Supabase Auth) usan
-- getSupabaseAdminServimos() (service role, bypassa RLS) — por eso
-- `permisos_usuarios`, `incapacidades` y `nomina_generada` se habilitan
-- con RLS pero SIN políticas: quedan cerradas a anon/authenticated y
-- solo accesibles vía service role.
-- =====================================================================

alter table servimos.usuarios_empresa_cliente enable row level security;
create policy "empresa ve su propia fila de acceso" on servimos.usuarios_empresa_cliente
  for select using (auth_user_id = auth.uid());

alter table servimos.empresas_cliente enable row level security;
create policy "empresa ve su propio registro" on servimos.empresas_cliente
  for select using (
    id in (select empresa_cliente_id from servimos.usuarios_empresa_cliente where auth_user_id = auth.uid())
  );

alter table servimos.personal_mision enable row level security;
create policy "empresa ve su propio personal" on servimos.personal_mision
  for select using (
    empresa_cliente_id in (select empresa_cliente_id from servimos.usuarios_empresa_cliente where auth_user_id = auth.uid())
  );

alter table servimos.solicitudes_personal enable row level security;
create policy "empresa ve sus solicitudes" on servimos.solicitudes_personal
  for select using (
    empresa_cliente_id in (select empresa_cliente_id from servimos.usuarios_empresa_cliente where auth_user_id = auth.uid())
  );
create policy "empresa crea sus solicitudes" on servimos.solicitudes_personal
  for insert with check (
    empresa_cliente_id in (select empresa_cliente_id from servimos.usuarios_empresa_cliente where auth_user_id = auth.uid())
  );

alter table servimos.solicitud_personal_asignacion enable row level security;
create policy "empresa ve las asignaciones de sus solicitudes" on servimos.solicitud_personal_asignacion
  for select using (
    solicitud_id in (
      select sp.id from servimos.solicitudes_personal sp
      where sp.empresa_cliente_id in (
        select empresa_cliente_id from servimos.usuarios_empresa_cliente where auth_user_id = auth.uid()
      )
    )
  );

alter table servimos.programacion_turnos enable row level security;
create policy "empresa ve su programacion" on servimos.programacion_turnos
  for select using (
    empresa_cliente_id in (select empresa_cliente_id from servimos.usuarios_empresa_cliente where auth_user_id = auth.uid())
  );
create policy "empresa programa turnos" on servimos.programacion_turnos
  for insert with check (
    empresa_cliente_id in (select empresa_cliente_id from servimos.usuarios_empresa_cliente where auth_user_id = auth.uid())
  );

alter table servimos.horas_extra enable row level security;
create policy "empresa ve sus horas extra" on servimos.horas_extra
  for select using (
    empresa_cliente_id in (select empresa_cliente_id from servimos.usuarios_empresa_cliente where auth_user_id = auth.uid())
  );
create policy "supervisor o jefe de area asignan horas extra" on servimos.horas_extra
  for insert with check (
    empresa_cliente_id in (
      select empresa_cliente_id from servimos.usuarios_empresa_cliente
      where auth_user_id = auth.uid() and rol in ('supervisor', 'jefe_area')
    )
  );
create policy "jefe de area aprueba o rechaza horas extra" on servimos.horas_extra
  for update using (
    empresa_cliente_id in (
      select empresa_cliente_id from servimos.usuarios_empresa_cliente
      where auth_user_id = auth.uid() and rol = 'jefe_area'
    )
  );

alter table servimos.novedades enable row level security;
create policy "empresa ve sus novedades" on servimos.novedades
  for select using (
    empresa_cliente_id in (select empresa_cliente_id from servimos.usuarios_empresa_cliente where auth_user_id = auth.uid())
  );
create policy "empresa reporta novedades" on servimos.novedades
  for insert with check (
    empresa_cliente_id in (select empresa_cliente_id from servimos.usuarios_empresa_cliente where auth_user_id = auth.uid())
  );

-- Cerradas por defecto a anon/authenticated (solo service_role):
alter table servimos.permisos_usuarios enable row level security;
alter table servimos.incapacidades enable row level security;
alter table servimos.nomina_generada enable row level security;
