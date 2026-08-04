import { PortalTrabajadorLoginForm } from "@/components/portal-trabajador/portal-trabajador-login-form"

export const metadata = {
  title: "Iniciar sesión | Portal del Trabajador · Servimos",
  description: "Sube tus incapacidades y consulta su estado.",
}

export default function PortalTrabajadorLoginPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <PortalTrabajadorLoginForm />
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Si tienes problemas para ingresar, comunícate con Servimos.
        </p>
      </div>
    </main>
  )
}
