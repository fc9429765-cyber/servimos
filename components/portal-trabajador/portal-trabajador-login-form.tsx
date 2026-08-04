"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Loader2, User } from "lucide-react"
import { loginPortalTrabajador } from "@/lib/portal-trabajador-actions"
import { usePortalTrabajador } from "@/components/portal-trabajador/portal-trabajador-provider"

export function PortalTrabajadorLoginForm() {
  const router = useRouter()
  const { login } = usePortalTrabajador()
  const [identificacion, setIdentificacion] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const result = await loginPortalTrabajador(identificacion, password)
    setLoading(false)
    if (!result.success || !result.trabajador) {
      setError(result.error ?? "No se pudo iniciar sesión.")
      return
    }
    login(result.trabajador)
    router.push("/portal-trabajador/incapacidades")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Portal del Trabajador
        </CardTitle>
        <CardDescription>Servimos · Ingresa con tu documento de identidad</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="identificacion">Número de documento</Label>
            <Input id="identificacion" value={identificacion} onChange={(e) => setIdentificacion(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña (tu mismo número de documento)</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Ingresar
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
