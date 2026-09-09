// Badge de estado — UNA sola paleta semántica (el prototipo del paquete
// tenía dos familias inconsistentes; consolidado a la que de verdad usa la
// mayoría de las tablas, ver informe de la Fase 2).

type Tono = "success" | "warning" | "error" | "info" | "neutral"

const TONOS: Record<Tono, { bg: string; text: string }> = {
  success: { bg: "#d1e7dd", text: "#0f5132" },
  warning: { bg: "#fff3cd", text: "#664d03" },
  error: { bg: "#f8d7da", text: "#842029" },
  info: { bg: "#cff4fc", text: "#055160" },
  neutral: { bg: "#eef1f6", text: "#6c757d" },
}

interface StatusBadgeProps {
  label: string
  tono?: Tono
}

export function StatusBadge({ label, tono = "neutral" }: StatusBadgeProps) {
  const c = TONOS[tono]
  return (
    <span
      className="inline-flex items-center rounded-md px-2 py-0.5 text-[11.5px] font-semibold"
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      {label}
    </span>
  )
}
