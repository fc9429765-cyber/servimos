-- =====================================================================
-- servimos · 07 Datos de prueba — Fase 2 (2026-08-05)
--
-- SOLO PARA DESARROLLO. Todo es ficticio: los 3 "clientes" están tomados
-- como referencia del prototipo del paquete de especificación (Genfar,
-- Contact BPO, Planta Tocancipá), con NIT y datos inventados — NO
-- corresponden a clientes reales de LIP. Los trabajadores (nombres,
-- cédulas, salarios) también son inventados, no se reutiliza ningún dato
-- real de headcount de LIP.
--
-- Requiere haber corrido 01 (grants) → 06 (extend permisos) antes.
-- Idempotente donde es razonable (on conflict do nothing / update).
-- =====================================================================

do $$
declare
  v_admin_id     uuid;
  v_cliente_id   uuid;
  v_user_id      uuid;
  v_equipo_a     uuid;
  v_equipo_b     uuid;
  v_cliente jsonb;
  v_trabajador jsonb;
  v_idx int;
  -- Los 3 clientes ficticios de referencia (del prototipo del paquete).
  clientes jsonb := '[
    {"nombre":"Genfar (demo)", "nit":"900555111-2", "sector":"Farmacéutico",
     "tarifa_arl":0.00522, "centro_costo":"CC-GEN-01", "aiu_pct":9.5,
     "email":"supervisor-genfar@servimos.app",
     "trabajadores":[
       {"cedula":"1000000001","nombre":"Laura Ximena Rojas","cargo":"Operaria de empaque","salario":1750905},
       {"cedula":"1000000002","nombre":"Andrés Felipe Muñoz","cargo":"Auxiliar de bodega","salario":1750905},
       {"cedula":"1000000003","nombre":"Diana Carolina Peña","cargo":"Operaria de línea","salario":1780000},
       {"cedula":"1000000004","nombre":"Jhon Alexander Torres","cargo":"Montacarguista","salario":1950000},
       {"cedula":"1000000005","nombre":"Yesenia Marcela Ruiz","cargo":"Operaria de empaque","salario":1750905}
     ]},
    {"nombre":"Contact BPO (demo)", "nit":"900555222-3", "sector":"Call Center / BPO",
     "tarifa_arl":0.00522, "centro_costo":"CC-CBP-01", "aiu_pct":9.5,
     "email":"supervisor-contactbpo@servimos.app",
     "trabajadores":[
       {"cedula":"1000000006","nombre":"Camila Andrea Salazar","cargo":"Agente de servicio al cliente","salario":1750905},
       {"cedula":"1000000007","nombre":"Sebastián David López","cargo":"Agente de ventas","salario":1850000},
       {"cedula":"1000000008","nombre":"Paula Andrea Gómez","cargo":"Agente de servicio al cliente","salario":1750905},
       {"cedula":"1000000009","nombre":"Julián Esteban Castro","cargo":"Supervisor de campaña","salario":2400000},
       {"cedula":"1000000010","nombre":"Natalia Andrea Herrera","cargo":"Agente de retención","salario":1780000}
     ]},
    {"nombre":"Planta Tocancipá (demo)", "nit":"900555333-4", "sector":"Manufactura",
     "tarifa_arl":0.02436, "centro_costo":"CC-PTO-01", "aiu_pct":10.0,
     "email":"supervisor-tocancipa@servimos.app",
     "trabajadores":[
       {"cedula":"1000000011","nombre":"Wilson Alberto Beltrán","cargo":"Operario de máquina","salario":1900000},
       {"cedula":"1000000012","nombre":"Sandra Milena Cárdenas","cargo":"Operaria de calidad","salario":1850000},
       {"cedula":"1000000013","nombre":"Édgar Iván Vargas","cargo":"Operario de máquina","salario":1900000},
       {"cedula":"1000000014","nombre":"Luisa Fernanda Amaya","cargo":"Auxiliar de producción","salario":1750905},
       {"cedula":"1000000015","nombre":"Carlos Mario Sánchez","cargo":"Montacarguista","salario":1950000}
     ]}
  ]';
