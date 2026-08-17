import { nodeKey } from './geometry.js'
import { BRANDMARK_PATH } from './brandmark.js'
import type { Edge, Node, Preset, Size } from './types.js'

const node = (r: number, c: number, size: Size = 'L'): Node => ({ r, c, size })
const edge = (a: [number, number], b: [number, number]): Edge => [
  nodeKey(a[0], a[1]),
  nodeKey(b[0], b[1]),
]

export const PRESETS: Preset[] = [
  {
    id: 'brandmark',
    label: 'Brandmark',
    nodes: [
      { ...node(0, 0), radius: 89.55, offsetX: 25.55, offsetY: 25.55 },
      { ...node(0, 4), radius: 89.55, offsetX: -25.55, offsetY: 25.55 },
      { ...node(2, 2), radius: 89.55 },
      { ...node(4, 0), radius: 89.55, offsetX: 25.55, offsetY: -25.55 },
      { ...node(4, 4), radius: 89.55, offsetX: -25.55, offsetY: -25.55 },
    ],
    edges: [
      edge([0, 0], [0, 4]),
      edge([0, 4], [4, 4]),
      edge([4, 0], [4, 4]),
      edge([2, 2], [4, 0]),
    ],
    fullGrid: true,
    referencePath: BRANDMARK_PATH,
    tubeFactor: 0.22,
    gooStd: 9,
    gooThreshold: 22,
  },
  {
    id: 'r',
    label: 'R',
    nodes: [node(1, 1), node(1, 3), node(2, 2), node(3, 1), node(3, 3)],
    edges: [
      edge([1, 1], [1, 3]),
      edge([1, 1], [3, 1]),
      edge([1, 3], [2, 2]),
      edge([2, 2], [3, 3]),
    ],
    tubeFactor: 0.55,
    gooStd: 9,
    gooThreshold: 22,
  },
  {
    id: 'loop',
    label: 'Loop',
    nodes: [node(1, 1), node(1, 3), node(2, 2), node(3, 1), node(3, 3)],
    edges: [
      edge([1, 1], [1, 3]),
      edge([1, 3], [3, 3]),
      edge([3, 1], [3, 3]),
      edge([2, 2], [3, 1]),
    ],
    tubeFactor: 0.55,
    gooStd: 9,
    gooThreshold: 22,
  },
  {
    id: 'sizes',
    label: 'Sizes',
    nodes: [node(1, 1), node(1, 3), node(2, 2), node(3, 1), node(3, 3)],
    edges: [],
  },
  {
    id: 'trio',
    label: 'Trio',
    nodes: [node(1, 1), node(1, 3), node(3, 2)],
    edges: [edge([1, 1], [1, 3]), edge([1, 3], [3, 2]), edge([1, 1], [3, 2])],
  },
  {
    id: 'quad',
    label: 'Quad',
    nodes: [node(1, 1), node(1, 3), node(3, 1), node(3, 3)],
    edges: [
      edge([1, 1], [1, 3]),
      edge([1, 1], [3, 1]),
      edge([1, 3], [3, 3]),
      edge([3, 1], [3, 3]),
    ],
  },
  {
    id: 'node',
    label: 'Node',
    nodes: [node(2, 2, 'XL')],
    edges: [],
  },
  { id: 'empty', label: 'Empty', nodes: [], edges: [] },
]

/** Presets offered as buttons in the editor; the rest are library-only. */
export const EDITOR_PRESET_IDS = ['brandmark', 'r', 'loop', 'sizes', 'empty']

export const presetById = (id: string): Preset | undefined =>
  PRESETS.find((preset) => preset.id === id)
