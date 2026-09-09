"use client"

// Nivel 1 — Cobertura (vista por defecto). Filas = puesto × turno, no
// personas. Cada celda muestra asignados/requeridos con semáforo; domingos
// y festivos bajan la demanda con los factores factor_dom/factor_fest.
//
// Simplificación de esta fase: `servimos.programacion` no guarda a qué
// PUESTO quedó asignado un trabajador (solo trabajador_id/fecha/turno) —
// el esquema no tiene ese enlace todavía. "Asignados" cuenta aquí toda la
// programación de ese TURNO en el día, compartida entre los puestos que
// usan el mismo turno. Enlazar programación → puesto es trabajo de una
// fase futura (requeriría una columna puesto_demanda_id en programacion).

import { TurnoChip } from "@/components/servimos/ui/turno-chip"

export interface PuestoDemandaRow {
  id: string
  puesto: string
  area: string | null
  turno: string
  requeridos: number
  factor_dom: number
  factor_fest: number
}

export interface DiaColumna {
  fecha: string
  label: string
  numero: number
  esDomingo: boolean
  esFestivo: boolean
}

interface NivelCoberturaProps {
  puestos: PuestoDemandaRow[]
  dias: DiaColumna[]
  // asignadosPorTurnoFecha["T1|2026-08-03"] = 3
  asignadosPorTurnoFecha: Record<string, number>
  onDrillDown: () => void
}

export function NivelCobertura({ puestos, dias, asignadosPorTurnoFecha, onDrillDown }: NivelCoberturaProps) {
  let cuposAbiertos = 0
  let celdasConDeficit = 0

  const filas = puestos.map((p) => {
    const celdas = dias.map((d) => {
      const requerido = Math.round(p.requeridos * (d.esFestivo ? p.factor_fest : d.esDomingo ? p.factor_dom : 1))
      const asignado = asignadosPorTurnoFecha[`${p.turno}|${d.fecha}`] ?? 0
      const pct = requerido > 0 ? (asignado / requerido) * 100 : 100
      let tono: "ok" | "warn" | "crit" = "ok"
      if (pct < 90) tono = "crit"
      else if (pct < 100) tono = "warn"
      if (asignado < requerido) {
        cuposAbiertos += requerido - asignado
        celdasConDeficit++
      }
      return { fecha: d.fecha, requerido, asignado, tono }
    })
    return { puesto: p, celdas }
  })

  const TONO_STYLE: Record<string, { bg: string; text: string }> = {
    ok: { bg: "#d1e7dd", text: "#0f5132" },
    warn: { bg: "#fff3cd", text: "#664d03" },
    crit: { bg: "#f8d7da", text: "#842029" },
  }

  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-2.5 text-[11.5px] text-muted-foreground">
        <span className="flex items-center gap-1"><i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: "#d1e7dd" }} /> Cubierto</span>
        <span className="flex items-center gap-1"><i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: "#fff3cd" }} /> ≥90%</span>
        <span className="flex items-center gap-1"><i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: "#f8d7da" }} /> &lt;90%</span>
      </div>
      <div className="overflow-auto">
        <table className="w-full border-collapse" style={{ minWidth: dias.length * 56 + 220 }}>
          <thead>
            <tr className="bg-muted/50">
              <th className="sticky left-0 z-10 bg-muted/50 px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground" style={{ width: 220 }}>
                Puesto · turno
              </th>
              {dias.map((d) => (
                <th
                  key={d.fecha}
                  className="px-1 py-2 text-center text-[11px] font-semibold text-muted-foreground"
                  style={(d.esDomingo || d.esFestivo) ? { backgroundColor: "#fff3cd" } : undefined}
                >
                  {d.label}
                  <div className="font-mono text-[13px] text-foreground">{d.numero}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map(({ puesto, celdas }) => (
              <tr key={puesto.id} className="border-t border-border">
                <td className="sticky left-0 z-10 bg-card px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <TurnoChip codigo={puesto.turno} size="sm" />
                    <span className="text-[12.5px] font-semibold text-foreground">{puesto.puesto}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">{puesto.area ?? "—"} · requiere {puesto.requeridos}</div>
                </td>
                {celdas.map((c) => {
                  const s = TONO_STYLE[c.tono]
                  return (
                    <td key={c.fecha} className="px-1 py-2 text-center">
                      <button
                        type="button"
                        onClick={onDrillDown}
                        className="w-full rounded-md py-1.5 font-mono text-[12px] font-bold transition-transform hover:scale-105"
                        style={{ backgroundColor: s.bg, color: s.text }}
                        title={c.tono === "ok" ? "Cubierto — clic para ver el detalle" : "Déficit — clic para pedir cobertura a Servimos"}
                      >
                        {c.asignado}/{c.requerido}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-[12px] text-muted-foreground">
        <span>Clic en un cupo cubierto abre el detalle por persona · clic en un déficit solicita cobertura a Servimos.</span>
        <span className="font-mono font-semibold" style={{ color: cuposAbiertos > 0 ? "#842029" : "#0f5132" }}>
          {cuposAbiertos > 0 ? `${cuposAbiertos} cupos por cubrir en ${celdasConDeficit} celdas` : "Cobertura completa"}
        </span>
      </div>
    </div>
  )
}
