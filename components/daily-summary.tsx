"use client"

import { NotebookPen, CalendarClock } from "lucide-react"
import { useEffect, useState } from "react"
import { getPulsoOperativoGlobal } from "@/lib/servimos-programacion-actions"

interface PulsoStats {
  novedadesPendientes: number
  turnosProgramadosHoy: number
  pctCobertura: number | null
}

export function DailySummary() {
  const [stats, setStats] = useState<PulsoStats>({
    novedadesPendientes: 0,
    turnosProgramadosHoy: 0,
    pctCobertura: null,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancel = false
    const loadStats = async () => {
      setLoading(true)
      try {
        const data = await getPulsoOperativoGlobal()
        if (!cancel) setStats(data)
      } catch (error) {
        console.error("Error loading daily summary:", error)
      } finally {
        if (!cancel) setLoading(false)
      }
    }

    loadStats()
    const interval = setInterval(loadStats, 300000)
    return () => {
      cancel = true
      clearInterval(interval)
    }
  }, [])

  // Anillo de cobertura de hoy.
  const pct = stats.pctCobertura
  const R = 22
  const CIRC = 2 * Math.PI * R
  const dashoffset = pct === null ? CIRC : CIRC * (1 - pct / 100)
  const ringColor = pct === null ? "#5bc0de" : pct >= 90 ? "#12a06a" : pct >= 75 ? "#c8871a" : "#d1443f"

  return (
    <div className="mb-6 sm:mb-8">
      <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground sm:mb-4">Pulso operativo</h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        {/* Novedades pendientes */}
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <div className="mb-2.5 flex items-center gap-3">
            <span
              className="flex h-9 w-9 flex-none items-center justify-center rounded-xl"
              style={{ backgroundColor: "#5bc0de26", color: "#5bc0de" }}
            >
              <NotebookPen className="h-[18px] w-[18px]" />
            </span>
            <span className="text-3xl font-extrabold tabular-nums tracking-tight" style={{ color: "#5bc0de" }}>
              {loading ? "…" : stats.novedadesPendientes}
            </span>
            <span className="ml-auto text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              Novedades
            </span>
          </div>
          <p className="text-[13px] leading-snug text-muted-foreground">Novedades de personal en misión pendientes de revisión.</p>
        </div>

        {/* Cobertura de hoy con anillo de medida */}
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            Cobertura de hoy
          </div>
          <div className="flex items-center gap-4">
            <svg viewBox="0 0 58 58" className="h-[58px] w-[58px] flex-none">
              <circle cx="29" cy="29" r={R} fill="none" stroke="var(--border)" strokeWidth="7" />
              <circle
                cx="29"
                cy="29"
                r={R}
                fill="none"
                stroke={ringColor}
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={CIRC}
                strokeDashoffset={dashoffset}
                style={{ transform: "rotate(-90deg)", transformOrigin: "center", transition: "stroke-dashoffset .6s ease" }}
              />
              <text x="29" y="33" textAnchor="middle" className="fill-foreground" style={{ font: "800 14px sans-serif" }}>
                {pct === null ? "—" : `${pct}%`}
              </text>
            </svg>
            <div>
              <div className="text-2xl font-extrabold tabular-nums tracking-tight text-foreground">
                {loading ? "…" : pct === null ? "—" : `${pct}%`}
              </div>
              <div className="mt-1 text-[13px] leading-snug text-muted-foreground">
                {pct === null ? "Sin demanda configurada aún." : pct >= 90 ? "Cobertura al día ✓" : "Puestos cubiertos hoy."}
              </div>
            </div>
          </div>
        </div>

        {/* Turnos programados hoy */}
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <div className="mb-2.5 flex items-center gap-3">
            <span
              className="flex h-9 w-9 flex-none items-center justify-center rounded-xl"
              style={{ backgroundColor: "#2A9D8F26", color: "#2A9D8F" }}
            >
              <CalendarClock className="h-[18px] w-[18px]" />
            </span>
            <span className="text-3xl font-extrabold tabular-nums tracking-tight" style={{ color: "#2A9D8F" }}>
              {loading ? "…" : stats.turnosProgramadosHoy}
            </span>
            <span className="ml-auto text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              Turnos
            </span>
          </div>
          <p className="text-[13px] leading-snug text-muted-foreground">Turnos de personal en misión programados hoy.</p>
        </div>
      </div>
    </div>
  )
}
