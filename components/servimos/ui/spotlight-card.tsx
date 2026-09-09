import type { ReactNode } from "react"

// Tarjeta oscura teal "destacada" — el mismo patrón que el prototipo del
// paquete repite 8 veces (hero de Inicio, "Ahorro de trabajo" en
// Programación, totales de Prefactura/Cruce, heroes de PILA/Recobro…).
export function SpotlightCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-white/10 p-4 text-[#eaf6f4] ${className}`}
      style={{
        background:
          "radial-gradient(120% 100% at 100% 0%, rgba(33,212,200,.22), transparent 60%), linear-gradient(135deg,#0a2e2e,#0e3b3b)",
      }}
    >
      {children}
    </div>
  )
}
