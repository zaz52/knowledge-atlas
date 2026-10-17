import type { ExplorerDataset, ExplorerNode, ExplorerRelation } from '../../types/explorer'

export interface ExplorerFilters {
  relationTypes: string[]
  includeLiterary: boolean
}

export interface ExplorerScene {
  nodes: ExplorerNode[]
  relations: ExplorerRelation[]
}

export function initialNodeIds(dataset: ExplorerDataset): string[] {
  return [...new Set(dataset.metadata.initialNodeIds)]
}

export function defaultFilters(dataset: ExplorerDataset): ExplorerFilters {
  return {
    relationTypes: dataset.metadata.relationTypes.map((type) => type.id),
    includeLiterary: true,
  }
}

export function allowedRelation(relation: ExplorerRelation, filters: ExplorerFilters): boolean {
  return (
    filters.relationTypes.includes(relation.type) &&
    (filters.includeLiterary || relation.basis !== 'literary')
  )
}

export function visibleScene(
  dataset: ExplorerDataset,
  revealedIds: string[],
  filters: ExplorerFilters,
): ExplorerScene {
  const revealed = new Set(revealedIds)
  const nodes = dataset.nodes.filter(
    (node) => revealed.has(node.id) && (filters.includeLiterary || node.basis !== 'literary'),
  )
  const ids = new Set(nodes.map((node) => node.id))
  return {
    nodes,
    relations: dataset.relations.filter(
      (relation) =>
        ids.has(relation.source) && ids.has(relation.target) && allowedRelation(relation, filters),
    ),
  }
}

export function expandableNodes(
  dataset: ExplorerDataset,
  selectedId: string,
  revealedIds: string[],
  filters: ExplorerFilters,
): ExplorerNode[] {
  const revealed = new Set(revealedIds)
  const candidates = new Set(
    dataset.relations
      .filter(
        (relation) =>
          allowedRelation(relation, filters) &&
          (relation.source === selectedId || relation.target === selectedId),
      )
      .map((relation) => (relation.source === selectedId ? relation.target : relation.source)),
  )
  return dataset.nodes.filter(
    (node) =>
      candidates.has(node.id) &&
      !revealed.has(node.id) &&
      (filters.includeLiterary || node.basis !== 'literary'),
  )
}

export function expandAssociations(
  dataset: ExplorerDataset,
  selectedId: string,
  revealedIds: string[],
  filters: ExplorerFilters,
) {
  const newIds = expandableNodes(dataset, selectedId, revealedIds, filters).map((node) => node.id)
  return { revealedIds: [...new Set([...revealedIds, ...newIds])], newIds }
}

export function revealNode(dataset: ExplorerDataset, revealedIds: string[], id: string): string[] {
  return dataset.nodes.some((node) => node.id === id)
    ? [...new Set([...revealedIds, id])]
    : revealedIds
}

export function explorationRoot(
  dataset: ExplorerDataset,
  selectedId: string,
  currentRoot: string | null,
): string | null {
  const config = dataset.metadata.peopleExploration
  if (!config) return null
  const roots = dataset.nodes.filter((node) => config.rootKinds.includes(node.kind))
  if (roots.some((node) => node.id === selectedId)) return selectedId
  if (dataset.metadata.story) {
    const direct = roots.filter((root) =>
      [...(root.relatedPersonIds ?? []), ...root.relatedEventIds].includes(selectedId),
    )
    if (direct.length) return direct.find((root) => root.id === currentRoot)?.id ?? direct[0].id
  }
  let frontier = new Set([selectedId])
  const visited = new Set(frontier)
  for (let depth = 0; depth < 3; depth++) {
    const matches = roots.filter((root) => root.relatedPersonIds?.some((id) => frontier.has(id)))
    if (matches.length) return matches.find((root) => root.id === currentRoot)?.id ?? matches[0].id
    const next = new Set<string>()
    for (const edge of dataset.relations) {
      if (frontier.has(edge.source) && !visited.has(edge.target)) next.add(edge.target)
      if (frontier.has(edge.target) && !visited.has(edge.source)) next.add(edge.source)
    }
    for (const id of next) visited.add(id)
    frontier = next
  }
  return null
}

