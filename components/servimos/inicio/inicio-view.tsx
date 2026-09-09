"use client"

// Inicio — banda de la quincena, cobertura de hoy por turno y pendientes.
// Reusa las mismas acciones de Programación/Novedades (ya construidas) en
// vez de abrir un tercer archivo de acciones — Inicio es puro agregado de
// datos que esas dos pantallas ya exponen.

import { useEffect, useMemo, useState } from "react"
import { Loader2 } from "lucide-react"
import { SpotlightCard } from "@/components/servimos/ui/spotlight-card"
import { KpiCard } from "@/components/servimos/ui/kpi-card"
import { ProgressBar } from "@/components/servimos/ui/progress-bar"
import { TurnoChip } from "@/components/servimos/ui/turno-chip"
import type { ProgramacionActions } from "@/components/servimos/programacion/programacion-view"
import type { NovedadesActions } from "@/components/servimos/novedades/novedades-view"

interface InicioViewProps {
  clienteId: string
  clienteNombre?: string
  programacionActions: ProgramacionActions
  novedadesActions: NovedadesActions
  onIrAProgramacion?: () => void
}

function hoyIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function quincenaLabel(): { texto: string; diasTranscurridos: number; diasTotales: number } {
  const hoy = new Date()
  const primera = hoy.getDate() <= 15
  const desde = primera ? 1 : 16
  const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate()
  const hasta = primera ? 15 : ultimoDia
  const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
  return {
    texto: `${desde} – ${hasta} ${meses[hoy.getMonth()]} ${hoy.getFullYear()}`,
    diasTranscurridos: hoy.getDate() - desde + 1,
    diasTotales: hasta - desde + 1,
  }
}

export function InicioView({ clienteId, clienteNombre, programacionActions, novedadesActions, onIrAProgramacion }: InicioViewProps) {
  const [loading, setLoading] = useState(true)
  const [puestos, setPuestos] = useState<any[]>([])
  const [programacionHoy, setProgramacionHoy] = useState<any[]>([])
  const [novedades, setNovedades] = useState<any[]>([])

  useEffect(() => {
    setLoading(true)
    const hoy = hoyIso()
    Promise.all([
      programacionActions.getPuestosDemanda(clienteId),
      programacionActions.getProgramacion(clienteId, hoy, hoy),
      novedadesActions.getNovedades(clienteId),
    ]).then(([p, prog, nov]) => {
      setPuestos(p)
      setProgramacionHoy(prog)
      setNovedades(nov)
      setLoading(false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteId])

  const quincena = useMemo(() => quincenaLabel(), [])

  const coberturaPorTurno = useMemo(() => {
    const requeridoPorTurno: Record<string, number> = {}
    for (const p of puestos) requeridoPorTurno[p.turno] = (requeridoPorTurno[p.turno] ?? 0) + p.requeridos
    const asignadoPorTurno: Record<string, number> = {}
    for (const row of programacionHoy) asignadoPorTurno[row.turno] = (asignadoPorTurno[row.turno] ?? 0) + 1
    return Object.keys(requeridoPorTurno)
      .sort()
      .map((turno) => ({
        turno,
        requerido: requeridoPorTurno[turno],
        asignado: asignadoPorTurno[turno] ?? 0,
      }))
  }, [puestos, programacionHoy])

  const novedadesPendientes = novedades.filter((n) => n.estado === "pendiente")
  const totalRequerido = coberturaPorTurno.reduce((s, c) => s + c.requerido, 0)
  const totalAsignado = coberturaPorTurno.reduce((s, c) => s + c.asignado, 0)
  const pctCobertura = totalRequerido > 0 ? Math.round((totalAsignado / totalRequerido) * 100) : 100

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando…
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <SpotlightCard>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-[#a8ccc8]">
              Quincena {clienteNombre ? `· ${clienteNombre}` : ""}
            </div>
            <div className="mt-0.5 text-lg font-extrabold">{quincena.texto}</div>
          </div>
          {onIrAProgramacion && (
            <button
              type="button"
              onClick={onIrAProgramacion}
              className="rounded-lg px-3 py-1.5 text-[12.5px] font-bold"
              style={{ backgroundColor: "#21d4c8", color: "#0b3f4d" }}
            >
              Ir a Programación →
            </button>
          )}
        </div>
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-[11.5px] text-[#a8ccc8]">
            <span>Día {Math.max(1, quincena.diasTranscurridos)} de {quincena.diasTotales}</span>
            <span>{Math.round((Math.max(1, quincena.diasTranscurridos) / quincena.diasTotales) * 100)}%</span>
          </div>
          <ProgressBar
            pct={(Math.max(1, quincena.diasTranscurridos) / quincena.diasTotales) * 100}
            color="#21d4c8"
            trackColor="rgba(255,255,255,.12)"
          />
        </div>
      </SpotlightCard>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiCard label="Cobertura de hoy" value={`${pctCobertura}%`} hint={`${totalAsignado}/${totalRequerido} cupos cubiertos`} color={pctCobertura >= 90 ? "#0f5132" : "#842029"} />
        <KpiCard label="Novedades pendientes" value={novedadesPendientes.length} hint="Por revisar" color="#5bc0de" />
        <KpiCard label="Turnos con demanda" value={coberturaPorTurno.length} hint="Puestos × turno activos" color="#12706b" />
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="mb-3 text-[15px] font-bold text-foreground">Cobertura de hoy por turno</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {coberturaPorTurno.map((c) => {
            const pct = c.requerido > 0 ? (c.asignado / c.requerido) * 100 : 100
            return (
              <div key={c.turno} className="rounded-xl border border-border p-3">
                <div className="flex items-center justify-between">
                  <TurnoChip codigo={c.turno} size="sm" />
                  <span className="font-mono text-[12px] font-bold text-foreground">
                    {c.asignado}/{c.requerido}
                  </span>
                </div>
                <div className="mt-2">
                  <ProgressBar pct={pct} color={pct >= 100 ? "#12a06a" : pct >= 90 ? "#c8871a" : "#d1443f"} />
                </div>
              </div>
            )
          })}
          {coberturaPorTurno.length === 0 && (
            <p className="col-span-full text-center text-sm text-muted-foreground">Sin demanda de puestos configurada todavía.</p>
          )}
        </div>
      </div>

      {novedadesPendientes.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <h3 className="mb-2 text-[15px] font-bold text-foreground">Requiere tu atención</h3>
          <ul className="space-y-1.5">
            {novedadesPendientes.slice(0, 5).map((n) => (
              <li key={n.id} className="flex items-center justify-between text-[12.5px]">
                <span className="text-foreground">{n.trabajadores?.nombre ?? "—"} · {n.tipo}</span>
                <span className="font-mono text-muted-foreground">{n.fecha_desde}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
