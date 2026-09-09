-- =====================================================================
-- servimos · 02 Baja de Fase 1 (2026-08-05)
--
-- Fase 1 (fundación: empresas_cliente, personal_mision, solicitudes con
-- SLA básico, nómina placeholder) queda reemplazada por el esquema de
-- nómina real de la Fase 2 (ver 03_nomina_schema.sql). Fase 1 no tiene
-- datos reales — solo filas de prueba sembradas el mismo día — así que
-- esta baja es segura.
--
-- Orden de borrado respeta las FK (hijas antes que padres).
-- `servimos.permisos_usuarios` NO se borra: sigue gobernando qué módulo
-- ve cada usuario interno en el sidebar (mecanismo independiente del
-- esquema de datos de nómina).
-- =====================================================================

drop table if exists servimos.nomina_generada;
drop table if exists servimos.incapacidades;
drop table if exists servimos.novedades;
drop table if exists servimos.horas_extra;
drop table if exists servimos.programacion_turnos;
drop table if exists servimos.solicitud_personal_asignacion;
drop table if exists servimos.solicitudes_personal;
drop table if exists servimos.usuarios_empresa_cliente;
drop table if exists servimos.personal_mision;
drop table if exists servimos.empresas_cliente;
