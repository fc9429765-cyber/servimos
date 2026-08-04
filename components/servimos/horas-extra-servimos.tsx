"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Clock, RefreshCw } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useAuth } from "@/components/auth-provider"
import { getHorasExtra, aprobarHorasExtra, rechazarHorasExtra } from "@/lib/servimos-actions"

// El supervisor de la empresa cliente asigna la hora extra desde el
// portal-cliente (queda "pendiente_jefe_area"); aquí el staff interno de
// Servimos hace de segundo nivel de aprobación (Jefe de Área) hasta que
// ese rol se traslade también al portal-cliente.
export function HorasExtraServimos() {
  const { user } = useAuth()
  const [registros, setRegistros] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [procesando, setProcesando] = useState<number | null>(null)

  const load = async () => {
    setLoading(true)
    const data = await getHorasExtra("pendiente_jefe_area")
    setRegistros(data)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const aprobar = async (id: number) => {
    if (!user) return
    setProcesando(id)
    const result = await aprobarHorasExtra(id, user.id)
    setProcesando(null)
    if (result.success) {
      toast({ title: "Hora extra aprobada", description: "Se generó la nómina básica correspondiente" })
      load()
    } else {
      toast({ title: "Error", description: result.message, variant: "destructive" })
    }
  }

  const rechazar = async (id: number) => {
    if (!user) return
    setProcesando(id)
    const result = await rechazarHorasExtra(id, user.id)
    setProcesando(null)
    if (result.success) {
      toast({ title: "Hora extra rechazada" })
      load()
    } else {
      toast({ title: "Error", description: result.message, variant: "destructive" })
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Horas Extra en Misión — Aprobación Jefe de Área
          </CardTitle>
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Actualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Cargando horas extra...
          </div>
        ) : registros.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No hay horas extra pendientes de aprobación</div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trabajador</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Horas</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registros.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell>
                      {h.personal_mision?.nombre} — {h.personal_mision?.identificacion}
                    </TableCell>
                    <TableCell>{h.empresas_cliente?.nombre ?? "-"}</TableCell>
                    <TableCell>{h.fecha}</TableCell>
                    <TableCell>{h.horas}</TableCell>
                    <TableCell>{h.motivo ?? "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">Pendiente Jefe de Área</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" disabled={procesando === h.id} onClick={() => aprobar(h.id)}>
                          {procesando === h.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aprobar"}
                        </Button>
                        <Button size="sm" variant="destructive" disabled={procesando === h.id} onClick={() => rechazar(h.id)}>
                          Rechazar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
