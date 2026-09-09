"use client"

// Franja de horarios de turno — la fuente de verdad de la nómina. Editable
// arriba de los 3 niveles de Programación; cada cambio recalcula en vivo
// el reparto diurno/nocturno vía calcularTurno() (mismo motor que liquida
// la quincena completa).

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TurnoChip } from "@/components/servimos/ui/turno-chip"
import { calcularTurno, type ParametrosNomina, type TurnoDef } from "@/lib/servimos/payroll-engine"

export interface TurnoDefinicionRow {
  id: string
  codigo: string
  nombre: string
  hora_inicio: string | null
  hora_fin: string | null
  descanso_min: number
}

interface TurnosStripProps {
  turnos: TurnoDefinicionRow[]
  parametros: ParametrosNomina
  onGuardar: (turno: TurnoDefinicionRow) => Promise<void>
}

export function TurnosStrip({ turnos, parametros, onGuardar }: TurnosStripProps) {
  // Los editables son T1/T2/T3/AD — el descanso "D" no tiene horario.
  const editables = turnos.filter((t) => t.codigo !== "D")

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <div>
          <h3 className="text-[15px] font-bold text-foreground">Horarios de turno</h3>
          <p className="text-xs text-muted-foreground">De aquí sale el cálculo de nómina — cambiar un horario recalcula la quincena completa.</p>
        </div>
        <span className="font-mono text-[11px] text-muted-foreground">Nocturno 19:00–06:00 · Ley 2466/2025</span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {editables.map((t) => (
          <TurnoCard key={t.id} turno={t} parametros={parametros} onGuardar={onGuardar} />
        ))}
      </div>
    </div>
  )
}

function TurnoCard({
  turno,
  parametros,
  onGuardar,
}: {
  turno: TurnoDefinicionRow
  parametros: ParametrosNomina
  onGuardar: (turno: TurnoDefinicionRow) => Promise<void>
}) {
  const [horaInicio, setHoraInicio] = useState(turno.hora_inicio ?? "")
  const [horaFin, setHoraFin] = useState(turno.hora_fin ?? "")
  const [descansoMin, setDescansoMin] = useState(turno.descanso_min)
  const [saving, setSaving] = useState(false)

  const def: TurnoDef = { codigo: turno.codigo, horaInicio: horaInicio || null, horaFin: horaFin || null, descansoMin }
  const calc = calcularTurno(def, parametros)
  const excedeDiez = calc.horas > 10

  const guardar = async () => {
    setSaving(true)
    await onGuardar({ ...turno, hora_inicio: horaInicio, hora_fin: horaFin, descanso_min: descansoMin })
    setSaving(false)
  }

  return (
    <div className="rounded-xl border border-border p-3">
      <div className="mb-2 flex items-center gap-2">
        <TurnoChip codigo={turno.codigo} size="sm" />
        <span className="text-[13px] font-semibold text-foreground">{turno.nombre}</span>
        <span
          className="ml-auto rounded px-1.5 py-0.5 font-mono text-[11px] font-bold"
          style={excedeDiez ? { backgroundColor: "#f8d7da", color: "#842029" } : { backgroundColor: "#eef1f6", color: "#6c757d" }}
        >
          {calc.horas}h
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <Input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} onBlur={guardar} className="h-8 text-[13px]" />
        <span className="text-xs text-muted-foreground">a</span>
        <Input type="time" value={horaFin} onChange={(e) => setHoraFin(e.target.value)} onBlur={guardar} className="h-8 text-[13px]" />
      </div>
      <div className="mt-1.5 flex items-center gap-1.5">
        <Label className="text-[11px] text-muted-foreground">Descanso (min)</Label>
        <Input
          type="number"
          min={0}
          value={descansoMin}
          onChange={(e) => setDescansoMin(Number(e.target.value) || 0)}
          onBlur={guardar}
          className="h-7 w-16 text-[12px]"
        />
        {saving && <span className="text-[11px] text-muted-foreground">Guardando…</span>}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-muted-foreground">{calc.diurnas}h diurnas</span>
        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-muted-foreground">{calc.nocturnas}h nocturnas</span>
        {excedeDiez && <span className="rounded px-1.5 py-0.5 font-semibold" style={{ backgroundColor: "#f8d7da", color: "#842029" }}>Supera 10 h</span>}
      </div>
    </div>
  )
}
