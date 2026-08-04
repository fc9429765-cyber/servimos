# servimos · Scripts para ejecutar en Supabase (SQL Editor)

Desde 2026-08-04, todo objeto SQL **nuevo** (tablas, funciones, vistas) se crea
en el esquema **`servimos`**, no en `public`. Lo que ya existe en `public`
(asistencia, nómina, inventario, facturación, SIG, etc.) **no se toca ni se
migra** — sigue funcionando igual.

## Cómo correrlos
Igual que en `scripts/sig/`: entra a **Supabase → SQL Editor**, pega y ejecuta
en orden numérico.

## Orden de ejecución

| # | Archivo | Qué hace | ¿Ejecutado? |
|---|---------|----------|-------------|
| 00 | `00_grants_servimos.sql` | Crea el esquema si falta y otorga los privilegios que Supabase no da por defecto a un esquema no-`public` (usage + CRUD en tablas/funciones/secuencias, para `anon`/`authenticated`/`service_role`, incluyendo objetos futuros vía `alter default privileges`). Correr **una sola vez**, antes que cualquier otro script de esta carpeta. | ⬜ |
| 01 | `01_fundacion_servimos.sql` | Fase 1 — Personal en Misión: `empresas_cliente`, `personal_mision`, `usuarios_empresa_cliente` (login del portal-cliente), `permisos_usuarios` (staff interno), `solicitudes_personal` (con SLA), `solicitud_personal_asignacion`, `programacion_turnos`, `horas_extra` (aprobación supervisor → jefe de área), `novedades`, `incapacidades` (portal-trabajador, aprobación manual por ahora) y `nomina_generada` (cálculo básico horas×tarifa). Incluye las políticas RLS del portal-cliente. | ⬜ |

**Fase siguiente (no incluida todavía, ver memoria `project_servimos_product_vision`):** motor de nómina "con todo lo de ley" (recargos, HED/HEN/HEF, festivos — reemplaza el cálculo básico de `nomina_generada`), revisión de incapacidades con LIPbot (`incapacidades.revisado_por_ia`), informe de compliance y compartir documentación/carpeta del trabajador con el cliente.

## Convención para escribir un script nuevo aquí
```sql
create table if not exists servimos.mi_tabla_nueva (
  id uuid primary key default gen_random_uuid(),
  ...
);
```
Cualquier función también va calificada: `create or replace function servimos.mi_funcion() ...`.

## Cómo consultarlo desde el código
No uses `.from("tabla")` a secas (eso apunta a `public`). Usa el cliente
`servimos` correspondiente:

```ts
// Cliente (browser) — lib/supabase-client.ts
import { supabaseServimos } from "@/lib/supabase-client"
await supabaseServimos.from("mi_tabla_nueva").select("*")

// Server action — lib/supabase-server.ts
import { createServimosServerClient } from "@/lib/supabase-server"
const supabase = createServimosServerClient()

// Admin / service role — lib/supabase-admin.ts
import { getSupabaseAdminServimos } from "@/lib/supabase-admin"
const admin = await getSupabaseAdminServimos()
```

Los clientes originales (`supabase`, `createServerClient`, `getSupabaseAdmin`)
siguen apuntando a `public` sin cambios — se usan igual que siempre para todo
lo existente.
