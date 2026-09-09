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
| 01 | `01_fundacion_servimos.sql` | Fase 1 — Personal en Misión (superada por la Fase 2, ver 02-07 abajo). Se conserva el archivo por historial; sus tablas se borran en el paso 02. | ⬜ |
| 02 | `02_drop_fase1_superseded.sql` | Fase 2 (2026-08-05): borra las tablas de Fase 1 (`empresas_cliente`, `personal_mision`, `usuarios_empresa_cliente`, `solicitudes_personal`, `solicitud_personal_asignacion`, `programacion_turnos`, `horas_extra`, `novedades`, `incapacidades`, `nomina_generada`). `permisos_usuarios` NO se borra. | ⬜ |
| 03 | `03_nomina_schema.sql` | Esquema de nómina real (25 tablas): `clientes`, `perfiles`, `trabajadores`, `contratos`, `equipos`, `turnos_definicion`, `puestos_demanda`, `programacion`, `marcaciones`, `tipos_novedad` (catálogo de 15 + seed), `novedades`, `aprobaciones_dia`, `firmas_quincena`, `liquidaciones`, `liquidacion_conceptos`, `prefacturas`, `prefactura_lineas`, `facturas`, `sla_areas`, `solicitudes`, `disciplinarios`, `planillas_pila`, `recobros`. Los parámetros legales (SMLMV, divisor 210, recargos, aportes) se leen de `public.parametros_legales_anio`/`parametros_parafiscales`/`parametros_prestaciones` — no se duplican aquí. | ⬜ |
| 04 | `04_nomina_rls.sql` | RLS completo (`servimos.es_servimos()`/`servimos.mi_cliente()` + políticas en las 25 tablas). | ⬜ |
| 05 | `05_storage_soportes_novedades.sql` | Bucket privado `servimos-soportes` + políticas de Storage para los soportes obligatorios de ciertas novedades. | ⬜ |
| 06 | `06_extend_permisos_usuarios.sql` | Agrega el permiso `servimos_inicio` a `permisos_usuarios` (nueva pantalla Inicio). | ⬜ |
| 07 | `07_seed_nomina_demo.sql` | Datos de prueba **ficticios**: 3 clientes de referencia (Genfar, Contact BPO, Planta Tocancipá — inventados, no son clientes reales de LIP), equipos, turnos, puestos, 15 trabajadores inventados, 1 admin + 3 supervisores de prueba. Solo para desarrollo. | ⬜ |

**Fase siguiente (no incluida todavía):** Personal activo, Solicitar
personal, Disciplinarios, Ausentismo, Mis solicitudes, Seguridad social
(PILA), Cierre quincenal, Mi facturación, Prefactura, Bandeja de
solicitudes, Vencimientos, Recobro, Asistencia en tablet (Marcaciones),
Cruce nómina↔factura, Facturación, Interfaz Novasoft, y el portal-trabajador
(congelado — sus tablas de Fase 1 desaparecieron y el esquema nuevo no
define un rol de trabajador todavía).

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
