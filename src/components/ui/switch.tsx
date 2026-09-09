export function Switch({
  checked,
  onChange,
  disabled,
}: {
  disabled?: boolean
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
        checked ? "bg-primary" : "bg-muted"
      }`}
      type="button"
      aria-label="Toggle"
      disabled={disabled}
    >
      <span
        className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  )
}
