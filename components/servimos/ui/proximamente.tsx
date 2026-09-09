import type { LucideIcon } from "lucide-react"

interface ProximamenteProps {
  icon: LucideIcon
  titulo: string
  descripcion: string
}

// Placeholder honesto para pantallas del mapa del paquete que todavía no
// tienen flujo de escritura construido (fase futura) — no un componente
// roto, uno que dice claramente qué falta.
export function Proximamente({ icon: Icon, titulo, descripcion }: ProximamenteProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card py-16 text-center">
      <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl" style={{ backgroundColor: "#e7f7fb", color: "#12706b" }}>
        <Icon className="h-6 w-6" />
      </span>
      <h3 className="text-[15px] font-bold text-foreground">{titulo}</h3>
      <p className="mt-1.5 max-w-md text-[13px] text-muted-foreground">{descripcion}</p>
    </div>
  )
}
