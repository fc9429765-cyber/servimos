"use client"

// Panel del día — Inicio del portal cliente. Fiel al prototipo del
// paquete: hero con anillo de aprobación + 3 estadísticas, "Cobertura de
// hoy" por turno, bandeja de atención del día y solicitudes de personal en
// curso.

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, AlertTriangle, Send } from "lucide-react"
import { usePortalCliente } from "@/components/portal-cliente/portal-cliente-provider"
import * as progActions from "@/lib/portal-cliente-programacion-actions"
import * as novActions from "@/lib/portal-cliente-novedades-actions"
import { TurnoChip } from "@/components/servimos/ui/turno-chip"

function quincenaActual(): { ini: Date; fin: Date; label: string } {
  const hoy = new Date()
  const anio = hoy.getFullYear()
  const mes = hoy.getMonth()
  const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
  if (hoy.getDate() <= 15) {
    return { ini: new Date(anio, mes, 1), fin: new Date(anio, mes, 15), label: `1 – 15 de ${meses[mes]}` }
  }
  const ultimoDia = new Date(anio, mes + 1, 0).getDate()
  return { ini: new Date(anio, mes, 16), fin: new Date(anio, mes, ultimoDia), label: `16 – ${ultimoDia} de ${meses[mes]}` }
}

function iso(d: Date) {
  return d.toISOString().slice(0, 10)
}

