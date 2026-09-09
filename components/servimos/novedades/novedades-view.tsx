"use client"

// Novedades — formulario a la izquierda con el catálogo de 15 tipologías
// (cada una con su base legal visible y soporte obligatorio donde la ley
// lo exige) + tabla del periodo a la derecha. Compartido entre el lado
// interno (con aprobar/rechazar) y el portal-cliente (solo reporta).

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2 } from "lucide-react"
import { StatusBadge } from "@/components/servimos/ui/status-badge"
import { FilterPillGroup } from "@/components/servimos/ui/filter-pill-group"

export interface TipoNovedadRow {
  codigo: string
  etiqueta: string
  unidad: "horas" | "dias" | "evento"
  es_rango: boolean
  requiere_soporte: boolean
  bloquea_turno: boolean
  norma: string | null
}

export interface NovedadesActions {
  getTiposNovedad: () => Promise<TipoNovedadRow[]>
  getTrabajadores: (clienteId: string) => Promise<{ id: string; nombre: string; cedula: string }[]>
  getNovedades: (clienteId?: string) => Promise<any[]>
  crearNovedad: (params: {
    trabajadorId: string
    tipo: string
    fechaDesde: string
    fechaHasta: string
    cantidad: number
    observacion?: string
    soportePath?: string
    reportadaPor?: string
  }) => Promise<{ success: boolean; message?: string }>
  aprobarNovedad: (id: string, aprobadaPor: string) => Promise<{ success: boolean; message?: string }>
  rechazarNovedad: (id: string, aprobadaPor: string) => Promise<{ success: boolean; message?: string }>
}

const ESTADO_TONO: Record<string, "success" | "warning" | "error" | "info"> = {
  aprobada: "success",
  pendiente: "warning",
  rechazada: "error",
  en_tramite_arl: "info",
}

interface NovedadesViewProps {
  clienteId: string
  actions: NovedadesActions
  esServimos: boolean
  userId?: string
}

