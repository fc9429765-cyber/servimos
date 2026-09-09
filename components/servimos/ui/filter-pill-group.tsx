interface FilterPillGroupProps<T extends string> {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}

export function FilterPillGroup<T extends string>({ options, value, onChange }: FilterPillGroupProps<T>) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className="rounded-md border px-2.5 py-1 text-[12.5px] font-medium transition-colors"
            style={
              active
                ? { borderColor: "#5bc0de", backgroundColor: "#e7f7fb", color: "#0b3f4d" }
                : { borderColor: "var(--border)", backgroundColor: "transparent", color: "var(--muted-foreground)" }
            }
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
