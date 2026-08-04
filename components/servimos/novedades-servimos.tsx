"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, NotebookPen, RefreshCw, FileText } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useAuth } from "@/components/auth-provider"
import { getNovedades, getIncapacidadesPendientes, aprobarIncapacidad, rechazarIncapacidad } from "@/lib/servimos-actions"

// Dos fuentes en una sola vista: novedades que reporta directamente la
// empresa cliente (ausentismos, permisos, etc.) e incapacidades subidas
// por el trabajador desde el portal-trabajador — estas últimas requieren
// revisión MANUAL en esta fase (LIPbot llega en la fase siguiente); al
// aprobarlas se genera automáticamente la novedad correspondiente.
export function NovedadesServimos() {
  const { user } = useAuth()
  const [novedades, setNovedades] = useState<any[]>([])
  const [incapacidades, setIncapacidades] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [procesando, setProcesando] = useState<number | null>(null)

  const load = async () => {
    setLoading(true)
    const [n, i] = await Promise.all([getNovedades(), getIncapacidadesPendientes()])
    setNovedades(n)
    setIncapacidades(i)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const aprobar = async (id: number) => {
    if (!user) return
    setProcesando(id)
    const result = await aprobarIncapacidad(id, user.id)
    setProcesando(null)
    if (result.success) {
      toast({ title: "Incapacidad aprobada", description: "Se generó la novedad de nómina correspondiente" })
      load()
    } else {
      toast({ title: "Error", description: result.message, variant: "destructive" })
    }
  }

  const rechazar = async (id: number) => {
    if (!user) return
    setProcesando(id)
    const result = await rechazarIncapacidad(id, user.id)
    setProcesando(null)
    if (result.success) {
      toast({ title: "Incapacidad rechazada" })
      load()
    } else {
      toast({ title: "Error", description: result.message, variant: "destructive" })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Cargando novedades...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Incapacidades pendientes de revisión
            </CardTitle>
            <Button variant="outline" size="sm" onClick={load}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Actualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {incapacidades.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">No hay incapacidades pendientes de revisión</div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trabajador</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Fechas</TableHead>
                    <TableHead>Soporte</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incapacidades.map((inc) => (
                    <TableRow key={inc.id}>
                      <TableCell>
                        {inc.personal_mision?.nombre} — {inc.personal_mision?.identificacion}
                      </TableCell>
                      <TableCell>{inc.tipo ?? "-"}</TableCell>
                      <TableCell>
                        {inc.fecha_inicio} a {inc.fecha_fin}
                      </TableCell>
                      <TableCell>
                        {inc.archivo_url ? (
                          <a href={inc.archivo_url} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                            Ver soporte
                          </a>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" disabled={procesando === inc.id} onClick={() => aprobar(inc.id)}>
                            {procesando === inc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aprobar"}
                          </Button>
                          <Button size="sm" variant="destructive" disabled={procesando === inc.id} onClick={() => rechazar(inc.id)}>
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <NotebookPen className="h-5 w-5" />
            Novedades reportadas por el cliente
          </CardTitle>
        </CardHeader>
        <CardContent>
          {novedades.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">No hay novedades reportadas todavía</div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trabajador</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Cantidad/Valor</TableHead>
                    <TableHead>Fechas</TableHead>
                    <TableHead>Origen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {novedades.map((n) => (
                    <TableRow key={n.id}>
                      <TableCell>
                        {n.personal_mision?.nombre} — {n.personal_mision?.identificacion}
                      </TableCell>
                      <TableCell>{n.empresas_cliente?.nombre ?? "-"}</TableCell>
                      <TableCell>{n.codigo}</TableCell>
                      <TableCell>{n.tipo_novedad}</TableCell>
                      <TableCell>{n.cantidad_valor ?? "-"}</TableCell>
                      <TableCell>
                        {n.fecha_inicio}
                        {n.fecha_fin ? ` a ${n.fecha_fin}` : ""}
                      </TableCell>
                      <TableCell>
                        <Badge variant={n.origen === "incapacidad" ? "secondary" : "outline"}>{n.origen}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
