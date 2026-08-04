"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, NotebookPen } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { reportarNovedad, getMisNovedades, getPersonalAsignado } from "@/lib/portal-cliente-actions"

const CODIGOS_NOVEDAD = ["Ausentismo injustificado", "Retardo", "Permiso remunerado", "Permiso no remunerado", "Vacaciones", "Retiro"]

export function NovedadesCliente() {
  const [personal, setPersonal] = useState<any[]>([])
  const [personalMisionId, setPersonalMisionId] = useState("")
  const [codigo, setCodigo] = useState("")
  const [tipoNovedad, setTipoNovedad] = useState<"Valor" | "Dias" | "Horas">("Dias")
  const [cantidadValor, setCantidadValor] = useState(1)
  const [fechaInicio, setFechaInicio] = useState("")
  const [fechaFin, setFechaFin] = useState("")
  const [observaciones, setObservaciones] = useState("")
  const [saving, setSaving] = useState(false)
  const [novedades, setNovedades] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const [p, n] = await Promise.all([getPersonalAsignado(), getMisNovedades()])
    setPersonal(p)
    setNovedades(n)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const submit = async () => {
    if (!personalMisionId || !codigo || !fechaInicio) {
      toast({ title: "Completa trabajador, código y fecha de inicio", variant: "destructive" })
      return
    }
    setSaving(true)
    const result = await reportarNovedad({
      personalMisionId: Number(personalMisionId),
      codigo,
      tipoNovedad,
      cantidadValor,
      fechaInicio,
      fechaFin: fechaFin || undefined,
      observaciones,
    })
    setSaving(false)
    if (result.success) {
      toast({ title: "Novedad reportada" })
      setCodigo("")
      setFechaInicio("")
      setFechaFin("")
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
            <NotebookPen className="h-5 w-5" />
            Reportar Novedad
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
              <Label>Novedad</Label>
              <Select value={codigo} onValueChange={setCodigo}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una novedad" />
                </SelectTrigger>
                <SelectContent>
                  {CODIGOS_NOVEDAD.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={tipoNovedad} onValueChange={(v) => setTipoNovedad(v as "Valor" | "Dias" | "Horas")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Dias">Días</SelectItem>
                  <SelectItem value="Horas">Horas</SelectItem>
                  <SelectItem value="Valor">Valor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cantidad / Valor</Label>
              <Input
                type="number"
                min={0}
                value={cantidadValor}
                onChange={(e) => setCantidadValor(Number.parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label>Fecha inicio</Label>
              <Input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Fecha fin</Label>
              <Input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Observaciones</Label>
            <Input value={observaciones} onChange={(e) => setObservaciones(e.target.value)} placeholder="Opcional" />
          </div>
          <Button onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Reportar novedad
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Novedades reportadas</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : novedades.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground">No hay novedades reportadas</p>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trabajador</TableHead>
                    <TableHead>Novedad</TableHead>
                    <TableHead>Cantidad/Valor</TableHead>
                    <TableHead>Fechas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {novedades.map((n) => (
                    <TableRow key={n.id}>
                      <TableCell>
                        {n.personal_mision?.nombre} — {n.personal_mision?.identificacion}
                      </TableCell>
                      <TableCell>{n.codigo}</TableCell>
                      <TableCell>{n.cantidad_valor ?? "-"}</TableCell>
                      <TableCell>
                        {n.fecha_inicio}
                        {n.fecha_fin ? ` a ${n.fecha_fin}` : ""}
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
