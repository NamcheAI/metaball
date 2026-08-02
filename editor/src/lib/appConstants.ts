import type { Size } from '@namche/metaball'

/** Number keys 1–4 set the selected node's size. */
export const KEY_TO_SIZE: Record<string, Size> = { '1': 'S', '2': 'M', '3': 'L', '4': 'XL' }

export const HISTORY_LIMIT = 50
export const STORAGE_KEY = 'metaball-editor-document'
export const EXPORT_PREVIEW_DEBOUNCE = 180
