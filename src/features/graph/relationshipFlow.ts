import type { ExplorerDataset, ExplorerNode, ExplorerRelation } from '../../types/explorer'
import type { ExplorerScene } from './explorerModel'

export function isIndexRelation(edge: ExplorerRelation, rootId: string) {
  return edge.source === rootId || edge.target === rootId
}

export function relationInChapter(
  dataset: ExplorerDataset,
  edge: ExplorerRelation,
  rootId: string | null,
) {
  const root = dataset.nodes.find((node) => node.id === rootId)
  if (!dataset.metadata.story || !root?.timeRange) return true
  if (
    dataset.nodes.find((node) => node.id === edge.source)?.kind !== 'person' ||
    dataset.nodes.find((node) => node.id === edge.target)?.kind !== 'person'
  )
    return true
  if (/约|前后|异说|不详/.test(edge.period)) return true
  const years = edge.period.match(/\d{3,4}/g)?.map(Number)
  const range =
    edge.timeRange ??
    (years?.length ? { start: Math.min(...years), end: Math.max(...years) } : null)
  return !range || (range.start <= root.timeRange.end && range.end >= root.timeRange.start)
}

export function chronologicalEvents(dataset: ExplorerDataset): ExplorerNode[] {
  const events = dataset.nodes.filter(
    (node) => node.kind === 'event' && node.basis === 'documented' && node.timeRange,
  )
  const byId = new Map(events.map((node) => [node.id, node]))
  const indegree = new Map(events.map((node) => [node.id, 0]))
  const next = new Map(events.map((node) => [node.id, new Set<string>()]))
  for (const edge of dataset.relations) {
    if (edge.type !== 'sequence' || !byId.has(edge.source) || !byId.has(edge.target)) continue
    if (next.get(edge.source)!.has(edge.target)) continue
    next.get(edge.source)!.add(edge.target)
    indegree.set(edge.target, indegree.get(edge.target)! + 1)
  }
  const compare = (a: ExplorerNode, b: ExplorerNode) =>
    a.timeRange!.start - b.timeRange!.start || a.timeRange!.end - b.timeRange!.end
  const available = events.filter((node) => indegree.get(node.id) === 0)
  const ordered: ExplorerNode[] = []
  while (available.length) {
    available.sort(compare)
    const node = available.shift()!
    ordered.push(node)
    for (const id of next.get(node.id)!) {
      indegree.set(id, indegree.get(id)! - 1)
      if (indegree.get(id) === 0) available.push(byId.get(id)!)
    }
  }
  // Dataset validation reports cycles; a partially edited dataset still renders deterministically.
  return [...ordered, ...events.filter((node) => !ordered.includes(node)).sort(compare)]
}

