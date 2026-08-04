"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, FileText, Upload } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { usePortalTrabajador } from "@/components/portal-trabajador/portal-trabajador-provider"
import { getMisIncapacidades } from "@/lib/portal-trabajador-actions"

function estadoBadge(estado: string) {
  if (estado === "aprobada") return <Badge className="bg-green-500 hover:bg-green-600">Aprobada</Badge>
  if (estado === "rechazada") return <Badge variant="destructive">Rechazada</Badge>
  return <Badge variant="outline">En revisión</Badge>
}

export function IncapacidadesTrabajador() {
  const { trabajador } = usePortalTrabajador()
  const [tipo, setTipo] = useState<"EG" | "AT">("EG")
  const [fechaInicio, setFechaInicio] = useState("")
  const [fechaFin, setFechaFin] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [incapacidades, setIncapacidades] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    if (!trabajador) return
    setLoading(true)
    setIncapacidades(await getMisIncapacidades(trabajador.id))
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trabajador?.id])

  const submit = async () => {
    if (!trabajador) return
    if (!fechaInicio || !fechaFin || !file) {
      toast({ title: "Adjunta el soporte y completa las fechas", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      const formData = new FormData()
      formData.append("personal_mision_id", String(trabajador.id))
      formData.append("tipo", tipo)
      formData.append("fecha_inicio", fechaInicio)
      formData.append("fecha_fin", fechaFin)
      formData.append("file", file)

      const res = await fetch("/api/portal-trabajador/incapacidades/upload", { method: "POST", body: formData })
      const data = await res.json()

      if (!res.ok) {
        toast({ title: "Error", description: data.error ?? "No se pudo cargar la incapacidad", variant: "destructive" })
      } else {
        toast({ title: "Incapacidad enviada", description: "Queda pendiente de revisión de Servimos" })
        setFechaInicio("")
        setFechaFin("")
        setFile(null)
        load()
      }
    } catch (error) {
      console.error("[portal-trabajador] Error subiendo incapacidad:", error)
      toast({ title: "Error", description: "No se pudo cargar la incapacidad", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Subir Incapacidad
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as "EG" | "AT")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EG">Enfermedad General</SelectItem>
                  <SelectItem value="AT">Accidente de Trabajo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Soporte (PDF o imagen)</Label>
              <Input type="file" accept=".pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
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
          <Button onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Enviar incapacidad
          </Button>
          <p className="text-xs text-muted-foreground">
            Un colaborador de Servimos revisará tu incapacidad. Al aprobarse, se genera automáticamente la novedad en nómina.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Mis incapacidades
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : incapacidades.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground">No has subido incapacidades todavía</p>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Fechas</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Soporte</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incapacidades.map((inc) => (
                    <TableRow key={inc.id}>
                      <TableCell>{inc.tipo ?? "-"}</TableCell>
                      <TableCell>
                        {inc.fecha_inicio} a {inc.fecha_fin}
                      </TableCell>
                      <TableCell>{estadoBadge(inc.estado)}</TableCell>
                      <TableCell>
                        {inc.archivo_url ? (
                          <a href={inc.archivo_url} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                            Ver
                          </a>
                        ) : (
                          "-"
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
    </div>
  )
}
