import { readFile, writeFile } from 'node:fs/promises'

const parse = async (url) => JSON.parse(await readFile(url, 'utf8'))
const encoded = (value) => JSON.stringify(value, null, 2) + '\n'
const prefix = 'shared-three-'

export function mergeHistoricalContent(source, target, manifest) {
  const result = structuredClone(target)
  const imported = source.nodes.filter((node) => manifest.nodeKinds.includes(node.kind))
  const importedIds = new Set(imported.map((node) => node.id))
  const citation = (entry) => ({ ...entry, sourceId: prefix + entry.sourceId })
  const citeNode = (node) => {
    const copy = structuredClone(node)
    copy.citations = copy.citations.map(citation)
    for (const field of ['achievements', 'lifeEvents', 'context'])
      if (copy[field])
        copy[field] = copy[field].map((entry) => ({
          ...entry,
          citations: entry.citations.map(citation),
        }))
    return copy
  }
  for (const sourceEntry of source.sources) {
    const value = { ...sourceEntry, id: prefix + sourceEntry.id }
    const index = result.sources.findIndex((entry) => entry.id === value.id)
    if (index < 0) result.sources.push(value)
    else result.sources[index] = value
  }
  let nextPosition = result.nodes.length
  const occupied = new Set(result.nodes.map((node) => `${node.position.x},${node.position.y}`))
  for (const sourceNode of imported) {
    const index = result.nodes.findIndex((node) => node.id === sourceNode.id)
    const previous = result.nodes[index]
    let position = previous?.position
    while (!position) {
      const candidate = {
        x: 4000 + (nextPosition % 8) * 350,
        y: 1000 + Math.floor(nextPosition++ / 8) * 300,
      }
      if (!occupied.has(`${candidate.x},${candidate.y}`)) position = candidate
    }
    occupied.add(`${position.x},${position.y}`)
    const value = {
      ...citeNode(sourceNode),
      position,
      groupId: previous?.groupId ?? 'divided',
      sharedFrom: { topicId: source.metadata.id, nodeId: sourceNode.id },
      aliases: [...new Set([...sourceNode.aliases, ...(previous?.aliases ?? [])])],
      ...(sourceNode.relatedBackgroundIds || previous?.relatedBackgroundIds
        ? {
            relatedBackgroundIds: [
              ...new Set([
                ...(sourceNode.relatedBackgroundIds ?? []),
                ...(previous?.relatedBackgroundIds ?? []),
              ]),
            ],
          }
        : {}),
    }
    if (index < 0) result.nodes.push(value)
    else result.nodes[index] = value
  }
  const byType = new Map(result.metadata.relationTypes.map((type) => [type.id, type]))
  const relationKey = (edge) => {
    const endpoints = [edge.source, edge.target]
    if (!byType.get(edge.type).directed) endpoints.sort()
    return JSON.stringify([endpoints, edge.type, edge.label, edge.period, edge.basis])
  }
  for (const edge of source.relations.filter(
    (edge) => importedIds.has(edge.source) && importedIds.has(edge.target),
  )) {
    if (!byType.has(edge.type)) {
      const type = structuredClone(
        source.metadata.relationTypes.find((type) => type.id === edge.type),
      )
      result.metadata.relationTypes.push(type)
      byType.set(type.id, type)
    }
    const value = {
      ...structuredClone(edge),
      id: prefix + edge.id,
      citations: edge.citations.map(citation),
    }
    let index = result.relations.findIndex((entry) => entry.id === value.id)
    if (index < 0)
      index = result.relations.findIndex((entry) => relationKey(entry) === relationKey(value))
    if (index < 0) result.relations.push(value)
    else result.relations[index] = { ...value, id: result.relations[index].id }
  }
  for (const membership of manifest.memberships) {
    const root = result.nodes.find((node) => node.id === membership.rootId)
    if (!root) throw new Error('Missing import root: ' + membership.rootId)
    const people = membership.allPeople
      ? imported.filter((node) => node.kind === 'person').map((node) => node.id)
      : membership.personIds
    root.relatedPersonIds = [...new Set([...(root.relatedPersonIds ?? []), ...people])]
    root.relatedBackgroundIds = [
      ...new Set([...(root.relatedBackgroundIds ?? []), ...(membership.backgroundIds ?? [])]),
    ]
    for (const id of [...people, ...(membership.backgroundIds ?? [])]) {
      const node = result.nodes.find((entry) => entry.id === id)
      if (!node) throw new Error('Missing imported member: ' + id)
      const type = node.kind === 'person' ? 'figure' : 'background'
      if (
        result.relations.some(
          (edge) =>
            edge.type === type &&
            [edge.source, edge.target].includes(root.id) &&
            [edge.source, edge.target].includes(id),
        )
      )
        continue
      result.relations.push({
        id: `${prefix}member-${root.id}-${id}`,
        source: root.id,
        target: id,
        type,
        label: node.kind === 'person' ? '时代人物' : '时代背景',
        description:
          node.kind === 'person'
            ? `${node.label}与本时期的前史、统治或终结有关，实际活动时间见人物档案；人物清单属于编辑索引。`
            : `${node.label}提供理解本时期的制度、生产、迁徙或文化线索，具体适用年代与证据见该知识点。`,
        period: node.period,
        basis: node.basis,
        citations: node.citations,
      })
    }
  }
  return result
}

export async function synchronizeHistory({
  check = false,
  dataRoot = new URL('../../src/data/', import.meta.url),
} = {}) {
  const manifest = await parse(new URL('shared/history-imports.json', dataRoot))
  const load = async (id) => ({
    metadata: await parse(new URL(`topics/${id}.json`, dataRoot)),
    ...Object.fromEntries(
      await Promise.all(
        ['nodes', 'relations', 'sources'].map(async (name) => [
          name,
          await parse(new URL(`topics/${id}/${name}.json`, dataRoot)),
        ]),
      ),
    ),
  })
  const [source, target] = await Promise.all([
    load(manifest.sourceTopicId),
    load(manifest.targetTopicId),
  ])
  const merged = mergeHistoricalContent(source, target, manifest)
  let changed = 0
  for (const name of ['nodes', 'relations', 'sources']) {
    if (JSON.stringify(target[name]) === JSON.stringify(merged[name])) continue
    changed++
    if (check) throw new Error(`历史资料同步有待更新：${name}。请运行 npm run sync:history`)
    await writeFile(
      new URL(`topics/${manifest.targetTopicId}/${name}.json`, dataRoot),
      encoded(merged[name]),
    )
  }
  if (JSON.stringify(target.metadata) !== JSON.stringify(merged.metadata)) {
    changed++
    if (check) throw new Error('历史关系类型有待同步，请运行 npm run sync:history')
    await writeFile(
      new URL(`topics/${manifest.targetTopicId}.json`, dataRoot),
      encoded(merged.metadata),
    )
  }
  return { changed, people: source.nodes.filter((node) => node.kind === 'person').length }
}
