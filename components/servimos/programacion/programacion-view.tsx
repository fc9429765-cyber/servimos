"use client"

// Orquestador de Programación: segmentado de 3 niveles + franja de turnos
// arriba. Un solo árbol de componentes consumido por el lado interno
// (components/servimos/programacion-nomina-servimos.tsx, admin/cruza
// clientes) y por el portal-cliente
// (app/portal-cliente/(shell)/programacion/page.tsx, sesión/RLS) — cada uno
// le pasa su propio juego de server actions con las mismas firmas.

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { TurnosStrip, type TurnoDefinicionRow } from "./turnos-strip"
import { NivelCobertura, type PuestoDemandaRow } from "./nivel-cobertura"
import { NivelEquipos, type EquipoRow } from "./nivel-equipos"
import { NivelDetalle, type TrabajadorRow } from "./nivel-detalle"
import type { ParametrosNomina } from "@/lib/servimos/payroll-engine"

export interface ProgramacionActions {
  getTurnosDefinicion: (clienteId: string) => Promise<any[]>
  guardarTurnoDefinicion: (params: {
    clienteId: string
    codigo: string
    nombre: string
    horaInicio: string
    horaFin: string
    descansoMin: number
  }) => Promise<{ success: boolean; message?: string }>
  getPuestosDemanda: (clienteId: string) => Promise<any[]>
  getEquipos: (clienteId: string) => Promise<any[]>
  setPatronEquipo: (equipoId: string, patron: string) => Promise<{ success: boolean; message?: string }>
  getTrabajadores: (clienteId: string) => Promise<any[]>
  getProgramacion: (clienteId: string, fechaIni: string, fechaFin: string) => Promise<any[]>
  setProgramacionCelda: (params: { trabajadorId: string; fecha: string; turno: string; userId?: string }) => Promise<{ success: boolean; message?: string }>
  publicarProgramacion: (clienteId: string, fechaIni: string, fechaFin: string) => Promise<{ success: boolean; message?: string }>
}

interface ProgramacionViewProps {
  clienteId: string
  actions: ProgramacionActions
  parametros: ParametrosNomina
  userId?: string
}

const DOW = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"]

