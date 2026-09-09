interface ProgressBarProps {
  pct: number // 0-100
  color?: string
  trackColor?: string
}

export function ProgressBar({ pct, color = "#5bc0de", trackColor = "#eef1f6" }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, pct))
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: trackColor }}>
      <div
        className="h-full rounded-full transition-[width] duration-300"
        style={{ width: `${clamped}%`, backgroundColor: color }}
      />
    </div>
  )
}
