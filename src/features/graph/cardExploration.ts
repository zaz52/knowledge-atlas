import type { ExplorerDataset } from '../../types/explorer'
import { allowedRelation, visibleScene } from './explorerModel.ts'
import type { ExplorerFilters, ExplorerScene } from './explorerModel.ts'

export type CardExpandMode = 'cumulative' | 'accordion'
export interface CardExploration {
  rootId: string
  selectedId: string
  anchors: string[]
  expanded: Record<string, string[]>
  /** Research focus: person id the current local view is centered on, null = panorama. */
  focusId: string | null
  focusDepth: number
}
export const CARD_BATCH = 3
export function initialCardExploration(dataset: ExplorerDataset, rootId?: string): CardExploration {
  const root =
    rootId ?? dataset.metadata.story?.chapters[0].nodeId ?? dataset.metadata.initialNodeIds[0]
  return { rootId: root, selectedId: root, anchors: [], expanded: {}, focusId: null, focusDepth: 0 }
}

export function cardNeighbors(dataset: ExplorerDataset, id: string, filters: ExplorerFilters) {
  const neighbors = new Set(
    dataset.relations
      .filter(
        (edge) => allowedRelation(edge, filters) && (edge.source === id || edge.target === id),
      )
      .map((edge) => (edge.source === id ? edge.target : edge.source)),
  )
  const node = dataset.nodes.find((node) => node.id === id)!
  const root = dataset.metadata.peopleExploration?.rootKinds.includes(node.kind)
  const priority = root
    ? dataset.metadata.story
      ? [
          ...node.relatedEventIds,
          ...(node.relatedPersonIds ?? []),
          ...(node.relatedBackgroundIds ?? []),
        ]
      : [
          ...(node.relatedPersonIds ?? []),
          ...node.relatedEventIds,
          ...(node.relatedBackgroundIds ?? []),
        ]
    : [...(node.relatedPersonIds ?? []), ...(node.relatedWorkIds ?? []), ...node.relatedEventIds]
  return dataset.nodes
    .filter((n) => neighbors.has(n.id) && (filters.includeLiterary || n.basis !== 'literary'))
    .sort((a, b) => {
      const rank = (n: typeof a) => {
        const index = priority.indexOf(n.id)
        if (index >= 0) return index
        return (
          priority.length +
          (n.kind === 'person' ? 0 : n.kind === 'event' ? 1 : n.kind === 'concept' ? 2 : 3)
        )
      }
      return rank(a) - rank(b)
    })
    .map((n) => n.id)
}

export function cardVisibleIds(state: CardExploration): string[] {
  const ids = new Set([state.rootId, ...state.anchors])
  const queue = [...ids]
  for (let i = 0; i < queue.length; i++)
    for (const id of state.expanded[queue[i]] ?? [])
      if (!ids.has(id)) {
        ids.add(id)
        queue.push(id)
      }
  return [...ids]
}
function prune(state: CardExploration): CardExploration {
  const ids = new Set(cardVisibleIds(state))
  return {
    ...state,
    expanded: Object.fromEntries(Object.entries(state.expanded).filter(([id]) => ids.has(id))),
  }
}
export function collapseCard(state: CardExploration, id: string): CardExploration {
  const expanded = { ...state.expanded }
  delete expanded[id]
  return prune({ ...state, expanded, selectedId: id })
}

export function expandCard(
  dataset: ExplorerDataset,
  state: CardExploration,
  id: string,
  filters: ExplorerFilters,
  mode: CardExpandMode,
  limit = CARD_BATCH,
): CardExploration {
  let next = { ...state, selectedId: id, expanded: { ...state.expanded } }
  if (mode === 'accordion') {
    const parents = Object.entries(next.expanded).filter(([, children]) => children.includes(id))
    for (const [, siblings] of parents)
      for (const sibling of siblings)
        if (sibling !== id && sibling !== state.rootId) delete next.expanded[sibling]
    next = prune(next)
  }
  const visible = new Set(cardVisibleIds(next))
  const neighbors = cardNeighbors(dataset, id, filters)
  const additions = neighbors.filter((n) => !visible.has(n)).slice(0, limit)
  // Ownership, rather than knowledge-edge direction, determines branch lifetime.
  // A shared child survives while another expanded branch still owns it.
  next.expanded[id] = [
    ...new Set([
      ...(next.expanded[id] ?? []),
      ...neighbors.filter((n) => visible.has(n) && n !== state.rootId),
      ...additions,
    ]),
  ]
  return next
}
export function toggleCard(
  dataset: ExplorerDataset,
  state: CardExploration,
  id: string,
  filters: ExplorerFilters,
  mode: CardExpandMode,
) {
  if (state.expanded[id]?.length) return collapseCard(state, id)
  const visible = new Set(cardVisibleIds(state))
  return cardNeighbors(dataset, id, filters).some((n) => !visible.has(n))
    ? expandCard(dataset, state, id, filters, mode)
    : state.expanded[id]
      ? collapseCard(state, id)
      : { ...state, selectedId: id }
}
export function expandCardLayer(
  dataset: ExplorerDataset,
  state: CardExploration,
  filters: ExplorerFilters,
) {
  return {
    ...cardVisibleIds(state).reduce(
      (next, id) => expandCard(dataset, next, id, filters, 'cumulative'),
      state,
    ),
    selectedId: state.selectedId,
  }
}
export function expandAllCards(
  dataset: ExplorerDataset,
  state: CardExploration,
  filters: ExplorerFilters,
) {
  const nodes = dataset.nodes.filter((n) => filters.includeLiterary || n.basis !== 'literary')
  const next = {
    ...state,
    expanded: Object.fromEntries(nodes.map((n) => [n.id, cardNeighbors(dataset, n.id, filters)])),
  }
  for (const node of nodes)
    if (!cardVisibleIds(next).includes(node.id)) next.anchors = [...next.anchors, node.id]
  return next
}