export function revealSelection(
  dataset: ExplorerDataset,
  revealedIds: string[],
  selectedId: string,
  filters: ExplorerFilters,
  rootId: string | null,
): string[] {
  const revealed = revealNode(dataset, revealedIds, selectedId)
  if (!dataset.metadata.peopleExploration || !rootId) return revealed
  const root = dataset.nodes.find((node) => node.id === rootId)!
  const people = new Set(root.relatedPersonIds ?? [])
  const limit = dataset.metadata.peopleExploration.initialPeopleLimit ?? Infinity
  const neighbors = expandableNodes(dataset, rootId, [], filters)
    .filter(
      (node) =>
        people.has(node.id) ||
        (dataset.metadata.peopleExploration?.includeRootEvents &&
          root.relatedEventIds.includes(node.id)) ||
        root.relatedBackgroundIds?.includes(node.id),
    )
    .filter(
      (node, index, candidates) =>
        !people.has(node.id) ||
        candidates.slice(0, index).filter((item) => people.has(item.id)).length < limit,
    )
    .map((node) => node.id)
  const selected = dataset.nodes.find((node) => node.id === selectedId)!
  const details = ['person', 'work', 'event', 'concept'].includes(selected.kind)
    ? expandableNodes(dataset, selectedId, [], filters)
        .filter((node) => ['person', 'work', 'event', 'concept'].includes(node.kind))
        .map((node) => node.id)
    : []
  return [...new Set([...revealed, rootId, ...neighbors, ...details])]
}

export function peopleScene(
  dataset: ExplorerDataset,
  scene: ExplorerScene,
  rootId: string,
  selectedId: string,
): ExplorerScene {
  const config = dataset.metadata.peopleExploration!
  const candidates = scene.nodes.filter(
    (node) => node.id === rootId || !config.rootKinds.includes(node.kind),
  )
  const ids = new Set(candidates.map((node) => node.id))
  const included = new Set([rootId, selectedId].filter((id) => ids.has(id)))
  for (let pass = 0; pass < candidates.length; pass++) {
    const before = included.size
    for (const edge of scene.relations) {
      if (!ids.has(edge.source) || !ids.has(edge.target)) continue
      if (included.has(edge.source)) included.add(edge.target)
      if (included.has(edge.target)) included.add(edge.source)
    }
    if (before === included.size) break
  }
  const nodes = candidates.filter((node) => included.has(node.id))
  const relations = scene.relations.filter(
    (edge) => included.has(edge.source) && included.has(edge.target),
  )
  const root = dataset.nodes.find((node) => node.id === rootId)!
  if (dataset.metadata.story) {
    const people = nodes.filter((node) => node.kind === 'person')
    const events = nodes
      .filter((node) => node.kind === 'event')
      .sort(
        (a, b) =>
          (a.timeRange?.start ?? 999) - (b.timeRange?.start ?? 999) ||
          (a.timeRange?.end ?? 999) - (b.timeRange?.end ?? 999),
      )
    const positions = new Map<string, { x: number; y: number }>([[rootId, { x: 0, y: -260 }]])
    events.forEach((node, index) => {
      const row = Math.floor(index / 3)
      const column = row % 2 ? 2 - (index % 3) : index % 3
      positions.set(node.id, { x: (column - 1) * 440, y: row * 480 })
    })
    people.forEach((node, index) =>
      positions.set(node.id, {
        x: ((index % 3) - 1) * 440,
        y: Math.floor(index / 3) * 480 + 240,
      }),
    )
    let extra = 0
    for (const node of nodes)
      if (!positions.has(node.id)) {
        positions.set(node.id, {
          x: ((extra % 3) - 1) * 440,
          y:
            (Math.max(Math.ceil(events.length / 3), Math.ceil(people.length / 3)) +
              1 +
              Math.floor(extra / 3)) *
            480,
        })
        extra++
      }
    return {
      nodes: nodes.map((node) => ({ ...node, position: positions.get(node.id)! })),
      relations,
    }
  }
  const mainIds = [
    ...new Set([
      ...(root.relatedPersonIds ?? []).filter((id) => nodes.some((node) => node.id === id)),
      ...nodes.filter((node) => node.kind === 'person').map((node) => node.id),
    ]),
  ]
  const positions = new Map<string, { x: number; y: number }>([[rootId, { x: 0, y: 0 }]])
  mainIds.forEach((id, index) => {
    let ring = 0
    let slot = index
    while (slot >= 8 + ring * 8) {
      slot -= 8 + ring * 8
      ring++
    }
    const capacity = mainIds.length <= 8 ? Math.max(3, mainIds.length) : 8 + ring * 8
    const angle = -Math.PI / 2 + (slot * Math.PI * 2) / capacity
    const radius = mainIds.length <= 8 ? 370 : 410 + ring * 320
    positions.set(id, { x: radius * Math.cos(angle), y: radius * Math.sin(angle) })
  })
  const satellites = new Map<string, ExplorerNode[]>()
  const boxes: { x: number; y: number; width: number; height: number }[] = [...positions]
    .filter(([id]) => nodes.some((node) => node.id === id))
    .map(([id, position]) => ({
      ...position,
      width: id === rootId ? 180 : 140,
      height: id === rootId ? 210 : 170,
    }))
  for (const node of nodes) {
    if (positions.has(node.id)) continue
    const parent =
      mainIds.find((id) =>
        relations.some(
          (edge) =>
            (edge.source === id && edge.target === node.id) ||
            (edge.target === id && edge.source === node.id),
        ),
      ) ?? rootId
    satellites.set(parent, [...(satellites.get(parent) ?? []), node])
  }
  for (const [parentId, children] of satellites) {
    const parent = positions.get(parentId)!
    const angle = Math.atan2(parent.y, parent.x)
    children.forEach((node, index) => {
      const spread = (index - (children.length - 1) / 2) * 0.7
      const size = node.kind === 'work' ? { width: 250, height: 150 } : { width: 240, height: 185 }
      let position = { x: 0, y: 0 }
      for (let attempt = 0; attempt < 24; attempt++) {
        const radius = 330 + attempt * 65
        position = {
          x: parent.x + radius * Math.cos(angle + spread),
          y: parent.y + radius * Math.sin(angle + spread),
        }
        if (
          boxes.every(
            (box) =>
              Math.abs(box.x - position.x) >= (box.width + size.width) / 2 + 24 ||
              Math.abs(box.y - position.y) >= (box.height + size.height) / 2 + 24,
          )
        )
          break
      }
      positions.set(node.id, position)
      boxes.push({ ...position, ...size })
    })
  }
  return { nodes: nodes.map((node) => ({ ...node, position: positions.get(node.id)! })), relations }
}

