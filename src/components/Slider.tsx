import { clamp } from '../lib/geometry'

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
  /** Called when a drag/keyboard adjustment ends, to close an undo group. */
  onCommit?: () => void
  disabled?: boolean
}

export function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  onCommit,
  disabled = false,
}: SliderProps) {
  const decimals = step < 1 ? 2 : 0
  return (
    <div className="slider-row">
      <span>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerUp={onCommit}
        onPointerCancel={onCommit}
        onKeyUp={(e) => {
          if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) onCommit?.()
        }}
      />
      <input
        type="number"
        className="num"
        min={min}
        max={max}
        step={step}
        value={Number(value.toFixed(decimals))}
        disabled={disabled}
        onChange={(e) => {
          const next = Number(e.target.value)
          if (!Number.isNaN(next)) onChange(clamp(next, min, max))
        }}
        onBlur={onCommit}
      />
    </div>
  )
}
