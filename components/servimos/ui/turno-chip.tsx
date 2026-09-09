// Colores fijos de turno (sistema "Portal Servimos" — no dependen de
// GROUP_TINT ni de --primary, son parte del vocabulario visual propio del
// módulo de Programación).
export const TURNO_COLORS: Record<string, { bg: string; fg: string }> = {
  T1: { bg: "#5bc0de", fg: "#0b3f4d" },
  T2: { bg: "#12706b", fg: "#ffffff" },
  T3: { bg: "#0e3b3b", fg: "#21d4c8" },
  AD: { bg: "#a8dbe8", fg: "#0b3f4d" },
  D: { bg: "#f1f3f5", fg: "#adb5bd" },
}

interface TurnoChipProps {
  codigo: string
  label?: string
  size?: "sm" | "md"
}

export function TurnoChip({ codigo, label, size = "md" }: TurnoChipProps) {
  const c = TURNO_COLORS[codigo] ?? TURNO_COLORS.D
  return (
    <span
      className={
        size === "sm"
          ? "inline-flex items-center justify-center rounded px-1.5 py-0.5 font-mono text-[10px] font-bold"
          : "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-bold"
      }
      style={{ backgroundColor: c.bg, color: c.fg }}
    >
      {label ?? codigo}
    </span>
  )
}
