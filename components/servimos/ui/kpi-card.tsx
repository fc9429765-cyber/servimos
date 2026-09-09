// Tarjeta KPI del sistema "Portal Servimos": micro-etiqueta + cifra grande
// (tabular-nums) + pista opcional. Patrón reusado en ~7 pantallas del
// prototipo del paquete (Personal, Ausentismo, Bandeja, Cruce, etc.).

interface KpiCardProps {
  label: string
  value: string | number
  hint?: string
  color?: string
}

export function KpiCard({ label, value, hint, color = "#5bc0de" }: KpiCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="text-[10.5px] font-bold uppercase tracking-[0.11em] text-muted-foreground">{label}</div>
      <div
        className="mt-1.5 font-mono text-[30px] font-extrabold leading-none tabular-nums tracking-tight"
        style={{ color }}
      >
        {value}
      </div>
      {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
