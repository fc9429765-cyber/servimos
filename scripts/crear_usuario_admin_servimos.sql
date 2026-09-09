-- ============================================================================
-- Crea un usuario de prueba con acceso a TODOS los módulos internos.
--
--   Email:      admin@servimos.app
--   Contraseña: admin123
--
-- SOLO PARA AMBIENTE DE PRUEBAS/DESARROLLO — la contraseña queda en texto
-- plano en este archivo. No usar este patrón en producción.
--
-- Cómo correrlo: Supabase → SQL Editor → pegar y ejecutar completo.
-- Es idempotente: si ya existe el usuario, no lo duplica (pero sí refresca
-- sus permisos a "todo true" cada vez que lo vuelvas a correr).
-- ============================================================================

do $$
declare
  v_user_id    uuid;
  v_empresa_id int;
  v_col        text;
begin
  -- 1) Usuario en Supabase Auth (auth.users + auth.identities).
  select id into v_user_id from auth.users where email = 'admin@servimos.app';

  if v_user_id is null then
    v_user_id := gen_random_uuid();

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, confirmation_token, recovery_token,
      email_change, email_change_token_new,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at
    ) values (
      '00000000-0000-0000-0000-000000000000',
      v_user_id, 'authenticated', 'authenticated',
      'admin@servimos.app',
      extensions.crypt('admin123', extensions.gen_salt('bf')),
      now(), '', '', '', '',
      '{"provider":"email","providers":["email"]}',
      '{}',
      now(), now()
    );

    insert into auth.identities (
      id, user_id, provider_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), v_user_id, v_user_id::text,
      jsonb_build_object('sub', v_user_id::text, 'email', 'admin@servimos.app'),
      'email', now(), now(), now()
    );

    raise notice 'Usuario auth creado: %', v_user_id;
  else
    raise notice 'Usuario auth ya existía: %', v_user_id;
  end if;

  -- 2) Empresa: reutiliza la primera que exista; si no hay ninguna, crea
  --    "Servimos". Cambia este bloque si quieres forzar una empresa puntual.
  select id into v_empresa_id from empresas order by id limit 1;
  if v_empresa_id is null then
    insert into empresas (nombre) values ('Servimos') returning id into v_empresa_id;
  end if;

  -- 3) Perfil interno (profiles) vinculado al usuario + empresa.
  insert into profiles (id, usuario, empresa_id)
  values (v_user_id, 'admin@servimos.app', v_empresa_id)
  on conflict (id) do update set empresa_id = excluded.empresa_id;

  -- 4) Permisos LIP: fila en public.permisos_usuarios con TODAS las columnas
  --    booleanas (un módulo = una columna) puestas en true, sin importar
  --    cuántas haya hoy en la tabla. Filtramos por table_schema porque
  --    también existe servimos.permisos_usuarios (Fase 1 Servimos) con el
  --    mismo nombre de tabla pero columnas distintas.
  insert into public.permisos_usuarios (usuario_id) values (v_user_id)
  on conflict (usuario_id) do nothing;

  for v_col in
    select column_name from information_schema.columns
    where table_schema = 'public' and table_name = 'permisos_usuarios' and data_type = 'boolean'
  loop
    execute format('update public.permisos_usuarios set %I = true where usuario_id = $1', v_col)
      using v_user_id;
  end loop;

  -- 5) Permisos Servimos: mismo patrón sobre servimos.permisos_usuarios
  --    (grupo "Personal en Misión"), si ya corriste el SQL de Fase 1.
  if to_regclass('servimos.permisos_usuarios') is not null then
    insert into servimos.permisos_usuarios (usuario_id) values (v_user_id)
    on conflict (usuario_id) do nothing;

    for v_col in
      select column_name from information_schema.columns
      where table_schema = 'servimos' and table_name = 'permisos_usuarios' and data_type = 'boolean'
    loop
      execute format('update servimos.permisos_usuarios set %I = true where usuario_id = $1', v_col)
        using v_user_id;
    end loop;
  end if;

  raise notice 'Listo: admin@servimos.app con empresa_id=% y todos los permisos (LIP + Servimos) en true', v_empresa_id;
end $$;

-- Verificación rápida:
-- select u.email, p.usuario, p.empresa_id, e.nombre as empresa
-- from auth.users u
-- join profiles p on p.id = u.id
-- join empresas e on e.id = p.empresa_id
-- where u.email = 'admin@servimos.app';
