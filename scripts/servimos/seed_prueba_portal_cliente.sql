-- ============================================================================
-- Datos de PRUEBA para verificar el flujo de Fase 1 (Personal en Misión):
-- 2 empresas cliente distintas, cada una con su propio usuario del
-- portal-cliente, para poder probar tanto el flujo feliz como el
-- aislamiento de RLS (que el Cliente A no vea nada del Cliente B).
--
--   Cliente A → cliente-a@servimos.app / cliente123
--   Cliente B → cliente-b@servimos.app / cliente123
--
-- También crea 2 `personal_mision` activos para poder "entregar" personal
-- al aprobar una solicitud desde el lado interno.
--
-- SOLO PARA PRUEBAS. Idempotente (usa email/nombre para no duplicar si lo
-- vuelves a correr). Requiere haber corrido antes 00_grants_servimos.sql y
-- 01_fundacion_servimos.sql.
-- ============================================================================

do $$
declare
  v_empresa_a_id bigint;
  v_empresa_b_id bigint;
  v_user_a_id    uuid;
  v_user_b_id    uuid;
begin
  -- ------------------------------------------------------------------
  -- Empresas cliente
  -- ------------------------------------------------------------------
  select id into v_empresa_a_id from servimos.empresas_cliente where nombre = 'Cliente Demo A';
  if v_empresa_a_id is null then
    insert into servimos.empresas_cliente (nombre, nit, ciudad)
    values ('Cliente Demo A', '900111111-1', 'Medellín')
    returning id into v_empresa_a_id;
  end if;

  select id into v_empresa_b_id from servimos.empresas_cliente where nombre = 'Cliente Demo B';
  if v_empresa_b_id is null then
    insert into servimos.empresas_cliente (nombre, nit, ciudad)
    values ('Cliente Demo B', '900222222-2', 'Bogotá')
    returning id into v_empresa_b_id;
  end if;

  -- ------------------------------------------------------------------
  -- Usuario portal-cliente A
  -- ------------------------------------------------------------------
  select id into v_user_a_id from auth.users where email = 'cliente-a@servimos.app';
  if v_user_a_id is null then
    v_user_a_id := gen_random_uuid();

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, confirmation_token, recovery_token,
      email_change, email_change_token_new,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) values (
      '00000000-0000-0000-0000-000000000000',
      v_user_a_id, 'authenticated', 'authenticated',
      'cliente-a@servimos.app',
      extensions.crypt('cliente123', extensions.gen_salt('bf')),
      now(), '', '', '', '',
      '{"provider":"email","providers":["email"]}', '{}', now(), now()
    );

    insert into auth.identities (
      id, user_id, provider_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), v_user_a_id, v_user_a_id::text,
      jsonb_build_object('sub', v_user_a_id::text, 'email', 'cliente-a@servimos.app'),
      'email', now(), now(), now()
    );
  end if;

  insert into servimos.usuarios_empresa_cliente (auth_user_id, empresa_cliente_id, nombre, rol)
  values (v_user_a_id, v_empresa_a_id, 'Contacto Cliente A', 'jefe_area')
  on conflict (auth_user_id) do update set empresa_cliente_id = excluded.empresa_cliente_id;

  -- ------------------------------------------------------------------
  -- Usuario portal-cliente B
  -- ------------------------------------------------------------------
  select id into v_user_b_id from auth.users where email = 'cliente-b@servimos.app';
  if v_user_b_id is null then
    v_user_b_id := gen_random_uuid();

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, confirmation_token, recovery_token,
      email_change, email_change_token_new,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) values (
      '00000000-0000-0000-0000-000000000000',
      v_user_b_id, 'authenticated', 'authenticated',
      'cliente-b@servimos.app',
      extensions.crypt('cliente123', extensions.gen_salt('bf')),
      now(), '', '', '', '',
      '{"provider":"email","providers":["email"]}', '{}', now(), now()
    );

    insert into auth.identities (
      id, user_id, provider_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), v_user_b_id, v_user_b_id::text,
      jsonb_build_object('sub', v_user_b_id::text, 'email', 'cliente-b@servimos.app'),
      'email', now(), now(), now()
    );
  end if;

  insert into servimos.usuarios_empresa_cliente (auth_user_id, empresa_cliente_id, nombre, rol)
  values (v_user_b_id, v_empresa_b_id, 'Contacto Cliente B', 'jefe_area')
  on conflict (auth_user_id) do update set empresa_cliente_id = excluded.empresa_cliente_id;

  -- ------------------------------------------------------------------
  -- Personal en misión disponible para "entregar" al aprobar solicitudes
  -- (servimos-actions.ts filtra solo por estado = 'Activo', no por
  -- empresa, así que sirven para cualquiera de las dos solicitudes).
  -- ------------------------------------------------------------------
  insert into servimos.personal_mision (identificacion, nombre, cargo, estado, tarifa_hora)
  values ('CC-TEST-001', 'Juan Pérez (prueba)', 'Auxiliar de bodega', 'Activo', 6500)
  on conflict (identificacion) do nothing;

  insert into servimos.personal_mision (identificacion, nombre, cargo, estado, tarifa_hora)
  values ('CC-TEST-002', 'María Gómez (prueba)', 'Operaria de producción', 'Activo', 6500)
  on conflict (identificacion) do nothing;

  raise notice 'Listo: Cliente A (empresa_id=%, user=%) / Cliente B (empresa_id=%, user=%)',
    v_empresa_a_id, v_user_a_id, v_empresa_b_id, v_user_b_id;
end $$;

-- Verificación rápida:
-- select ec.nombre as empresa, u.email, uec.rol
-- from servimos.usuarios_empresa_cliente uec
-- join servimos.empresas_cliente ec on ec.id = uec.empresa_cliente_id
-- join auth.users u on u.id = uec.auth_user_id
-- order by ec.nombre;
