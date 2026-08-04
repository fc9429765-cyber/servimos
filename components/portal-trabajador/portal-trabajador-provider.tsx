"use client"

// Sesión liviana por identificación (mismo patrón que
// components/portal/portal-provider.tsx de LIP: login = mismo documento
// como usuario y contraseña), guardada en localStorage. Sin Supabase Auth
// real — por eso lib/portal-trabajador-actions.ts usa el service role en
// vez de un cliente atado a cookie de sesión.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import type { PortalTrabajadorLoginResult } from "@/lib/portal-trabajador-actions"

const STORAGE_KEY = "servimos_portal_trabajador"

type Trabajador = NonNullable<PortalTrabajadorLoginResult["trabajador"]>

interface PortalTrabajadorContextValue {
  trabajador: Trabajador | null
  isHydrated: boolean
  login: (t: Trabajador) => void
  logout: () => void
}

const PortalTrabajadorContext = createContext<PortalTrabajadorContextValue | undefined>(undefined)

export function PortalTrabajadorProvider({ children }: { children: ReactNode }) {
  const [trabajador, setTrabajador] = useState<Trabajador | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null
      if (raw) setTrabajador(JSON.parse(raw) as Trabajador)
    } catch {
      // Ignorar errores de parseo o acceso a localStorage.
    } finally {
      setIsHydrated(true)
    }
  }, [])

  const login = useCallback((t: Trabajador) => {
    setTrabajador(t)
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(t))
    } catch {
      // Ignorar quota o modo privado.
    }
  }, [])

  const logout = useCallback(() => {
    setTrabajador(null)
    try {
      window.localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Ignorar.
    }
  }, [])

  const value = useMemo(() => ({ trabajador, isHydrated, login, logout }), [trabajador, isHydrated, login, logout])

  return <PortalTrabajadorContext.Provider value={value}>{children}</PortalTrabajadorContext.Provider>
}

export function usePortalTrabajador() {
  const ctx = useContext(PortalTrabajadorContext)
  if (!ctx) {
    throw new Error("usePortalTrabajador debe usarse dentro de <PortalTrabajadorProvider>")
  }
  return ctx
}
