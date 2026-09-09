import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

// Sube el soporte obligatorio de una novedad (incapacidad, licencia,
// suspensión…) al bucket privado `servimos-soportes`. A diferencia del
// upload de portal-trabajador (service role, sin sesión real), aquí SÍ hay
// sesión de Supabase Auth — se usa el cliente de sesión para que la
// política de Storage (storage.foldername(name)[1] = mi_cliente()) sea la
// que de verdad decide si puede subir a esa carpeta.
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const clienteId = (formData.get("cliente_id") as string) || ""
    const trabajadorId = (formData.get("trabajador_id") as string) || ""
    const file = formData.get("file") as File | null

    if (!clienteId || !trabajadorId || !file) {
      return NextResponse.json({ error: "Faltan datos del soporte" }, { status: 400 })
    }

    const supabase = createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const safeName = file.name.replace(/[^\w.\-]+/g, "_")
    const filePath = `${clienteId}/${trabajadorId}/${Date.now()}-${safeName}`

    const { error: uploadError } = await supabase.storage.from("servimos-soportes").upload(filePath, file)
    if (uploadError) {
      console.error("[servimos] Error subiendo soporte de novedad:", uploadError)
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, path: filePath })
  } catch (error: any) {
    console.error("[servimos] Error en POST novedades/upload:", error)
    return NextResponse.json({ error: error?.message || "Error al subir el soporte" }, { status: 500 })
  }
}
