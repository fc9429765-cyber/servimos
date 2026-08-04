"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Gauge, RefreshCw, Send, Percent, CalendarClock, Clock, FileText, Banknote } from "lucide-react"
import { getCuadroControlServimos } from "@/lib/servimos-actions"

function Kpi({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-primary/10 p-2">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold leading-none">{value}</p>
            <p className="text-sm text-muted-foreground mt-1">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// KPIs básicos de la operación de Personal en Misión. El motor legal de
// nómina completo (fase siguiente) reemplazará "valorNominaReciente" por
// una cifra oficial; hoy es la suma de nomina_generada (cálculo básico).
export function CuadroControlServimos() {
  const [kpis, setKpis] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const data = await getCuadroControlServimos()
    setKpis(data)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5" />
            Cuadro de Control Servimos
          </CardTitle>
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Actualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading || !kpis ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Cargando indicadores...
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Kpi icon={Send} label="Solicitudes pendientes" value={kpis.solicitudesPendientes} />
            <Kpi
              icon={Percent}
              label="Cumplimiento de SLA"
              value={kpis.pctCumplimientoSla === null ? "Sin datos" : `${kpis.pctCumplimientoSla}%`}
            />
            <Kpi icon={CalendarClock} label="Turnos programados hoy" value={kpis.turnosProgramadosHoy} />
            <Kpi icon={Clock} label="Horas extra pendientes" value={kpis.horasExtraPendientes} />
            <Kpi icon={FileText} label="Incapacidades pendientes" value={kpis.incapacidadesPendientes} />
            <Kpi
              icon={Banknote}
              label="Nómina básica reciente"
              value={kpis.valorNominaReciente.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 })}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
