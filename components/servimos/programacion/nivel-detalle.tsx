"use client"

// Nivel 3 — Detalle por persona. Matriz clásica, filtrada a un equipo
// (12-20 personas). Solo para excepciones. Pintado por clic (el
// prototipo del paquete insinuaba pintar arrastrando el mouse, pero ese
// gesto quedó como no-op sin implementar allí — aquí es clic a clic,
// consistente con lo que de verdad funciona).

import { useState } from "react"
import { TurnoChip, TURNO_COLORS } from "@/components/servimos/ui/turno-chip"

const PALETA = ["T1", "T2", "T3", "AD", "D"]

export interface TrabajadorRow {
  id: string
  cedula: string
  nombre: string
  cargo: string
  equipo_id: string | null
}

export interface DiaColumna {
  fecha: string
  label: string
  numero: number
}

interface NivelDetalleProps {
  equipos: { id: string; letra: string; nombre: string }[]
  trabajadores: TrabajadorRow[]
  dias: DiaColumna[]
  // programacion["trabajadorId|fecha"] = "T1"
  programacion: Record<string, string>
  bloqueados: Set<string> // "trabajadorId|fecha" con novedad bloqueante
  onPintarCelda: (trabajadorId: string, fecha: string, turno: string) => void
}

export function NivelDetalle({ equipos, trabajadores, dias, programacion, bloqueados, onPintarCelda }: NivelDetalleProps) {
  const [equipoId, setEquipoId] = useState(equipos[0]?.id ?? "")
  const [pincel, setPincel] = useState("T1")

  const filtrados = trabajadores.filter((t) => t.equipo_id === equipoId)

  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-2.5">
        <select
          value={equipoId}
          onChange={(e) => setEquipoId(e.target.value)}
          className="rounded-md border border-border bg-background px-2 py-1 text-[12.5px]"
        >
          {equipos.map((eq) => (
            <option key={eq.id} value={eq.id}>
              Equipo {eq.letra} · {eq.nombre}
            </option>
          ))}
        </select>
        <span className="text-[11.5px] text-muted-foreground">Pincel:</span>
        <div className="flex gap-1">
          {PALETA.map((codigo) => (
            <button
              key={codigo}
              type="button"
              onClick={() => setPincel(codigo)}
              className="rounded-md transition-transform"
              style={{ outline: pincel === codigo ? "2px solid #5bc0de" : "none", outlineOffset: 2 }}
            >
              <TurnoChip codigo={codigo} size="sm" />
            </button>
          ))}
        </div>
        <span className="ml-auto text-[11.5px] text-muted-foreground">Clic en una celda para asignar el turno del pincel.</span>
      </div>
      <div className="overflow-auto">
        <table className="w-full border-collapse" style={{ minWidth: dias.length * 44 + 240 }}>
          <thead>
            <tr className="bg-muted/50">
              <th className="sticky left-0 z-10 bg-muted/50 px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground" style={{ width: 240 }}>
                Trabajador
              </th>
              {dias.map((d) => (
                <th key={d.fecha} className="px-1 py-2 text-center text-[11px] font-semibold text-muted-foreground">
                  {d.label}
                  <div className="font-mono text-[12px] text-foreground">{d.numero}</div>
                </th>
              ))}
              <th className="px-2 py-2 text-center text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Horas</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((t) => {
              let horas = 0
              return (
                <tr key={t.id} className="border-t border-border">
                  <td className="sticky left-0 z-10 bg-card px-3 py-1.5">
                    <div className="text-[12.5px] font-semibold text-foreground">{t.nombre}</div>
                    <div className="text-[11px] text-muted-foreground">CC {t.cedula} · {t.cargo}</div>
                  </td>
                  {dias.map((d) => {
                    const clave = `${t.id}|${d.fecha}`
                    const bloqueado = bloqueados.has(clave)
                    const turno = programacion[clave] ?? "D"
                    if (turno !== "D") horas += 1 // marcador simple; el detalle real sale de calcularTurno()
                    const c = TURNO_COLORS[turno] ?? TURNO_COLORS.D
                    return (
                      <td key={d.fecha} className="px-1 py-1.5 text-center">
                        <button
                          type="button"
                          disabled={bloqueado}
                          onClick={() => onPintarCelda(t.id, d.fecha, pincel)}
                          className="h-7 w-9 rounded font-mono text-[10px] font-bold disabled:cursor-not-allowed"
                          style={bloqueado ? { backgroundColor: "#f8d7da", color: "#842029" } : { backgroundColor: c.bg, color: c.fg }}
                          title={bloqueado ? "Bloqueado por una novedad aprobada" : `${t.nombre} · ${d.fecha}`}
                        >
                          {bloqueado ? "!" : turno}
                        </button>
                      </td>
                    )
                  })}
                  <td className="px-2 py-1.5 text-center font-mono text-[12px] font-semibold text-foreground">{horas}</td>
                </tr>
              )
            })}
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={dias.length + 2} className="px-4 py-6 text-center text-sm text-muted-foreground">
                  Este equipo no tiene trabajadores asignados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
        <b>!</b> día bloqueado por una novedad aprobada (no editable) · celdas de color = turno asignado.
      </div>
    </div>
  )
}
