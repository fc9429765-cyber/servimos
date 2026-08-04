"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Clock } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { usePortalCliente } from "@/components/portal-cliente/portal-cliente-provider"
import { asignarHorasExtra, getMisHorasExtra, getPersonalAsignado, aprobarHorasExtraCliente } from "@/lib/portal-cliente-actions"

function estadoBadge(r: any) {
  if (r.estado === "aprobada") return <Badge className="bg-green-500 hover:bg-green-600">Aprobada</Badge>
  if (r.estado === "rechazada") return <Badge variant="destructive">Rechazada</Badge>
  return <Badge variant="outline">Pendiente Jefe de Área</Badge>
}

export function HorasExtraCliente() {
  const { contexto } = usePortalCliente()
  const puedeAsignar = contexto?.rol === "supervisor" || contexto?.rol === "jefe_area"
  const puedeAprobar = contexto?.rol === "jefe_area"

  const [personal, setPersonal] = useState<any[]>([])
  const [personalMisionId, setPersonalMisionId] = useState("")
  const [fecha, setFecha] = useState("")
  const [horas, setHoras] = useState(1)
  const [motivo, setMotivo] = useState("")
  const [saving, setSaving] = useState(false)
  const [registros, setRegistros] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [procesando, setProcesando] = useState<number | null>(null)

  const load = async () => {
    setLoading(true)
    const [p, r] = await Promise.all([getPersonalAsignado(), getMisHorasExtra()])
    setPersonal(p)
    setRegistros(r)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const submit = async () => {
    if (!personalMisionId || !fecha || !horas) {
      toast({ title: "Completa trabajador, fecha y horas", variant: "destructive" })
      return
    }
    setSaving(true)
    const result = await asignarHorasExtra({ personalMisionId: Number(personalMisionId), fecha, horas, motivo })
    setSaving(false)
    if (result.success) {
      toast({ title: "Hora extra asignada", description: "Queda pendiente de aprobación del Jefe de Área" })
      setFecha("")
      setHoras(1)
      setMotivo("")
      load()
    } else {
      toast({ title: "Error", description: result.message, variant: "destructive" })
    }
  }

  const aprobar = async (id: number) => {
    setProcesando(id)
    const result = await aprobarHorasExtraCliente(id)
    setProcesando(null)
    if (result.success) {
      toast({ title: "Hora extra aprobada" })
      load()
    } else {
      toast({ title: "Error", description: result.message, variant: "destructive" })
    }
  }

  return (
    <div className="space-y-4">
      {puedeAsignar && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Asignar Hora Extra
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Trabajador</Label>
                <Select value={personalMisionId} onValueChange={setPersonalMisionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un trabajador" />
                  </SelectTrigger>
                  <SelectContent>
                    {personal.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.nombre} — {p.identificacion}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fecha</Label>
                <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Horas</Label>
                <Input
                  type="number"
                  min={0.5}
                  step={0.5}
                  value={horas}
                  onChange={(e) => setHoras(Number.parseFloat(e.target.value) || 1)}
                />
              </div>
              <div className="space-y-2">
                <Label>Motivo</Label>
                <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Opcional" />
              </div>
            </div>
            <Button onClick={submit} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Asignar hora extra
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Horas extra registradas</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : registros.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground">No hay horas extra registradas</p>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trabajador</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Horas</TableHead>
                    <TableHead>Estado</TableHead>
                    {puedeAprobar && <TableHead>Acciones</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {registros.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        {r.personal_mision?.nombre} — {r.personal_mision?.identificacion}
                      </TableCell>
                      <TableCell>{r.fecha}</TableCell>
                      <TableCell>{r.horas}</TableCell>
                      <TableCell>{estadoBadge(r)}</TableCell>
                      {puedeAprobar && (
                        <TableCell>
                          {r.estado === "pendiente_jefe_area" ? (
                            <Button size="sm" disabled={procesando === r.id} onClick={() => aprobar(r.id)}>
                              {procesando === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aprobar"}
                            </Button>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                      )}
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