function quincenaActual(): { ini: Date; fin: Date } {
  const hoy = new Date()
  const anio = hoy.getFullYear()
  const mes = hoy.getMonth()
  if (hoy.getDate() <= 15) {
    return { ini: new Date(anio, mes, 1), fin: new Date(anio, mes, 15) }
  }
  const ultimoDia = new Date(anio, mes + 1, 0).getDate()
  return { ini: new Date(anio, mes, 16), fin: new Date(anio, mes, ultimoDia) }
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function rangoDias(ini: Date, fin: Date) {
  const dias: { fecha: string; label: string; numero: number; esDomingo: boolean; esFestivo: boolean }[] = []
  const cursor = new Date(ini)
  while (cursor <= fin) {
    dias.push({
      fecha: iso(cursor),
      label: DOW[cursor.getDay()],
      numero: cursor.getDate(),
      esDomingo: cursor.getDay() === 0,
      esFestivo: false, // festivos colombianos: fuera de alcance de esta fase (tabla servimos.festivos vacía por ahora)
    })
    cursor.setDate(cursor.getDate() + 1)
  }
  return dias
}

type Vista = "cobertura" | "cuadrillas" | "detalle"

const VISTA_AYUDA: Record<Vista, string> = {
  cobertura: "Programa por demanda: el sistema busca quién la cubre.",
  cuadrillas: "Programa equipos completos con un patrón de rotación.",
  detalle: "Matriz persona por día — solo para excepciones puntuales.",
}

export function ProgramacionView({ clienteId, actions, parametros, userId }: ProgramacionViewProps) {
  const [vista, setVista] = useState<Vista>("cobertura")
  const [loading, setLoading] = useState(true)
  const [turnos, setTurnos] = useState<TurnoDefinicionRow[]>([])
  const [puestos, setPuestos] = useState<PuestoDemandaRow[]>([])
  const [equipos, setEquipos] = useState<EquipoRow[]>([])
  const [trabajadores, setTrabajadores] = useState<TrabajadorRow[]>([])
  const [programacion, setProgramacion] = useState<Record<string, string>>({})
  const [publicando, setPublicando] = useState(false)
  const [publicada, setPublicada] = useState(false)

  const { ini, fin } = useMemo(() => quincenaActual(), [])
  const dias = useMemo(() => rangoDias(ini, fin), [ini, fin])
  const fechaIni = iso(ini)
  const fechaFin = iso(fin)

  const cargar = async () => {
    setLoading(true)
    const [turnosData, puestosData, equiposData, trabajadoresData, progData] = await Promise.all([
      actions.getTurnosDefinicion(clienteId),
      actions.getPuestosDemanda(clienteId),
      actions.getEquipos(clienteId),
      actions.getTrabajadores(clienteId),
      actions.getProgramacion(clienteId, fechaIni, fechaFin),
    ])
    setTurnos(turnosData)
    setPuestos(puestosData)
    setEquipos(equiposData)
    setTrabajadores(trabajadoresData)
    const mapa: Record<string, string> = {}
    for (const row of progData) mapa[`${row.trabajador_id}|${row.fecha}`] = row.turno
    setProgramacion(mapa)
    setPublicada(progData.length > 0 && progData.every((r: any) => r.publicada))
    setLoading(false)
  }

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteId])

  const asignadosPorTurnoFecha = useMemo(() => {
    const acc: Record<string, number> = {}
    for (const clave of Object.keys(programacion)) {
      const turno = programacion[clave]
      const [, fecha] = clave.split("|")
      const k = `${turno}|${fecha}`
      acc[k] = (acc[k] ?? 0) + 1
    }
    return acc
  }, [programacion])

  const deficitTotal = useMemo(() => {
    let total = 0
    for (const p of puestos) {
      for (const d of dias) {
        const requerido = Math.round(p.requeridos * (d.esFestivo ? p.factor_fest : d.esDomingo ? p.factor_dom : 1))
        const asignado = asignadosPorTurnoFecha[`${p.turno}|${d.fecha}`] ?? 0
        if (asignado < requerido) total += requerido - asignado
      }
    }
    return total
  }, [puestos, dias, asignadosPorTurnoFecha])

  const guardarTurno = async (t: TurnoDefinicionRow) => {
    await actions.guardarTurnoDefinicion({
      clienteId,
      codigo: t.codigo,
      nombre: t.nombre,
      horaInicio: t.hora_inicio ?? "",
      horaFin: t.hora_fin ?? "",
      descansoMin: t.descanso_min,
    })
    await cargar()
  }

  const cambiarPatron = async (equipoId: string, patron: string) => {
    await actions.setPatronEquipo(equipoId, patron)
    setEquipos((prev) => prev.map((e) => (e.id === equipoId ? { ...e, patron } : e)))
  }

  const pintarCelda = async (trabajadorId: string, fecha: string, turno: string) => {
    setProgramacion((prev) => ({ ...prev, [`${trabajadorId}|${fecha}`]: turno }))
    await actions.setProgramacionCelda({ trabajadorId, fecha, turno, userId })
  }

  const publicar = async () => {
    if (deficitTotal > 0) return
    setPublicando(true)
    const r = await actions.publicarProgramacion(clienteId, fechaIni, fechaFin)
    setPublicando(false)
    if (r.success) setPublicada(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando programación…
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-border bg-card p-1">
          {(["cobertura", "cuadrillas", "detalle"] as Vista[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setVista(v)}
              className="rounded-md px-3 py-1.5 text-[12.5px] font-semibold transition-colors"
              style={vista === v ? { backgroundColor: "#0e3b3b", color: "#ffffff" } : { color: "var(--muted-foreground)" }}
            >
              {v === "cobertura" ? "Cobertura" : v === "cuadrillas" ? "Equipos y patrones" : "Detalle por persona"}
            </button>
          ))}
        </div>
        <span className="text-[12px] text-muted-foreground">{VISTA_AYUDA[vista]}</span>
        <div className="ml-auto flex items-center gap-2">
          <Button
            onClick={publicar}
            disabled={publicando || publicada}
            size="sm"
            style={publicada ? { backgroundColor: "#d1e7dd", color: "#0f5132" } : undefined}
          >
            {publicada ? "✓ Programación publicada" : publicando ? "Publicando…" : "Publicar programación"}
          </Button>
        </div>
      </div>

      <TurnosStrip turnos={turnos} parametros={parametros} onGuardar={guardarTurno} />

      {vista === "cobertura" && (
        <NivelCobertura
          puestos={puestos}
          dias={dias}
          asignadosPorTurnoFecha={asignadosPorTurnoFecha}
          onDrillDown={() => setVista("detalle")}
        />
      )}
      {vista === "cuadrillas" && (
        <NivelEquipos equipos={equipos} totalPersonas={trabajadores.length} diasCiclo={dias.length} onCambiarPatron={cambiarPatron} />
      )}
      {vista === "detalle" && (
        <NivelDetalle
          equipos={equipos}
          trabajadores={trabajadores}
          dias={dias}
          programacion={programacion}
          bloqueados={new Set()}
          onPintarCelda={pintarCelda}
        />
      )}
    </div>
  )
}
