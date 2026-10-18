import type { ExplorerDataset, ExplorerNode, ExplorerRelation } from '../../types/explorer'
import type { ExplorerScene } from './explorerModel'
import { personPriority } from './explorerModel.ts'

export type ReadingMode = 'reading' | 'all'

// A readable projection of evidenced data. Hidden edges remain available in the full view.
export function readingScene(
  dataset: ExplorerDataset,
  scene: ExplorerScene,
  selectedId: string,
  rootId: string | null,
  mode: ReadingMode,
  limit = 6,
): ExplorerScene {
  if (mode === 'all') return scene
  const byId = new Map(scene.nodes.map((node) => [node.id, node]))
  const selected = byId.get(selectedId)
  const isRoot = !selected || dataset.metadata.peopleExploration?.rootKinds.includes(selected.kind)
  const unique = (edges: ExplorerRelation[]) => {
    const seen = new Set<string>()
    return edges.filter((edge) => {
      const key = [edge.source, edge.target].sort().join(':')
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }
  if (!isRoot) {
    const adjacent = scene.relations.filter(
      (edge) =>
        (edge.source === selectedId || edge.target === selectedId) &&
        edge.source !== rootId &&
        edge.target !== rootId,
    )
    const neighborIds = new Set(
      adjacent.map((edge) => (edge.source === selectedId ? edge.target : edge.source)),
    )
    const order = (node: ExplorerNode) =>
      node.kind === 'person' ? 0 : node.kind === 'event' ? 1 : node.kind === 'work' ? 2 : 3
    const neighbors = scene.nodes
      .filter((node) => neighborIds.has(node.id))
      .sort(
        (a, b) =>
          order(a) - order(b) || personPriority(selected!, a.id) - personPriority(selected!, b.id),
      )
      .slice(0, limit)
    const ids = new Set([selectedId, ...neighbors.map((node) => node.id)])
    const edges = unique(adjacent.filter((edge) => ids.has(edge.source) && ids.has(edge.target)))
    const left: ExplorerNode[] = [],
      right: ExplorerNode[] = []
    for (const node of neighbors) {
      const edge = edges.find((item) => item.source === node.id || item.target === node.id)!
      const directed = dataset.metadata.relationTypes.find(
        (type) => type.id === edge.type,
      )?.directed
      const preferred = directed && edge.target === selectedId ? left : right
      const column =
        preferred.length >= 3 || preferred.length > Math.min(left.length, right.length) + 1
          ? preferred === left
            ? right
            : left
          : preferred
      column.push(node)
    }
    const positions = new Map([[selectedId, { x: 0, y: 0 }]])
    for (const [column, x] of [
      [left, -400],
      [right, 400],
    ] as const)
      column.forEach((node, index) =>
        positions.set(node.id, {
          x,
          y: (index - (column.length - 1) / 2) * 210,
        }),
      )
    return {
      nodes: [selected!, ...neighbors].map((node) => ({
        ...node,
        position: positions.get(node.id)!,
      })),
      relations: edges,
    }
  }
  // Read the main connection once; cycles and parallel explanations are in the full view.
  const parents = new Map(scene.nodes.map((node) => [node.id, node.id]))
  const find = (id: string): string => {
    const parent = parents.get(id)!
    if (parent === id) return id
    const ancestor = find(parent)
    parents.set(id, ancestor)
    return ancestor
  }
  const priority = (edge: ExplorerRelation) =>
    ['sequence', 'replacement', 'continuation', 'division'].includes(edge.type)
      ? 0
      : byId.get(edge.source)?.kind === 'person' && byId.get(edge.target)?.kind === 'person'
        ? 1
        : edge.source === rootId || edge.target === rootId
          ? 4
          : edge.type === 'influence'
            ? 2
            : 3
  const relations = unique([...scene.relations].sort((a, b) => priority(a) - priority(b))).filter(
    (edge) => {
      const source = find(edge.source),
        target = find(edge.target)
      if (source === target) return false
      parents.set(source, target)
      return true
    },
  )
  return { nodes: scene.nodes, relations }
}
