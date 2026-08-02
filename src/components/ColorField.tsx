interface ColorFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  onCommit?: () => void
}

export function ColorField({ label, value, onChange, onCommit }: ColorFieldProps) {
  return (
    <label className="color-row">
      <span>{label}</span>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onPointerUp={onCommit}
        onBlur={onCommit}
      />
    </label>
  )
}