export function stableScenePositions(
  scene: ExplorerScene,
  previous: Map<string, { x: number; y: number }>,
  rowLayout = false,
): Map<string, { x: number; y: number }> {
  const positions = new Map(previous)
  const occupied = scene.nodes.flatMap((node) => {
    const point = positions.get(node.id)
    return point ? [point] : []
  })
  for (const node of scene.nodes) {
    if (positions.has(node.id)) continue
    let point = { ...node.position }
    let attempt = 0
    while (
      occupied.some(
        (other) => Math.abs(other.x - point.x) < 250 && Math.abs(other.y - point.y) < 210,
      )
    ) {
      attempt++
      if (rowLayout) point = { x: node.position.x, y: node.position.y + attempt * 250 }
      else {
        const ring = Math.ceil(attempt / 8)
        const angle = (((attempt - 1) % 8) * Math.PI) / 4
        point = {
          x: node.position.x + Math.cos(angle) * ring * 300,
          y: node.position.y + Math.sin(angle) * ring * 300,
        }
      }
    }
    positions.set(node.id, point)
    occupied.push(point)
  }
  return positions
}

export function searchNodes(
  dataset: ExplorerDataset,
  query: string,
  includeLiterary = true,
): ExplorerNode[] {
  const term = query.trim().toLocaleLowerCase()
  if (!term) return []
  return dataset.nodes.filter(
    (node) =>
      (includeLiterary || node.basis !== 'literary') &&
      [node.label, node.id, ...node.aliases].some((text) =>
        text.toLocaleLowerCase().includes(term),
      ),
  )
}

export function elementStates(
  scene: ExplorerScene,
  selectedId: string,
  highlight: boolean,
): Record<string, string[]> {
  const neighbors = new Set<string>([selectedId])
  const connected = scene.relations.filter(
    (relation) => relation.source === selectedId || relation.target === selectedId,
  )
  for (const relation of connected) {
    neighbors.add(relation.source)
    neighbors.add(relation.target)
  }
  const states: Record<string, string[]> = {}
  for (const node of scene.nodes)
    states[node.id] =
      node.id === selectedId
        ? ['selected']
        : highlight
          ? [neighbors.has(node.id) ? 'neighbor' : 'dim']
          : []
  for (const relation of scene.relations)
    states[relation.id] = highlight
      ? [relation.source === selectedId || relation.target === selectedId ? 'active' : 'dim']
      : []
  return states
}
