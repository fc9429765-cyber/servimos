"use client"

// Sesión REAL de Supabase Auth (a diferencia de components/portal/portal-provider.tsx,
// que simula sesión de empleado por documento en localStorage). Se necesita
// sesión real porque una empresa cliente puede tener varios usuarios
// (solicitante/supervisor/jefe_area) con permisos distintos, protegidos por
// las políticas RLS de scripts/servimos/01_fundacion_servimos.sql.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { supabase } from "@/lib/supabase-client"
import { getEmpresaClienteActual } from "@/lib/portal-cliente-actions"

interface ContextoEmpresaCliente {
  empresa_cliente_id: number
  rol: string
  nombre: string | null
  empresas_cliente: { nombre: string; sla_horas_objetivo: number } | null
}

interface PortalClienteContextValue {
  loading: boolean
  userId: string | null
  contexto: ContextoEmpresaCliente | null
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const PortalClienteContext = createContext<PortalClienteContextValue | undefined>(undefined)

export function PortalClienteProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [contexto, setContexto] = useState<ContextoEmpresaCliente | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user) {
      setUserId(null)
      setContexto(null)
      setLoading(false)
      return
    }

    setUserId(session.user.id)
    const ctx = await getEmpresaClienteActual()
    setContexto(ctx as any)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      load()
    })
    return () => subscription.unsubscribe()
  }, [load])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    setUserId(null)
    setContexto(null)
  }, [])

  const value = useMemo(
    () => ({ loading, userId, contexto, logout, refresh: load }),
    [loading, userId, contexto, logout, load],
  )

  return <PortalClienteContext.Provider value={value}>{children}</PortalClienteContext.Provider>
}

export function usePortalCliente() {
  const ctx = useContext(PortalClienteContext)
  if (!ctx) {
    throw new Error("usePortalCliente debe usarse dentro de <PortalClienteProvider>")
  }
  return ctx
}
