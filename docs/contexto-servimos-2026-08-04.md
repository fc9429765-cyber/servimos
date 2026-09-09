# Contexto Servimos — sesión 2026-08-04

> Resumen de esta conversación con Claude Code, para que una sesión futura
> (o el propio usuario) retome sin tener que re-investigar todo desde cero.

## Estado del proyecto

- **Fase 1 (Personal en Misión) está construida y commiteada**: commit
  `9b514c0` — "feat(servimos): Fase 1 — Personal en Misión (esquema servimos
  + portales)". Detalle completo de qué incluye en
  `C:\Users\LENOVO\.claude\plans\shimmying-wishing-dahl.md`.
- **Repo**: sigue siendo `origin` = `https://github.com/gerenciageneral-spec/LIPGO.git`
  (el repo separado `SERVIMOS` recomendado en el plan no se ha creado). Rama
  `main`, **2 commits locales sin subir** a `origin`: `68c5142` (chore: limpieza
  de office) y `9b514c0` (Fase 1 Servimos). No se han pusheado en esta sesión —
  pendiente de decisión del usuario.
- **SQL de Fase 1 (`scripts/servimos/00_grants_servimos.sql` y
  `01_fundacion_servimos.sql`) NO se han ejecutado todavía** en el SQL Editor
  de Supabase (verificado, sigue como workflow manual). Sin esto, las tablas
  `servimos.*` no existen en la base de datos real.
- Visión completa del producto (fases futuras: motor de nómina legal, revisión
  de incapacidades con LIPbot, etc.) documentada en memoria
  `project_servimos_product_vision` — no repetida aquí.

## Qué falta por hacer (checklist de verificación de Fase 1)

Del plan original, sin marcar como hecho todavía:

1. Correr `00_grants_servimos.sql` y luego `01_fundacion_servimos.sql` en
   Supabase → SQL Editor.
2. Insertar fila de prueba en `servimos.empresas_cliente`, un usuario en
   `servimos.usuarios_empresa_cliente`, y un permiso en
   `servimos.permisos_usuarios`.
3. `npm run dev` → entrar como usuario interno → confirmar que el grupo
   "Personal en Misión" aparece en el sidebar con sus módulos.
4. Entrar a `/portal-cliente/login` → crear una solicitud de personal →
   confirmar que aparece del lado interno.
5. Aprobar/asignar personal desde el lado interno.
6. Reportar una novedad desde el portal cliente → confirmar que aparece
   internamente.
7. Confirmar que la RLS aísla correctamente a una empresa cliente de otra.

## Incidente de esta sesión: "no puedo ver la app en localhost"

**Causa raíz encontrada**: Next.js 16.2.0 con **Turbopack** (modo por defecto
de `next dev`) + Tailwind v4 (`@tailwindcss/postcss`) generaba un proceso
`node.exe` (`postcss.js`) **nuevo por cada módulo CSS, sin reciclarlo nunca**.
En minutos se acumularon **más de 1300 procesos node.exe zombis**, saturando
la memoria del equipo (llegó a tumbar PowerShell con error de "archivo de
paginación demasiado pequeño").

**Fix aplicado**: `package.json` → script `dev` cambiado de `next dev` a
`next dev --webpack` (bypassa Turbopack, usa el bundler webpack clásico que
no tiene ese leak). Confirmado con `Get-Process node` estable en 2 procesos
tras el cambio.

**Efecto secundario a tener en cuenta**: con webpack, la primera compilación
de cada ruta es lenta (`GET /` tardó 5.5s la primera vez, `GET
/manifest.webmanifest` tardó 10.1s) porque el proyecto vive dentro de una
carpeta sincronizada con **OneDrive**
(`C:\Users\LENOVO\OneDrive\Documents\LIPGO\Servimos`), que ralentiza mucho la
lectura de archivos de `node_modules` (filtro de OneDrive interceptando cada
read). Las cargas siguientes ya quedan en caché y son rápidas (400-600ms).
Esto **no es un error**, solo hay que esperar la primera carga de cada ruta
nueva. Si esto molesta a futuro, la solución de fondo sería excluir
`node_modules`/`.next` de la sincronización de OneDrive o mover el proyecto
fuera de la carpeta de OneDrive — no se hizo en esta sesión, queda como
mejora pendiente.

**Diagnóstico útil para la próxima vez que "no cargue localhost"**:
```powershell
(Get-Process node -ErrorAction SilentlyContinue).Count   # si son cientos+, hay un leak
Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Select ProcessId, ParentProcessId, CommandLine            # para ver quién los genera
Invoke-WebRequest http://localhost:3000/ -UseBasicParsing   # probar desde PowerShell,
                                                              # NO desde curl de Git Bash
                                                              # (su curl se cuelga contra
                                                              # localhost en este entorno,
                                                              # sin causa de proxy — no usar
                                                              # curl para diagnosticar esto)
```

## Siguiente paso sugerido

Retomar el checklist de verificación de Fase 1 (arriba) — empezando por correr
los dos scripts SQL en Supabase, que requiere acción manual del usuario en el
dashboard (no ejecutable por Claude sin acceso).
