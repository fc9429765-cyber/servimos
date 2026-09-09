-- =====================================================================
-- servimos · 05 Storage — soportes de novedades (Fase 2, 2026-08-05)
--
-- Bucket privado para los soportes obligatorios de ciertas novedades
-- (incapacidades, licencias, suspensiones — ver `requiere_soporte` en
-- servimos.tipos_novedad). No reusa el bucket/tabla de soportes de LIP:
-- ese está atado a `idempresa` numérico, este modelo es uuid + RLS por
-- `cliente_id`.
--
-- Convención de ruta: {cliente_id}/{trabajador_id}/{novedad_id}-{archivo}
-- así storage.foldername(name)[1] = cliente_id y RLS puede validarlo
-- contra servimos.mi_cliente() sin tocar la tabla novedades.
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('servimos-soportes', 'servimos-soportes', false)
on conflict (id) do nothing;

create policy "servimos ve soportes de su cliente"
  on storage.objects for select
  using (
    bucket_id = 'servimos-soportes'
    and (servimos.es_servimos()
      or (storage.foldername(name))[1] = servimos.mi_cliente()::text)
  );

create policy "cliente sube soportes propios"
  on storage.objects for insert
  with check (
    bucket_id = 'servimos-soportes'
    and (storage.foldername(name))[1] = servimos.mi_cliente()::text
  );

create policy "servimos administra soportes"
  on storage.objects for all
  using (bucket_id = 'servimos-soportes' and servimos.es_servimos())
  with check (bucket_id = 'servimos-soportes' and servimos.es_servimos());