export function relationshipFlow(
  dataset: ExplorerDataset,
  scene: ExplorerScene,
  rootId: string,
  selectedId = rootId,
): ExplorerScene {
  const config = dataset.metadata.peopleExploration!
  const nodes = scene.nodes.filter(
    (node) => node.id === rootId || !config.rootKinds.includes(node.kind),
  )
  const ids = new Set(nodes.map((node) => node.id))
  const personReading = dataset.nodes.find((node) => node.id === selectedId)?.kind === 'person'
  const edges = scene.relations.filter((edge) => {
    if (!ids.has(edge.source) || !ids.has(edge.target)) return false
    return personReading || relationInChapter(dataset, edge, rootId)
  })
  const mainEdges = edges.filter((edge) => !isIndexRelation(edge, rootId))
  const adjacency = new Map(
    nodes.filter((node) => node.id !== rootId).map((node) => [node.id, new Set<string>()]),
  )
  for (const edge of mainEdges) {
    adjacency.get(edge.source)?.add(edge.target)
    adjacency.get(edge.target)?.add(edge.source)
  }
  const components: string[][] = []
  const visited = new Set<string>()
  for (const node of nodes) {
    if (node.id === rootId || visited.has(node.id)) continue
    const queue = [node.id]
    visited.add(node.id)
    for (let index = 0; index < queue.length; index++)
      for (const id of adjacency.get(queue[index]) ?? [])
        if (!visited.has(id)) {
          visited.add(id)
          queue.push(id)
        }
    components.push(queue)
  }
  // An era index connects each evidenced component at a single entry point.
  const indexEdges = components.flatMap((component) => {
    const candidates = edges.filter(
      (edge) =>
        isIndexRelation(edge, rootId) &&
        component.includes(edge.source === rootId ? edge.target : edge.source),
    )
    const order = (edge: ExplorerRelation) => {
      const node = nodes.find(
        (node) => node.id === (edge.source === rootId ? edge.target : edge.source),
      )!
      return node.kind === 'person' ? 0 : node.kind === 'event' ? 1 : 2
    }
    return candidates.sort((a, b) => order(a) - order(b)).slice(0, 1)
  })
  const positions = new Map<string, { x: number; y: number }>([[rootId, { x: -340, y: 0 }]])
  const byId = new Map(nodes.map((node) => [node.id, node]))
  if (dataset.metadata.story) {
    const events = chronologicalEvents(dataset).filter((node) => ids.has(node.id))
    const columnFor = (node: ExplorerNode) => events.findIndex((item) => item.id === node.id)
    events.forEach((node) => positions.set(node.id, { x: columnFor(node) * 480, y: 0 }))
    const slots = new Map<number, number>()
    const place = (node: ExplorerNode, column: number) => {
      const slot = slots.get(column) ?? 0
      slots.set(column, slot + 1)
      const sign = slot % 2 ? 1 : -1
      positions.set(node.id, { x: column * 480, y: sign * (280 + Math.floor(slot / 2) * 270) })
    }
    const people = nodes.filter((node) => node.kind === 'person')
    for (const node of people) {
      const eventIndex = events.findIndex((event) =>
        mainEdges.some(
          (edge) =>
            (edge.source === node.id && edge.target === event.id) ||
            (edge.target === node.id && edge.source === event.id),
        ),
      )
      if (eventIndex >= 0) place(node, columnFor(events[eventIndex]))
    }
    for (const node of people.filter((node) => !positions.has(node.id))) {
      const parent = mainEdges
        .flatMap((edge) =>
          edge.source === node.id ? [edge.target] : edge.target === node.id ? [edge.source] : [],
        )
        .find((id) => byId.get(id)?.kind === 'person' && positions.has(id))
      place(
        node,
        parent
          ? Math.round(positions.get(parent)!.x / 480)
          : people.indexOf(node) % Math.max(events.length, 3),
      )
    }
    for (const node of nodes.filter((node) => !positions.has(node.id))) {
      const parent = mainEdges
        .flatMap((edge) =>
          edge.source === node.id ? [edge.target] : edge.target === node.id ? [edge.source] : [],
        )
        .find((id) => positions.has(id))
      place(node, parent ? Math.round(positions.get(parent)!.x / 480) : 0)
    }
  } else {
    const root = dataset.nodes.find((node) => node.id === rootId)!
    let previousBottom: number | null = null
    for (const component of components) {
      const anchor = root.relatedPersonIds?.find((id) => component.includes(id)) ?? component[0]
      const levels = new Map<string, number>([[anchor, 0]])
      const queue = [anchor]
      for (let index = 0; index < queue.length; index++)
        for (const neighbor of adjacency.get(queue[index]) ?? [])
          if (!levels.has(neighbor)) {
            levels.set(neighbor, levels.get(queue[index])! + 1)
            queue.push(neighbor)
          }
      const columns = new Map<number, string[]>()
      for (const id of queue) {
        const level = levels.get(id)!
        columns.set(level, [...(columns.get(level) ?? []), id])
      }
      const halfHeight =
        (Math.max(...[...columns.values()].map((column) => column.length)) - 1) * 105
      let row: number = previousBottom === null ? 0 : previousBottom + halfHeight + 120
      const occupied = [...positions.values()]
      while (
        [...columns].some(([level, column]) =>
          column.some((_, index) => {
            const x = level * 340,
              y = row + index * 210 - (column.length - 1) * 105
            return occupied.some(
              (point) => Math.abs(point.x - x) < 250 && Math.abs(point.y - y) < 210,
            )
          }),
        )
      )
        row += 30
      for (const [level, column] of columns)
        column.forEach((id, index) =>
          positions.set(id, {
            x: level * 340,
            y: row + index * 210 - (column.length - 1) * 105,
          }),
        )
      previousBottom = row + halfHeight
    }
  }
  return {
    nodes: nodes.map((node) => ({ ...node, position: positions.get(node.id)! })),
    relations: [...mainEdges, ...indexEdges],
  }
}
