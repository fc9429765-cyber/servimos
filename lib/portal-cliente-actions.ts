"use server"

// Server actions del portal-cliente (empresas que le piden personal a
// Servimos). Usa createServimosServerClient() — el cliente SSR atado a la
// cookie de sesión de Supabase Auth del usuario logueado — para que la RLS
// de scripts/servimos/04_nomina_rls.sql sea la que realmente decide qué
// puede ver/escribir cada cliente.
//
// Fase 2 (2026-08-05): la identidad del portal-cliente vive en
// servimos.perfiles + servimos.clientes (antes usuarios_empresa_cliente +
// empresas_cliente, esquema de Fase 1 — ya no existe). Las acciones de
// dominio (Programación, Novedades) viven en archivos propios:
// lib/portal-cliente-programacion-actions.ts y
// lib/portal-cliente-novedades-actions.ts.

import { createServimosServerClient } from "@/lib/supabase-server"

export async function getEmpresaClienteActual() {
  const supabase = createServimosServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from("perfiles")
    .select("cliente_id, rol, nombre, clientes(nombre)")
    .eq("id", user.id)
    .single()

  if (error || !data) return null
  return data
}
