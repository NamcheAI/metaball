import { useState } from 'react'
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

/** Keys that change a range input's value and should close the undo group. */
const RANGE_ADJUST_KEYS = [
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'PageUp',
  'PageDown',
  'Home',
  'End',
]

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
  // The number field edits a local draft so partially typed values ("4" on
  // the way to "45") aren't clamped mid-keystroke; the clamped value is
  // applied on blur or Enter.
  const [draft, setDraft] = useState<string | null>(null)

  const applyDraft = () => {
    if (draft !== null) {
      const next = Number(draft)
      if (draft.trim() !== '' && !Number.isNaN(next)) onChange(clamp(next, min, max))
      setDraft(null)
    }
    onCommit?.()
  }

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
        onBlur={onCommit}
        onKeyUp={(e) => {
          if (RANGE_ADJUST_KEYS.includes(e.key)) onCommit?.()
        }}
      />
      <input
        type="number"
        className="num"
        min={min}
        max={max}
        step={step}
        value={draft ?? Number(value.toFixed(decimals))}
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={applyDraft}
        onKeyDown={(e) => {
          if (e.key === 'Enter') applyDraft()
        }}
      />
    </div>
  )
}
