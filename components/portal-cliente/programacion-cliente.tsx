"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, CalendarClock } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { programarTurno, getMisTurnos, getPersonalAsignado } from "@/lib/portal-cliente-actions"

export function ProgramacionCliente() {
  const [personal, setPersonal] = useState<any[]>([])
  const [personalMisionId, setPersonalMisionId] = useState("")
  const [fecha, setFecha] = useState("")
  const [horaInicio, setHoraInicio] = useState("")
  const [horaFin, setHoraFin] = useState("")
  const [puesto, setPuesto] = useState("")
  const [saving, setSaving] = useState(false)
  const [turnos, setTurnos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const [p, t] = await Promise.all([getPersonalAsignado(), getMisTurnos()])
    setPersonal(p)
    setTurnos(t)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const submit = async () => {
    if (!personalMisionId || !fecha || !horaInicio || !horaFin) {
      toast({ title: "Completa trabajador, fecha y horario", variant: "destructive" })
      return
    }
    setSaving(true)
    const result = await programarTurno({
      personalMisionId: Number(personalMisionId),
      fecha,
      horaInicio,
      horaFin,
      puesto,
    })
    setSaving(false)
    if (result.success) {
      toast({ title: "Turno programado" })
      setFecha("")
      setHoraInicio("")
      setHoraFin("")
      setPuesto("")
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
            <CalendarClock className="h-5 w-5" />
            Programar Turno
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {personal.length === 0 && !loading ? (
            <p className="text-sm text-muted-foreground">
              Todavía no tienes personal en misión asignado. Primero debes solicitarlo en la sección Solicitudes.
            </p>
          ) : (
            <>
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
                  <Label>Puesto</Label>
                  <Input value={puesto} onChange={(e) => setPuesto(e.target.value)} placeholder="Opcional" />
                </div>
                <div className="space-y-2">
                  <Label>Fecha</Label>
                  <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Hora inicio</Label>
                  <Input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Hora fin</Label>
                  <Input type="time" value={horaFin} onChange={(e) => setHoraFin(e.target.value)} />
                </div>
              </div>
              <Button onClick={submit} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Programar turno
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Turnos programados</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : turnos.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground">No hay turnos programados</p>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trabajador</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Horario</TableHead>
                    <TableHead>Puesto</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {turnos.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>
                        {t.personal_mision?.nombre} — {t.personal_mision?.identificacion}
                      </TableCell>
                      <TableCell>{t.fecha}</TableCell>
                      <TableCell>
                        {t.hora_inicio} - {t.hora_fin}
                      </TableCell>
                      <TableCell>{t.puesto ?? "-"}</TableCell>
                      <TableCell className="capitalize">{t.estado}</TableCell>
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