export function NovedadesView({ clienteId, actions, esServimos, userId }: NovedadesViewProps) {
  const [tipos, setTipos] = useState<TipoNovedadRow[]>([])
  const [trabajadores, setTrabajadores] = useState<{ id: string; nombre: string; cedula: string }[]>([])
  const [novedades, setNovedades] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<"todas" | "pendiente" | "aprobada" | "rechazada">("todas")

  const [trabajadorId, setTrabajadorId] = useState("")
  const [tipoCodigo, setTipoCodigo] = useState("")
  const [fechaDesde, setFechaDesde] = useState("")
  const [fechaHasta, setFechaHasta] = useState("")
  const [cantidad, setCantidad] = useState("")
  const [observacion, setObservacion] = useState("")
  const [archivo, setArchivo] = useState<File | null>(null)
  const [guardando, setGuardando] = useState(false)

  const cargar = async () => {
    setLoading(true)
    const [t, w, n] = await Promise.all([actions.getTiposNovedad(), actions.getTrabajadores(clienteId), actions.getNovedades(clienteId)])
    setTipos(t)
    setTrabajadores(w)
    setNovedades(n)
    setLoading(false)
  }

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteId])

  const tipoActivo = tipos.find((t) => t.codigo === tipoCodigo)

  const limpiar = () => {
    setTrabajadorId("")
    setTipoCodigo("")
    setFechaDesde("")
    setFechaHasta("")
    setCantidad("")
    setObservacion("")
    setArchivo(null)
  }

  const submit = async () => {
    if (!trabajadorId || !tipoCodigo || !fechaDesde) return
    setGuardando(true)

    let soportePath: string | undefined
    if (tipoActivo?.requiere_soporte && archivo) {
      const fd = new FormData()
      fd.append("cliente_id", clienteId)
      fd.append("trabajador_id", trabajadorId)
      fd.append("file", archivo)
      const res = await fetch("/api/servimos/novedades/upload", { method: "POST", body: fd })
      const json = await res.json()
      if (json.success) soportePath = json.path
    }

    const cantidadFinal = tipoActivo?.es_rango
      ? diasEntre(fechaDesde, fechaHasta || fechaDesde)
      : Number(cantidad) || 1

    await actions.crearNovedad({
      trabajadorId,
      tipo: tipoCodigo,
      fechaDesde,
      fechaHasta: fechaHasta || fechaDesde,
      cantidad: cantidadFinal,
      observacion: observacion || undefined,
      soportePath,
      reportadaPor: userId,
    })

    setGuardando(false)
    limpiar()
    cargar()
  }

  const filtradas = useMemo(() => {
    if (filtro === "todas") return novedades
    return novedades.filter((n) => n.estado === filtro)
  }, [novedades, filtro])

  const decidir = async (id: string, aprobar: boolean) => {
    if (!userId) return
    if (aprobar) await actions.aprobarNovedad(id, userId)
    else await actions.rechazarNovedad(id, userId)
    cargar()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando novedades…
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360px_1fr]">
      {/* Formulario */}
      <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <h3 className="text-[15px] font-bold text-foreground">Reportar novedad</h3>

        <div className="space-y-1.5">
          <Label className="text-xs">Trabajador</Label>
          <select
            value={trabajadorId}
            onChange={(e) => setTrabajadorId(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-[13px]"
          >
            <option value="">Selecciona…</option>
            {trabajadores.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre} · CC {t.cedula}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Tipo de novedad</Label>
          <select
            value={tipoCodigo}
            onChange={(e) => setTipoCodigo(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-[13px]"
          >
            <option value="">Selecciona…</option>
            {tipos.map((t) => (
              <option key={t.codigo} value={t.codigo}>
                {t.codigo} · {t.etiqueta}
              </option>
            ))}
          </select>
        </div>

        {tipoActivo?.norma && (
          <div className="rounded-md bg-muted px-2.5 py-1.5 text-[11.5px] text-muted-foreground">
            Base legal: {tipoActivo.norma}
          </div>
        )}

        {tipoActivo?.es_rango ? (
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Desde</Label>
              <Input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className="h-8 text-[13px]" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Hasta</Label>
              <Input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} className="h-8 text-[13px]" />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Fecha</Label>
              <Input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className="h-8 text-[13px]" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Cantidad ({tipoActivo?.unidad ?? "—"})</Label>
              <Input type="number" min={0} value={cantidad} onChange={(e) => setCantidad(e.target.value)} className="h-8 text-[13px]" />
            </div>
          </div>
        )}

        {tipoActivo?.requiere_soporte && (
          <div className="space-y-1.5 rounded-md border border-dashed border-border p-2.5">
            <Label className="text-xs">Soporte obligatorio</Label>
            <input
              type="file"
              accept="application/pdf,image/*"
              onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
              className="w-full text-[12px]"
            />
          </div>
        )}

        {tipoCodigo === "AT" && (
          <div className="rounded-md px-2.5 py-1.5 text-[11.5px] font-medium" style={{ backgroundColor: "#f8d7da", color: "#842029" }}>
            Accidente de trabajo: reportar el FURAT dentro de los 2 días hábiles siguientes.
          </div>
        )}

        <div className="space-y-1.5">
          <Label className="text-xs">Observaciones</Label>
          <Textarea value={observacion} onChange={(e) => setObservacion(e.target.value)} rows={2} className="text-[13px]" />
        </div>

        <Button onClick={submit} disabled={guardando || !trabajadorId || !tipoCodigo || !fechaDesde} className="w-full">
          {guardando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Reportar novedad
        </Button>
      </div>

      {/* Tabla */}
      <div className="space-y-3">
        <FilterPillGroup
          value={filtro}
          onChange={setFiltro}
          options={[
            { value: "todas", label: "Todas" },
            { value: "pendiente", label: "Pendientes" },
            { value: "aprobada", label: "Aprobadas" },
            { value: "rechazada", label: "Rechazadas" },
          ]}
        />
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-muted/50 text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2">Trabajador</th>
                <th className="px-3 py-2">Novedad</th>
                <th className="px-3 py-2">Fechas</th>
                <th className="px-3 py-2">Cant.</th>
                <th className="px-3 py-2">Estado</th>
                {esServimos && <th className="px-3 py-2 text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {filtradas.map((n) => (
                <tr key={n.id} className="border-t border-border text-[12.5px]">
                  <td className="px-3 py-2 font-medium text-foreground">{n.trabajadores?.nombre ?? "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{n.tipo}</td>
                  <td className="px-3 py-2 font-mono text-muted-foreground">
                    {n.fecha_desde}
                    {n.fecha_hasta && n.fecha_hasta !== n.fecha_desde ? ` – ${n.fecha_hasta}` : ""}
                  </td>
                  <td className="px-3 py-2 font-mono text-muted-foreground">{n.cantidad}</td>
                  <td className="px-3 py-2">
                    <StatusBadge label={n.estado} tono={ESTADO_TONO[n.estado] ?? "info"} />
                  </td>
                  {esServimos && (
                    <td className="px-3 py-2 text-right">
                      {n.estado === "pendiente" && (
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => decidir(n.id, true)}
                            className="rounded px-2 py-0.5 text-[11.5px] font-semibold"
                            style={{ backgroundColor: "#d1e7dd", color: "#0f5132" }}
                          >
                            Aprobar
                          </button>
                          <button
                            type="button"
                            onClick={() => decidir(n.id, false)}
                            className="rounded px-2 py-0.5 text-[11.5px] font-semibold"
                            style={{ backgroundColor: "#f8d7da", color: "#842029" }}
                          >
                            Rechazar
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {filtradas.length === 0 && (
                <tr>
                  <td colSpan={esServimos ? 6 : 5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No hay novedades en este filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function diasEntre(desde: string, hasta: string): number {
  const a = new Date(`${desde}T00:00:00Z`).getTime()
  const b = new Date(`${hasta}T00:00:00Z`).getTime()
  return Math.max(1, Math.round((b - a) / 86_400_000) + 1)
}
