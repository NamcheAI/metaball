import { nodeKey } from './geometry'
import type { Edge, Node, Preset, Size } from './types'

const node = (r: number, c: number, size: Size = 'L'): Node => ({ r, c, size })
const edge = (a: [number, number], b: [number, number]): Edge => [
  nodeKey(a[0], a[1]),
  nodeKey(b[0], b[1]),
]

export const PRESETS: Preset[] = [
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
  { id: 'empty', label: 'Empty', nodes: [], edges: [] },
]
