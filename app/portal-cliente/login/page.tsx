import { PortalClienteLoginForm } from "@/components/portal-cliente/portal-cliente-login-form"

export const metadata = {
  title: "Iniciar sesión | Portal de Empresas Cliente · Servimos",
  description: "Programa personal en misión, aprueba horas extra y reporta novedades.",
}

export default function PortalClienteLoginPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <PortalClienteLoginForm />
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Si tienes problemas para ingresar, comunícate con Servimos.
        </p>
      </div>
    </main>
  )
}