export function InicioCliente() {
  const { contexto } = usePortalCliente()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [trabajadores, setTrabajadores] = useState<any[]>([])
  const [puestos, setPuestos] = useState<any[]>([])
  const [programacionQuincena, setProgramacionQuincena] = useState<any[]>([])
  const [programacionHoy, setProgramacionHoy] = useState<any[]>([])
  const [novedades, setNovedades] = useState<any[]>([])
  const [diasAprobados, setDiasAprobados] = useState(0)

  const { ini, fin, label } = useMemo(() => quincenaActual(), [])
  const fechaIni = iso(ini)
  const fechaFin = iso(fin)
  const hoy = iso(new Date())
  const diasQuincena = Math.round((fin.getTime() - ini.getTime()) / 86_400_000) + 1

  useEffect(() => {
    if (!contexto) return
    const clienteId = contexto.cliente_id
    setLoading(true)
    Promise.all([
      progActions.getTrabajadores(clienteId),
      progActions.getPuestosDemanda(clienteId),
      progActions.getProgramacion(clienteId, fechaIni, fechaFin),
      progActions.getProgramacion(clienteId, hoy, hoy),
      novActions.getNovedades(clienteId),
      progActions.getAprobacionesDiaCount(clienteId, fechaIni, fechaFin),
    ]).then(([trab, p, progQ, progHoy, nov, aprob]) => {
      setTrabajadores(trab)
      setPuestos(p)
      setProgramacionQuincena(progQ)
      setProgramacionHoy(progHoy)
      setNovedades(nov)
      setDiasAprobados(aprob)
      setLoading(false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contexto?.cliente_id])

  const novedadesPendientes = novedades.filter((n) => n.estado === "pendiente")
  const accidentes = novedadesPendientes.filter((n) => n.tipo === "IAT")

  const coberturaPorTurno = useMemo(() => {
    const requerido: Record<string, number> = {}
    for (const p of puestos) requerido[p.turno] = (requerido[p.turno] ?? 0) + p.requeridos
    const asignado: Record<string, number> = {}
    for (const row of programacionHoy) asignado[row.turno] = (asignado[row.turno] ?? 0) + 1
    const turnos = Array.from(new Set([...Object.keys(requerido), "T1", "T2", "T3"])).filter((t) => t !== "AD" && t !== "D")
    return turnos
      .filter((t) => requerido[t])
      .map((t) => ({ turno: t, requerido: requerido[t] ?? 0, asignado: asignado[t] ?? 0 }))
  }, [puestos, programacionHoy])

  const totalRequerido = coberturaPorTurno.reduce((s, c) => s + c.requerido, 0)
  const totalAsignado = coberturaPorTurno.reduce((s, c) => s + c.asignado, 0)

  const pctAprobado = diasQuincena > 0 ? Math.round((diasAprobados / diasQuincena) * 100) : 0
  const R = 34
  const CIRC = 2 * Math.PI * R

  if (!contexto || loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando…
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Hero */}
      <div
        className="rounded-2xl border border-white/10 p-5 text-[#eaf6f4]"
        style={{
          background:
            "radial-gradient(120% 100% at 100% 0%, rgba(33,212,200,.22), transparent 60%), linear-gradient(135deg,#0a2e2e,#0e3b3b)",
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <svg viewBox="0 0 84 84" className="h-[84px] w-[84px] flex-none">
              <circle cx="42" cy="42" r={R} fill="none" stroke="rgba(255,255,255,.14)" strokeWidth="9" />
              <circle
                cx="42"
                cy="42"
                r={R}
                fill="none"
                stroke="#21d4c8"
                strokeWidth="9"
                strokeLinecap="round"
                strokeDasharray={CIRC}
                strokeDashoffset={CIRC * (1 - pctAprobado / 100)}
                style={{ transform: "rotate(-90deg)", transformOrigin: "center" }}
              />
              <text x="42" y="39" textAnchor="middle" className="fill-white" style={{ font: "800 18px sans-serif" }}>
                {pctAprobado}%
              </text>
              <text x="42" y="53" textAnchor="middle" style={{ font: "700 8px sans-serif", fill: "#a8ccc8" }}>
                APROBADO
              </text>
            </svg>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wide text-[#a8ccc8]">Quincena en curso</div>
              <div className="text-2xl font-extrabold">{label}</div>
              {novedadesPendientes.length > 0 ? (
                <p className="mt-1 text-[13px] text-[#cfe9e6]">
                  {novedadesPendientes.length} novedad{novedadesPendientes.length !== 1 ? "es" : ""} pendiente{novedadesPendientes.length !== 1 ? "s" : ""} de revisión antes del cierre.
                </p>
              ) : (
                <p className="mt-1 text-[13px] text-[#cfe9e6]">Sin novedades pendientes.</p>
              )}
              <p className="mt-0.5 font-mono text-[11.5px] text-[#7fb0aa]">
                {diasAprobados} de {diasQuincena} días aprobados · corte {fechaFin.split("-").reverse().slice(0, 2).join(" ")}
              </p>
            </div>
          </div>
          <div className="flex gap-8">
            <div>
              <div className="text-[10.5px] font-bold uppercase tracking-wide text-[#a8ccc8]">Personal en misión</div>
              <div className="font-mono text-2xl font-extrabold">{trabajadores.length}</div>
            </div>
            <div>
              <div className="text-[10.5px] font-bold uppercase tracking-wide text-[#a8ccc8]">Turnos programados</div>
              <div className="font-mono text-2xl font-extrabold">{programacionQuincena.length}</div>
            </div>
            <div>
              <div className="text-[10.5px] font-bold uppercase tracking-wide text-[#a8ccc8]">Novedades abiertas</div>
              <div className="font-mono text-2xl font-extrabold" style={{ color: novedadesPendientes.length > 0 ? "#fd7e14" : "#eaf6f4" }}>
                {novedadesPendientes.length}
              </div>
            </div>
          </div>
        </div>
        <button
          onClick={() => router.push("/portal-cliente/novedades")}
          className="mt-4 rounded-lg px-3.5 py-2 text-[12.5px] font-bold"
          style={{ backgroundColor: "#21d4c8", color: "#0b3f4d" }}
        >
          Revisar novedades
        </button>
      </div>

      {/* Cobertura de hoy */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Operación en vivo</div>
            <h3 className="text-[15px] font-bold text-foreground">Cobertura de hoy</h3>
          </div>
          <span className="text-[11.5px] text-muted-foreground">Programado por ti · marcado en Programación</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {coberturaPorTurno.map((c) => {
            const faltan = Math.max(0, c.requerido - c.asignado)
            return (
              <div key={c.turno} className="rounded-xl border border-border p-3">
                <TurnoChip codigo={c.turno} size="sm" />
                <div className="mt-2 font-mono text-2xl font-extrabold text-foreground">
                  {c.asignado}
                  <span className="text-base font-semibold text-muted-foreground">/{c.requerido}</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${c.requerido > 0 ? Math.min(100, (c.asignado / c.requerido) * 100) : 100}%`, backgroundColor: faltan > 0 ? "#fd7e14" : "#12a06a" }}
                  />
                </div>
                <div className="mt-1 text-[11px]" style={{ color: faltan > 0 ? "#fd7e14" : "#12a06a" }}>
                  {faltan > 0 ? `${faltan} sin marcar` : "Completo"}
                </div>
              </div>
            )
          })}
          <div className="rounded-xl border border-border p-3">
            <span className="rounded-md px-2 py-1 text-[12px] font-bold" style={{ backgroundColor: "#0e3b3b", color: "#21d4c8" }}>
              Total
            </span>
            <div className="mt-2 font-mono text-2xl font-extrabold text-foreground">
              {totalAsignado}
              <span className="text-base font-semibold text-muted-foreground">/{totalRequerido}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full" style={{ width: `${totalRequerido > 0 ? Math.min(100, (totalAsignado / totalRequerido) * 100) : 100}%`, backgroundColor: "#12706b" }} />
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              {totalRequerido > 0 ? `${Math.round((totalAsignado / totalRequerido) * 100)}% cubierto` : "Sin demanda"}
            </div>
          </div>
        </div>
      </div>

      {/* Bandeja del día + Solicitar personal */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-3">
            <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Bandeja del día</div>
            <h3 className="text-[15px] font-bold text-foreground">Requiere tu atención</h3>
          </div>
          <div className="space-y-2.5">
            {accidentes.map((n) => (
              <div key={n.id} className="flex items-start justify-between gap-3 rounded-lg border border-border p-2.5">
                <div className="flex gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" style={{ color: "#dc3545" }} />
                  <div>
                    <div className="text-[12.5px] font-semibold text-foreground">Accidente de trabajo — {n.trabajadores?.nombre ?? "—"}</div>
                    <div className="text-[11.5px] text-muted-foreground">{n.fecha_desde} · SST de Servimos notificado.</div>
                  </div>
                </div>
                <button onClick={() => router.push("/portal-cliente/novedades")} className="whitespace-nowrap rounded-md border px-2 py-1 text-[11.5px] font-semibold" style={{ borderColor: "#e5eaf1" }}>
                  Ver caso
                </button>
              </div>
            ))}
            {novedadesPendientes.length > 0 && (
              <div className="flex items-start justify-between gap-3 rounded-lg border border-border p-2.5">
                <div className="flex gap-2">
                  <Send className="mt-0.5 h-4 w-4 flex-none" style={{ color: "#fd7e14" }} />
                  <div>
                    <div className="text-[12.5px] font-semibold text-foreground">
                      {novedadesPendientes.length} novedad{novedadesPendientes.length !== 1 ? "es" : ""} pendiente{novedadesPendientes.length !== 1 ? "s" : ""} de revisión
                    </div>
                    <div className="text-[11.5px] text-muted-foreground">Mientras estén pendientes, la quincena no se puede cerrar.</div>
                  </div>
                </div>
                <button onClick={() => router.push("/portal-cliente/novedades")} className="whitespace-nowrap rounded-md px-2 py-1 text-[11.5px] font-semibold" style={{ backgroundColor: "#d1e7dd", color: "#0f5132" }}>
                  Revisar
                </button>
              </div>
            )}
            {accidentes.length === 0 && novedadesPendientes.length === 0 && (
              <p className="py-6 text-center text-[12.5px] text-muted-foreground">No hay pendientes por ahora.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Personal</div>
              <h3 className="text-[15px] font-bold text-foreground">Solicitar personal</h3>
            </div>
            <button
              onClick={() => router.push("/portal-cliente/solicitar-personal")}
              className="rounded-lg px-3 py-1.5 text-[12.5px] font-bold text-white"
              style={{ backgroundColor: "#5bc0de" }}
            >
              Nueva requisición
            </button>
          </div>
          <p className="py-4 text-center text-[12.5px] text-muted-foreground">
            El módulo de requisiciones con seguimiento de terna/exámenes/contratación llega en una fase siguiente.
          </p>
        </div>
      </div>
    </div>
  )
}
