"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, Send, RefreshCw } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useAuth } from "@/components/auth-provider"
import {
  getSolicitudesPersonal,
  getPersonalMisionActivo,
  aprobarYAsignarSolicitud,
  rechazarSolicitud,
} from "@/lib/servimos-actions"

function slaBadge(solicitud: any) {
  if (solicitud.estado === "entregada") {
    return solicitud.cumplio_sla ? (
      <Badge className="bg-green-500 hover:bg-green-600">SLA cumplido</Badge>
    ) : (
      <Badge variant="destructive">SLA incumplido</Badge>
    )
  }
  if (solicitud.estado === "rechazada") return <Badge variant="secondary">Rechazada</Badge>
  const vencida = solicitud.fecha_limite_sla && new Date(solicitud.fecha_limite_sla) < new Date()
  return vencida ? (
    <Badge variant="destructive">SLA vencido</Badge>
  ) : (
    <Badge variant="outline">En plazo</Badge>
  )
}

export function SolicitudesPersonal() {
  const { user } = useAuth()
  const [solicitudes, setSolicitudes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [asignarDialog, setAsignarDialog] = useState<any | null>(null)
  const [personalDisponible, setPersonalDisponible] = useState<any[]>([])
  const [seleccionados, setSeleccionados] = useState<number[]>([])
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    const data = await getSolicitudesPersonal()
    setSolicitudes(data)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const abrirAsignar = async (solicitud: any) => {
    setAsignarDialog(solicitud)
    setSeleccionados([])
    const personal = await getPersonalMisionActivo(solicitud.empresa_cliente_id)
    setPersonalDisponible(personal)
  }

  const confirmarAsignacion = async () => {
    if (!asignarDialog || seleccionados.length === 0 || !user) return
    setSaving(true)
    const result = await aprobarYAsignarSolicitud(asignarDialog.id, seleccionados, user.id)
    setSaving(false)
    if (result.success) {
      toast({
        title: "Solicitud entregada",
        description: result.cumplioSla === false ? "Se entregó fuera del SLA acordado" : "Se entregó dentro del SLA acordado",
      })
      setAsignarDialog(null)
      load()
    } else {
      toast({ title: "Error", description: result.message, variant: "destructive" })
    }
  }

  const rechazar = async (solicitud: any) => {
    if (!user) return
    const result = await rechazarSolicitud(solicitud.id, user.id)
    if (result.success) {
      toast({ title: "Solicitud rechazada" })
      load()
    } else {
      toast({ title: "Error", description: result.message, variant: "destructive" })
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Solicitudes de Personal en Misión
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
              Cargando solicitudes...
            </div>
          ) : solicitudes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No hay solicitudes registradas</div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Puesto</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>Fecha requerida</TableHead>
                    <TableHead>Límite SLA</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {solicitudes.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>{s.empresas_cliente?.nombre ?? "-"}</TableCell>
                      <TableCell>{s.puesto}</TableCell>
                      <TableCell>{s.cantidad}</TableCell>
                      <TableCell>{s.fecha_requerida}</TableCell>
                      <TableCell>{s.fecha_limite_sla ? new Date(s.fecha_limite_sla).toLocaleString() : "-"}</TableCell>
                      <TableCell>{slaBadge(s)}</TableCell>
                      <TableCell>
                        {s.estado === "pendiente" ? (
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => abrirAsignar(s)}>
                              Entregar
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => rechazar(s)}>
                              Rechazar
                            </Button>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground capitalize">{s.estado}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!asignarDialog} onOpenChange={(open) => !open && setAsignarDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Entregar personal para: {asignarDialog?.puesto}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {personalDisponible.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay personal activo disponible para esta empresa.</p>
            ) : (
              personalDisponible.map((p) => (
                <label key={p.id} className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer">
                  <Checkbox
                    checked={seleccionados.includes(p.id)}
                    onCheckedChange={(checked) =>
                      setSeleccionados((prev) => (checked ? [...prev, p.id] : prev.filter((id) => id !== p.id)))
                    }
                  />
                  <span>
                    {p.nombre} — {p.identificacion} {p.cargo ? `(${p.cargo})` : ""}
                  </span>
                </label>
              ))
            )}
          </div>
          <DialogFooter>
            <Button onClick={confirmarAsignacion} disabled={saving || seleccionados.length === 0}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Confirmar entrega
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
