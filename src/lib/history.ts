import { HISTORY_LIMIT } from './constants'
import { cloneDocument } from './document'
import type { EditorDoc } from './types'

export interface History {
  past: EditorDoc[]
  present: EditorDoc
  future: EditorDoc[]
}

export const initHistory = (present: EditorDoc): History => ({
  past: [],
  present,
  future: [],
})

/** Commit a new present, pushing the old one onto the undo stack. */
export function pushHistory(history: History, next: EditorDoc): History {
  const past = [...history.past, cloneDocument(history.present)]
  if (past.length > HISTORY_LIMIT) past.shift()
  return { past, present: cloneDocument(next), future: [] }
}

/** Replace the present without adding an undo step (for coalesced drags). */
export function replacePresent(history: History, next: EditorDoc): History {
  return { ...history, present: cloneDocument(next) }
}

export function undo(history: History): History {
  if (!history.past.length) return history
  const previous = history.past[history.past.length - 1]
  return {
    past: history.past.slice(0, -1),
    present: cloneDocument(previous),
    future: [cloneDocument(history.present), ...history.future],
  }
}

export function redo(history: History): History {
  if (!history.future.length) return history
  const next = history.future[0]
  return {
    past: [...history.past, cloneDocument(history.present)],
    present: cloneDocument(next),
    future: history.future.slice(1),
  }
}

export const canUndo = (history: History) => history.past.length > 0
export const canRedo = (history: History) => history.future.length > 0
