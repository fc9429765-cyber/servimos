"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, CalendarClock, RefreshCw } from "lucide-react"
import { getProgramacionTurnos } from "@/lib/servimos-actions"

// Vista interna de solo lectura: la programación de turnos la crea la
// empresa cliente desde el portal-cliente (lib/portal-cliente-actions.ts),
// que también dispara la fila básica en nomina_generada.
export function ProgramacionTurnosServimos() {
  const [fecha, setFecha] = useState("")
  const [turnos, setTurnos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = async (f?: string) => {
    setLoading(true)
    const data = await getProgramacionTurnos(f || undefined)
    setTurnos(data)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5" />
            Programación de Personal en Misión
          </CardTitle>
          <div className="flex items-end gap-2">
            <div className="flex flex-col gap-1">
              <Label htmlFor="filtro-fecha" className="text-xs">
                Filtrar por fecha
              </Label>
              <Input
                id="filtro-fecha"
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="h-9 w-[170px]"
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => load(fecha)}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Actualizar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Cargando programación...
          </div>
        ) : turnos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No hay turnos programados. Los programa la empresa cliente desde su portal.
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Trabajador</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Puesto</TableHead>
                  <TableHead>Horario</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {turnos.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>{t.fecha}</TableCell>
                    <TableCell>
                      {t.personal_mision?.nombre} — {t.personal_mision?.identificacion}
                    </TableCell>
                    <TableCell>{t.empresas_cliente?.nombre ?? "-"}</TableCell>
                    <TableCell>{t.puesto ?? "-"}</TableCell>
                    <TableCell>
                      {t.hora_inicio} - {t.hora_fin}
                    </TableCell>
                    <TableCell className="capitalize">{t.estado}</TableCell>
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