/** Person with the most visible relations: the default research focus of a topic. */
export function defaultFocusPerson(dataset: ExplorerDataset, filters: ExplorerFilters): string {
  let best = dataset.metadata.initialSelectionId
  let bestCount = -1
  for (const node of dataset.nodes) {
    if (node.kind !== 'person') continue
    if (!filters.includeLiterary && node.basis === 'literary') continue
    const count = dataset.relations.filter(
      (edge) =>
        allowedRelation(edge, filters) && (edge.source === node.id || edge.target === node.id),
    ).length
    if (count > bestCount) {
      bestCount = count
      best = node.id
    }
  }
  return best
}

/**
 * Research local view: the focus person plus a bounded BFS neighborhood.
 * Level 1 keeps every direct neighbor; deeper levels are capped so the view
 * stays a working set instead of the whole map. Panorama remains one tap away.
 */
export function focusRegion(
  dataset: ExplorerDataset,
  filters: ExplorerFilters,
  focusId: string,
  depth = 1,
  levelCap = 48,
): CardExploration {
  const base = initialCardExploration(dataset, focusId)
  const seen = new Set([focusId])
  const expanded: Record<string, string[]> = {}
  let frontier = [focusId]
  for (let d = 0; d < depth && frontier.length; d++) {
    const candidates: { parent: string; id: string }[] = []
    for (const id of frontier)
      for (const neighbor of cardNeighbors(dataset, id, filters))
        if (!seen.has(neighbor)) candidates.push({ parent: id, id: neighbor })
    const picked = d === 0 ? candidates : candidates.slice(0, levelCap)
    const nextFrontier: string[] = []
    for (const { parent, id } of picked) {
      if (seen.has(id)) continue
      seen.add(id)
      expanded[parent] = [...(expanded[parent] ?? []), id]
      nextFrontier.push(id)
    }
    frontier = nextFrontier
  }
  return { ...base, selectedId: focusId, expanded, anchors: [], focusId, focusDepth: depth }
}
export function locateCard(
  dataset: ExplorerDataset,
  state: CardExploration,
  id: string,
  filters: ExplorerFilters,
): CardExploration {
  if (cardVisibleIds(state).includes(id)) return { ...state, selectedId: id }
  const previous = new Map<string, string | null>([[state.rootId, null]])
  const queue = [state.rootId]
  for (let i = 0; i < queue.length && !previous.has(id); i++)
    for (const neighbor of cardNeighbors(dataset, queue[i], filters))
      if (!previous.has(neighbor)) {
        previous.set(neighbor, queue[i])
        queue.push(neighbor)
      }
  const path = [id]
  if (previous.has(id)) {
    let parent = previous.get(id)
    while (parent) {
      path.unshift(parent)
      parent = previous.get(parent)
    }
  }
  return { ...state, selectedId: id, anchors: [...new Set([...state.anchors, ...path])] }
}

export function cardScene(
  dataset: ExplorerDataset,
  state: CardExploration,
  filters: ExplorerFilters,
): ExplorerScene {
  const scene = visibleScene(dataset, cardVisibleIds(state), filters)
  const ids = new Set(scene.nodes.map((n) => n.id))
  const levels = new Map<string, number>([[state.rootId, 0]])
  const queue = [state.rootId]
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i]
    for (const other of state.expanded[id] ?? []) {
      if (ids.has(other) && !levels.has(other)) {
        levels.set(other, levels.get(id)! + 1)
        queue.push(other)
      }
    }
  }
  // Search paths keep real edges while branch ownership controls exploration depth.
  for (let i = 0; i < queue.length; i++)
    for (const edge of scene.relations) {
      const other =
        edge.source === queue[i] ? edge.target : edge.target === queue[i] ? edge.source : null
      if (other && !levels.has(other)) {
        levels.set(other, levels.get(queue[i])! + 1)
        queue.push(other)
      }
    }
  for (const id of ids) if (!levels.has(id)) levels.set(id, 1)
  const columns = new Map<number, string[]>()
  for (const id of queue.concat([...ids].filter((id) => !queue.includes(id)))) {
    const level = levels.get(id)!
    columns.set(level, [...(columns.get(level) ?? []), id])
  }
  const rows = new Map<string, number>()
  for (const column of columns.values())
    column.forEach((id, i) => rows.set(id, (i - (column.length - 1) / 2) * 240))
  return {
    ...scene,
    nodes: scene.nodes.map((n) => ({
      ...n,
      position: { x: rows.get(n.id)!, y: levels.get(n.id)! * 220 },
    })),
  }
}
