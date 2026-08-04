"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Send } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { crearSolicitudPersonal, getMisSolicitudes } from "@/lib/portal-cliente-actions"

function estadoBadge(s: any) {
  if (s.estado === "entregada") {
    return s.cumplio_sla ? (
      <Badge className="bg-green-500 hover:bg-green-600">Entregada a tiempo</Badge>
    ) : (
      <Badge variant="destructive">Entregada fuera de plazo</Badge>
    )
  }
  if (s.estado === "rechazada") return <Badge variant="secondary">Rechazada</Badge>
  return <Badge variant="outline">Pendiente</Badge>
}

export function SolicitudesCliente() {
  const [puesto, setPuesto] = useState("")
  const [cantidad, setCantidad] = useState(1)
  const [fechaRequerida, setFechaRequerida] = useState("")
  const [observaciones, setObservaciones] = useState("")
  const [saving, setSaving] = useState(false)
  const [solicitudes, setSolicitudes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    setSolicitudes(await getMisSolicitudes())
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const submit = async () => {
    if (!puesto.trim() || !fechaRequerida) {
      toast({ title: "Completa el puesto y la fecha requerida", variant: "destructive" })
      return
    }
    setSaving(true)
    const result = await crearSolicitudPersonal({ puesto, cantidad, fechaRequerida, observaciones })
    setSaving(false)
    if (result.success) {
      toast({ title: "Solicitud enviada" })
      setPuesto("")
      setCantidad(1)
      setFechaRequerida("")
      setObservaciones("")
      load()
    } else {
      toast({ title: "Error", description: result.message, variant: "destructive" })
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Solicitar Personal en Misión
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Puesto</Label>
              <Input value={puesto} onChange={(e) => setPuesto(e.target.value)} placeholder="Ej: Auxiliar de bodega" />
            </div>
            <div className="space-y-2">
              <Label>Cantidad</Label>
              <Input type="number" min={1} value={cantidad} onChange={(e) => setCantidad(Number.parseInt(e.target.value) || 1)} />
            </div>
            <div className="space-y-2">
              <Label>Fecha requerida</Label>
              <Input type="date" value={fechaRequerida} onChange={(e) => setFechaRequerida(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Observaciones</Label>
            <Input value={observaciones} onChange={(e) => setObservaciones(e.target.value)} placeholder="Opcional" />
          </div>
          <Button onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Enviar solicitud
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mis solicitudes</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : solicitudes.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground">Todavía no has hecho solicitudes</p>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Puesto</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>Fecha requerida</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {solicitudes.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>{s.puesto}</TableCell>
                      <TableCell>{s.cantidad}</TableCell>
                      <TableCell>{s.fecha_requerida}</TableCell>
                      <TableCell>{estadoBadge(s)}</TableCell>
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