begin
  -- ------------------------------------------------------------------
  -- 1) Admin interno de Servimos (reusa admin@servimos.app si ya existe
  --    del seed de Fase 1; si no, lo crea).
  -- ------------------------------------------------------------------
  select id into v_admin_id from auth.users where email = 'admin@servimos.app';
  if v_admin_id is null then
    v_admin_id := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, confirmation_token, recovery_token,
      email_change, email_change_token_new,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) values (
      '00000000-0000-0000-0000-000000000000', v_admin_id, 'authenticated', 'authenticated',
      'admin@servimos.app', extensions.crypt('admin123', extensions.gen_salt('bf')),
      now(), '', '', '', '',
      '{"provider":"email","providers":["email"]}', '{}', now(), now()
    );
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), v_admin_id, v_admin_id::text,
      jsonb_build_object('sub', v_admin_id::text, 'email', 'admin@servimos.app'),
      'email', now(), now(), now());
  end if;

  insert into servimos.perfiles (id, nombre, rol, cliente_id, cargo)
  values (v_admin_id, 'Admin Servimos (prueba)', 'admin', null, 'Administrador')
  on conflict (id) do update set rol = excluded.rol, cliente_id = excluded.cliente_id;

  -- Refresca el permiso nuevo de Inicio (el resto de permisos ya los
  -- otorgó scripts/crear_usuario_admin_servimos.sql).
  update servimos.permisos_usuarios set servimos_inicio = true where usuario_id = v_admin_id;
  insert into servimos.permisos_usuarios (usuario_id, servimos_inicio, servimos_programacion, servimos_novedades)
  select v_admin_id, true, true, true
  where not exists (select 1 from servimos.permisos_usuarios where usuario_id = v_admin_id);

  -- ------------------------------------------------------------------
  -- 2) Clientes ficticios + equipos + turnos + puestos + trabajadores + supervisor
  -- ------------------------------------------------------------------
  for v_cliente in select * from jsonb_array_elements(clientes)
  loop
    select id into v_cliente_id from servimos.clientes where nit = (v_cliente->>'nit');
    if v_cliente_id is null then
      insert into servimos.clientes (nombre, nit, sector, tarifa_arl, centro_costo, aiu_modo, aiu_pct)
      values (
        v_cliente->>'nombre', v_cliente->>'nit', v_cliente->>'sector',
        (v_cliente->>'tarifa_arl')::numeric, v_cliente->>'centro_costo',
        'pct', (v_cliente->>'aiu_pct')::numeric
      )
      returning id into v_cliente_id;
    end if;

    -- Equipos A y B.
    insert into servimos.equipos (cliente_id, letra, nombre, area, patron)
    values (v_cliente_id, 'A', 'Equipo A', 'Operación', '5x2')
    on conflict (cliente_id, letra) do nothing
    returning id into v_equipo_a;
    if v_equipo_a is null then
      select id into v_equipo_a from servimos.equipos where cliente_id = v_cliente_id and letra = 'A';
    end if;

    insert into servimos.equipos (cliente_id, letra, nombre, area, patron)
    values (v_cliente_id, 'B', 'Equipo B', 'Operación', '4x3 comprimido')
    on conflict (cliente_id, letra) do nothing
    returning id into v_equipo_b;
    if v_equipo_b is null then
      select id into v_equipo_b from servimos.equipos where cliente_id = v_cliente_id and letra = 'B';
    end if;

    -- Turnos T1/T2/T3/AD.
    insert into servimos.turnos_definicion (cliente_id, codigo, nombre, hora_inicio, hora_fin, descanso_min, color)
    values
      (v_cliente_id, 'T1', 'Turno 1 · Mañana', '06:00', '14:00', 60, '#5bc0de'),
      (v_cliente_id, 'T2', 'Turno 2 · Tarde',   '14:00', '22:00', 60, '#12706b'),
      (v_cliente_id, 'T3', 'Turno 3 · Noche',   '22:00', '06:00', 60, '#0e3b3b'),
      (v_cliente_id, 'AD', 'Administrativo',    '08:00', '17:00', 60, '#a8dbe8')
    on conflict (cliente_id, codigo) do nothing;

    -- Demanda de personal por puesto x turno.
    insert into servimos.puestos_demanda (cliente_id, puesto, area, turno, requeridos, factor_dom, factor_fest)
    values
      (v_cliente_id, 'Operación línea 1', 'Operación', 'T1', 3, 0.55, 0.70),
      (v_cliente_id, 'Operación línea 1', 'Operación', 'T2', 2, 0.55, 0.70),
      (v_cliente_id, 'Soporte administrativo', 'Administración', 'AD', 1, 0.55, 0.70);

    -- Trabajadores (alternando equipo A/B).
    v_idx := 0;
    for v_trabajador in select * from jsonb_array_elements(v_cliente->'trabajadores')
    loop
      insert into servimos.trabajadores (cedula, nombre, cargo, salario, eps, afp, cliente_id, equipo_id, centro_costo, activo)
      values (
        v_trabajador->>'cedula', v_trabajador->>'nombre', v_trabajador->>'cargo',
        (v_trabajador->>'salario')::numeric,
        case when v_idx % 2 = 0 then 'Sura EPS' else 'Nueva EPS' end,
        case when v_idx % 2 = 0 then 'Porvenir' else 'Colfondos' end,
        v_cliente_id,
        case when v_idx % 2 = 0 then v_equipo_a else v_equipo_b end,
        v_cliente->>'centro_costo', true
      )
      on conflict (cedula) do nothing;
      v_idx := v_idx + 1;
    end loop;

    -- Usuario supervisor del portal-cliente para este cliente.
    select id into v_user_id from auth.users where email = v_cliente->>'email';
    if v_user_id is null then
      v_user_id := gen_random_uuid();
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, confirmation_token, recovery_token,
        email_change, email_change_token_new,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at
      ) values (
        '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated',
        v_cliente->>'email', extensions.crypt('cliente123', extensions.gen_salt('bf')),
        now(), '', '', '', '',
        '{"provider":"email","providers":["email"]}', '{}', now(), now()
      );
      insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
      values (gen_random_uuid(), v_user_id, v_user_id::text,
        jsonb_build_object('sub', v_user_id::text, 'email', v_cliente->>'email'),
        'email', now(), now(), now());
    end if;

    insert into servimos.perfiles (id, nombre, rol, cliente_id, cargo)
    values (v_user_id, 'Supervisor ' || (v_cliente->>'nombre'), 'supervisor', v_cliente_id, 'Supervisor de turno')
    on conflict (id) do update set rol = excluded.rol, cliente_id = excluded.cliente_id;
  end loop;

  raise notice 'Listo: 3 clientes ficticios, 15 trabajadores, 1 admin + 3 supervisores de prueba.';
end $$;

-- Verificación rápida:
-- select c.nombre as cliente, count(t.id) as trabajadores
-- from servimos.clientes c left join servimos.trabajadores t on t.cliente_id = c.id
-- group by c.nombre;
