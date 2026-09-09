"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, CheckCircle2 } from "lucide-react"
import { usePortalCliente } from "@/components/portal-cliente/portal-cliente-provider"
import { getFirmaQuincena, firmarQuincena } from "@/lib/portal-cliente-mas-actions"
import { getAprobacionesDiaCount } from "@/lib/portal-cliente-programacion-actions"
import { SpotlightCard } from "@/components/servimos/ui/spotlight-card"

const DOW = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"]

function quincenaActual() {
  const hoy = new Date()
  const anio = hoy.getFullYear()
  const mes = hoy.getMonth()
  if (hoy.getDate() <= 15) return { ini: new Date(anio, mes, 1), fin: new Date(anio, mes, 15) }
  const ultimoDia = new Date(anio, mes + 1, 0).getDate()
  return { ini: new Date(anio, mes, 16), fin: new Date(anio, mes, ultimoDia) }
}

function iso(d: Date) {
  return d.toISOString().slice(0, 10)
}

export function CierreQuincenalCliente() {
  const { contexto, userId } = usePortalCliente()
  const [loading, setLoading] = useState(true)
  const [diasAprobados, setDiasAprobados] = useState(0)
  const [firma, setFirma] = useState<any>(null)
  const [firmando, setFirmando] = useState(false)

  const { ini, fin } = useMemo(() => quincenaActual(), [])
  const fechaIni = iso(ini)
  const fechaFin = iso(fin)
  const dias = useMemo(() => {
    const arr: { fecha: string; label: string; numero: number }[] = []
    const cursor = new Date(ini)
    while (cursor <= fin) {
      arr.push({ fecha: iso(cursor), label: DOW[cursor.getDay()], numero: cursor.getDate() })
      cursor.setDate(cursor.getDate() + 1)
    }
    return arr
  }, [ini, fin])

  const cargar = async () => {
    if (!contexto) return
    setLoading(true)
    const [aprob, f] = await Promise.all([
      getAprobacionesDiaCount(contexto.cliente_id, fechaIni, fechaFin),
      getFirmaQuincena(contexto.cliente_id, fechaIni),
    ])
    setDiasAprobados(aprob)
    setFirma(f)
    setLoading(false)
  }

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contexto?.cliente_id])

  const puedeFirmar = diasAprobados === dias.length && contexto?.rol === "gerente_usuaria" && !firma

  const firmar = async () => {
    if (!contexto || !userId) return
    setFirmando(true)
    const r = await firmarQuincena({ clienteId: contexto.cliente_id, periodoIni: fechaIni, periodoFin: fechaFin, firmadaPor: userId })
    setFirmando(false)
    if (r.success) cargar()
  }

  if (loading || !contexto) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando…
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="mb-3 text-[15px] font-bold text-foreground">Aprobación diaria</h3>
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-8">
          {dias.map((d) => (
            <div key={d.fecha} className="rounded-lg border border-border p-2 text-center">
              <div className="text-[10px] font-semibold uppercase text-muted-foreground">{d.label}</div>
              <div className="font-mono text-[14px] font-bold text-foreground">{d.numero}</div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11.5px] text-muted-foreground">
          {diasAprobados} de {dias.length} días con la programación aprobada. La aprobación día a día se hace desde
          Programación al confirmar cada turno.
        </p>
      </div>

      <div className="space-y-3">
        <SpotlightCard>
          <div className="text-[11px] font-bold uppercase tracking-wide text-[#a8ccc8]">Segunda firma</div>
          {firma ? (
            <>
              <div className="mt-1 flex items-center gap-2 text-[14px] font-bold">
                <CheckCircle2 className="h-4 w-4" style={{ color: "#21d4c8" }} /> Quincena firmada
              </div>
              <p className="mt-1 break-all font-mono text-[10px] text-[#7fb0aa]">{firma.hash_sha256}</p>
            </>
          ) : (
            <>
              <p className="mt-1 text-[12.5px] text-[#cfe9e6]">
                {contexto.rol === "gerente_usuaria"
                  ? diasAprobados === dias.length
                    ? "Todos los días están aprobados — puedes firmar la quincena."
                    : "Aprueba todos los días antes de firmar."
                  : "Solo el gerente de la empresa usuaria puede firmar la quincena."}
              </p>
              <button
                onClick={firmar}
                disabled={!puedeFirmar || firmando}
                className="mt-3 w-full rounded-lg px-3 py-2 text-[12.5px] font-bold disabled:opacity-40"
                style={{ backgroundColor: "#21d4c8", color: "#0b3f4d" }}
              >
                {firmando ? "Firmando…" : "Firmar quincena"}
              </button>
            </>
          )}
        </SpotlightCard>
      </div>
    </div>
  )
}
