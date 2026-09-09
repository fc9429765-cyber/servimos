-- =====================================================================
-- servimos · 06 Permiso nuevo para "Inicio Servimos" (Fase 2, 2026-08-05)
--
-- "Cuadro de Control Servimos" queda reemplazado por la nueva pantalla
-- Inicio en el mismo lugar del menú (ver plan de Fase 2, §3) — necesita
-- su propio permiso. Los booleans viejos (servimos_solicitudes,
-- servimos_horas_extra) NO se borran: quedan sin uso por ahora
-- (Solicitudes vuelve en una fase futura; Horas Extra no tiene sucesor
-- como pantalla propia), pero borrarlos no aporta nada y sí agrega riesgo.
-- =====================================================================

alter table servimos.permisos_usuarios
  add column if not exists servimos_inicio boolean not null default false;
