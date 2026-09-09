"use client"

// Nivel 2 — Equipos y patrones. La gente se agrupa en equipos (A, B, C, D)
// y cada uno recibe un patrón de rotación. Cambiar el selector reprograma
// a todo el equipo (previsualización de las 15 celdas del ciclo; el guardado
// real celda a celda queda para cuando el equipo pase a Nivel 3 si necesita
// una excepción puntual).

import { useState } from "react"
import { TurnoChip } from "@/components/servimos/ui/turno-chip"
import { ProgressBar } from "@/components/servimos/ui/progress-bar"

export const PATRONES_ROT: Record<string, { label: string; ciclo: string[]; horasSemana: number; descripcion: string }> = {
  "5x2": { label: "5×2", ciclo: ["T1", "T1", "T1", "T1", "T1", "D", "D"], horasSemana: 35, descripcion: "5 días de turno T1, 2 de descanso." },
  "4x3 comprimido": { label: "4×3 comprimido", ciclo: ["T2", "T2", "T2", "T2", "D", "D", "D"], horasSemana: 28, descripcion: "4 días de turno T2, 3 de descanso." },
  "6x1 rotativo": { label: "6×1 rotativo", ciclo: ["T1", "T1", "T1", "T2", "T2", "T2", "D"], horasSemana: 42, descripcion: "6 días rotando T1/T2, 1 de descanso — al límite legal (42h)." },
  "continuo 24/7": { label: "Continuo 24/7", ciclo: ["T1", "T1", "T2", "T2", "T3", "T3", "D"], horasSemana: 36, descripcion: "Cobertura continua rotando los 3 turnos." },
}

export interface EquipoRow {
  id: string
  letra: string
  nombre: string
  area: string | null
  patron: string
}

interface NivelEquiposProps {
  equipos: EquipoRow[]
  totalPersonas: number
  diasCiclo: number
  onCambiarPatron: (equipoId: string, patron: string) => Promise<void>
}

export function NivelEquipos({ equipos, totalPersonas, diasCiclo, onCambiarPatron }: NivelEquiposProps) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
      <div className="space-y-3">
        {equipos.map((eq) => (
          <EquipoCard key={eq.id} equipo={eq} diasCiclo={diasCiclo} onCambiarPatron={onCambiarPatron} />
        ))}
        {equipos.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            Este cliente todavía no tiene equipos configurados.
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <h3 className="mb-2 text-[13px] font-bold text-foreground">Patrones de rotación</h3>
          <div className="space-y-2.5">
            {Object.entries(PATRONES_ROT).map(([key, p]) => (
              <div key={key} className="text-[12.5px]">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">{p.label}</span>
                  <span className="font-mono text-muted-foreground">{p.horasSemana}h/sem</span>
                </div>
                <p className="text-[11.5px] text-muted-foreground">{p.descripcion}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 border-t border-border pt-2 text-[11px] text-muted-foreground">
            Ningún patrón puede superar 42h/semana (Ley 2101/2021) — el sistema rechaza el cambio si lo hace.
          </p>
        </div>

        <div
          className="rounded-2xl p-4 text-[#eaf6f4]"
          style={{ background: "linear-gradient(135deg,#0a2e2e,#0e3b3b)" }}
        >
          <div className="text-[11px] font-bold uppercase tracking-wide text-[#a8ccc8]">Ahorro de trabajo</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-extrabold">{equipos.length}</span>
            <span className="text-[12px] text-[#a8ccc8]">celdas de patrón vs.</span>
            <span className="font-mono text-2xl font-extrabold text-white/40">{totalPersonas}</span>
            <span className="text-[12px] text-[#a8ccc8]">celdas manuales</span>
          </div>
          <p className="mt-1 text-[11.5px] text-[#a8ccc8]">
            Programar por equipo evita tocar {totalPersonas > 0 ? totalPersonas - equipos.length : 0} filas manuales por quincena.
          </p>
        </div>
      </div>
    </div>
  )
}

function EquipoCard({
  equipo,
  diasCiclo,
  onCambiarPatron,
}: {
  equipo: EquipoRow
  diasCiclo: number
  onCambiarPatron: (equipoId: string, patron: string) => Promise<void>
}) {
  const [patron, setPatron] = useState(equipo.patron)
  const [saving, setSaving] = useState(false)
  const info = PATRONES_ROT[patron] ?? PATRONES_ROT["5x2"]
  const excede42 = info.horasSemana > 42

  const cambiar = async (nuevoPatron: string) => {
    const nuevaInfo = PATRONES_ROT[nuevoPatron]
    if (nuevaInfo.horasSemana > 42) return // rechazado en el cliente además de en el server
    setPatron(nuevoPatron)
    setSaving(true)
    await onCambiarPatron(equipo.id, nuevoPatron)
    setSaving(false)
  }

  const celdas = Array.from({ length: diasCiclo }, (_, i) => info.ciclo[i % info.ciclo.length])

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-extrabold"
          style={{ backgroundColor: "#e7f7fb", color: "#0b3f4d" }}
        >
          {equipo.letra}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-bold text-foreground">{equipo.nombre}</div>
          <div className="text-[11.5px] text-muted-foreground">{equipo.area ?? "—"}</div>
        </div>
        <select
          value={patron}
          onChange={(e) => cambiar(e.target.value)}
          disabled={saving}
          className="rounded-md border border-border bg-background px-2 py-1 text-[12.5px]"
        >
          {Object.entries(PATRONES_ROT).map(([key, p]) => (
            <option key={key} value={key}>
              {p.label} ({p.horasSemana}h/sem)
            </option>
          ))}
        </select>
        <span
          className="rounded px-1.5 py-0.5 font-mono text-[11px] font-bold"
          style={excede42 ? { backgroundColor: "#f8d7da", color: "#842029" } : { backgroundColor: "#d1e7dd", color: "#0f5132" }}
        >
          {info.horasSemana}h
        </span>
      </div>
      <div className="mt-3 flex gap-1">
        {celdas.map((codigo, i) => (
          <TurnoChip key={i} codigo={codigo} size="sm" />
        ))}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">{info.descripcion}</p>
    </div>
  )
}
