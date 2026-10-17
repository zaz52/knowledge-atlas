import assert from 'node:assert/strict'

export function validateExplorerDataset(dataset) {
  const { metadata, nodes, relations, sources } = dataset
  const check = (condition, message) =>
    assert(condition, `${metadata?.id ?? 'explorer'}: ${message}`)
  const text = (value) => typeof value === 'string' && Boolean(value.trim())
  check(
    metadata?.mode === 'explorer' && metadata.status === 'published',
    'invalid explorer metadata',
  )
  check(
    Array.isArray(nodes) && nodes.length > 0 && Array.isArray(relations) && Array.isArray(sources),
    'invalid dataset arrays',
  )
  check(
    Array.isArray(metadata.groups) &&
      Array.isArray(metadata.relationTypes) &&
      metadata.relationTypes.length > 0,
    'missing groups or relation types',
  )
  for (const key of ['scope', 'readingNote']) check(text(metadata[key]), `missing ${key}`)
  if (metadata.edgeCurveOffset !== undefined)
    check(Number.isFinite(metadata.edgeCurveOffset), 'invalid edge curve offset')
  if (metadata.viewport)
    check(
      Number.isFinite(metadata.viewport.initialZoom) &&
        metadata.viewport.initialZoom >= 0.18 &&
        metadata.viewport.initialZoom <= 2.8 &&
        typeof metadata.viewport.focusOnExpand === 'boolean',
      'invalid viewport options',
    )
  if (metadata.viewport?.minZoom !== undefined)
    check(
      Number.isFinite(metadata.viewport.minZoom) &&
        metadata.viewport.minZoom >= 0.01 &&
        metadata.viewport.minZoom <= metadata.viewport.initialZoom,
      'invalid minimum zoom',
    )
  check(
    text(metadata.basisLabels?.documented) && text(metadata.basisLabels?.literary),
    'missing evidence labels',
  )
  const unique = (items, kind) => {
    const ids = new Set()
    for (const item of items) {
      check(
        text(item.id) && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.id) && !ids.has(item.id),
        `duplicate or invalid ${kind} id: ${item.id}`,
      )
      ids.add(item.id)
    }
    return ids
  }
  const groupIds = unique(metadata.groups, 'group')
  const typeIds = unique(metadata.relationTypes, 'relation type')
  const nodeIds = unique(nodes, 'node')
  const edgeIds = unique(relations, 'relation')
  const sourceIds = unique(sources, 'source')
  for (const id of edgeIds) check(!nodeIds.has(id), `node/relation id collision: ${id}`)
  for (const group of metadata.groups)
    check(
      text(group.label) &&
        /^#[0-9a-f]{6}$/i.test(group.color) &&
        /^#[0-9a-f]{6}$/i.test(group.fill),
      'invalid group presentation',
    )
  for (const type of metadata.relationTypes)
    check(
      text(type.label) &&
        text(type.description) &&
        /^#[0-9a-f]{6}$/i.test(type.color) &&
        typeof type.directed === 'boolean' &&
        typeof type.dashed === 'boolean',
      'invalid relation definition',
    )
  for (const source of sources) {
    check(
      text(source.title) && text(source.author) && text(source.description),
      `invalid source ${source.id}`,
    )
    check(['primary', 'literature', 'reference'].includes(source.kind), 'unknown source kind')
    let url
    try {
      url = new URL(source.url)
    } catch {
      check(false, `invalid source URL ${source.id}`)
    }
    check(url.protocol === 'https:' && Boolean(url.hostname), 'source URL must use HTTPS')
  }
  const citationsValid = (item) => {
    check(['documented', 'literary'].includes(item.basis), `invalid evidence basis: ${item.id}`)
    check(
      Array.isArray(item.citations) && item.citations.length > 0,
      `missing citations: ${item.id}`,
    )
    for (const citation of item.citations)
      check(
        sourceIds.has(citation.sourceId) && text(citation.locator) && text(citation.note),
        `invalid citation: ${item.id}`,
      )
    const kinds = item.citations.map(
      (citation) => sources.find((source) => source.id === citation.sourceId).kind,
    )
    check(
      item.basis === 'literary'
        ? kinds.includes('literature')
        : kinds.some((kind) => kind === 'primary' || kind === 'reference'),
      `evidence/source mismatch: ${item.id}`,
    )
  }
  const positions = new Set()
  const rangeValid = (range) =>
    range &&
    Number.isInteger(range.start) &&
    Number.isInteger(range.end) &&
    range.start <= range.end
  for (const node of nodes) {
    check(
      ['person', 'faction', 'event', 'concept', 'polity', 'period', 'work'].includes(node.kind),
      `unknown node kind: ${node.id}`,
    )
    for (const key of ['label', 'identity', 'description', 'period'])
      check(text(node[key]), `missing ${key}: ${node.id}`)
    check(Array.isArray(node.aliases) && node.aliases.every(text), `invalid aliases: ${node.id}`)
    check(!node.groupId || groupIds.has(node.groupId), `unknown group: ${node.id}`)
    if (node.facts)
      check(
        Array.isArray(node.facts) &&
          node.facts.every((fact) => text(fact.label) && text(fact.value)) &&
          new Set(node.facts.map((fact) => fact.label)).size === node.facts.length,
        `invalid facts: ${node.id}`,
      )
    if (node.timeRange) check(rangeValid(node.timeRange), `invalid time range: ${node.id}`)
    if (node.relatedPersonIds)
      check(
        Array.isArray(node.relatedPersonIds) &&
          node.relatedPersonIds.every((id) =>
            nodes.some((person) => person.id === id && person.kind === 'person'),
          ),
        `invalid related people: ${node.id}`,
      )
    if (node.relatedWorkIds) {
      check(
        Array.isArray(node.relatedWorkIds) &&
          new Set(node.relatedWorkIds).size === node.relatedWorkIds.length &&
          node.relatedWorkIds.every(
            (id) =>
              nodes.some((work) => work.id === id && work.kind === 'work') &&
              relations.some(
                (edge) =>
                  (edge.source === node.id && edge.target === id) ||
                  (edge.source === id && edge.target === node.id),
              ),
          ),
        `invalid related works: ${node.id}`,
      )
    }
    for (const field of ['achievements', 'lifeEvents', 'context']) {
      if (node[field] === undefined) continue
      check(Array.isArray(node[field]) && node[field].length > 0, `invalid ${field}: ${node.id}`)
      for (const entry of node[field]) {
        check(
          text(entry.title) &&
            text(entry.description) &&
            (field !== 'lifeEvents' || text(entry.date)),
          `invalid biography entry: ${node.id}`,
        )
        citationsValid({ ...entry, id: node.id + ':' + field, basis: node.basis })
      }
    }
    check(
      Number.isFinite(node.position?.x) && Number.isFinite(node.position?.y),
      `invalid position: ${node.id}`,
    )
    const positionKey = `${node.position.x},${node.position.y}`
    check(!positions.has(positionKey), `overlapping initial node positions: ${node.id}`)
    positions.add(positionKey)
    check(
      Array.isArray(node.relatedEventIds) &&
        node.relatedEventIds.every(
          (id) =>
            nodeIds.has(id) && nodes.find((candidate) => candidate.id === id).kind === 'event',
        ),
      `invalid related events: ${node.id}`,
    )
    citationsValid(node)
  }
  const relationKeys = new Set()
  const limit = metadata.peopleExploration?.initialPeopleLimit
  if (limit !== undefined)
    check(Number.isInteger(limit) && limit > 0, 'invalid initial people limit')
  for (const node of nodes)
    if (node.relatedBackgroundIds !== undefined) {
      check(
        Array.isArray(node.relatedBackgroundIds) &&
          new Set(node.relatedBackgroundIds).size === node.relatedBackgroundIds.length &&
          node.relatedBackgroundIds.every(
            (id) =>
              nodes.some((item) => item.id === id && item.kind === 'concept') &&
              relations.some(
                (edge) =>
                  [edge.source, edge.target].includes(node.id) &&
                  [edge.source, edge.target].includes(id),
              ),
          ),
        `invalid related backgrounds: ${node.id}`,
      )
    }
  if (metadata.showPortraits !== undefined)
    check(typeof metadata.showPortraits === 'boolean', 'invalid portrait option')
  if (metadata.story) {
    const chapters = metadata.story.chapters
    check(
      text(metadata.story.overviewLabel) && Array.isArray(chapters) && chapters.length > 1,
      'invalid story config',
    )
    check(metadata.peopleExploration?.includeRootEvents === true, 'story requires root events')
    const ids = new Set()
    let previousStart = -Infinity
    for (const chapter of chapters) {
      const root = nodes.find((node) => node.id === chapter.nodeId)
      check(
        root &&
          !ids.has(root.id) &&
          text(chapter.caption) &&
          metadata.peopleExploration.rootKinds.includes(root.kind) &&
          rangeValid(root.timeRange) &&
          root.timeRange.start >= previousStart &&
          root.relatedEventIds.length > 0,
        'invalid story chapter',
      )
      ids.add(root.id)
      previousStart = root.timeRange.start
      for (const id of root.relatedEventIds)
        check(
          relations.some(
            (edge) =>
              [edge.source, edge.target].includes(root.id) &&
              [edge.source, edge.target].includes(id),
          ),
          'missing chapter event relationship',
        )
    }
  }
  if (metadata.peopleExploration) {
    const config = metadata.peopleExploration
    check(
      Array.isArray(config.rootKinds) &&
        config.rootKinds.length > 0 &&
        config.rootKinds.every((kind) =>
          ['polity', 'period', 'faction', 'concept'].includes(kind),
        ) &&
        typeIds.has(config.membershipRelationType),
      'invalid people exploration config',
    )
    for (const root of nodes.filter((node) => config.rootKinds.includes(node.kind))) {
      check(
        root.relatedPersonIds?.length > 0 &&
          root.relatedPersonIds.every((id) =>
            relations.some(
              (edge) =>
                edge.type === config.membershipRelationType &&
                ((edge.source === root.id && edge.target === id) ||
                  (edge.target === root.id && edge.source === id)),
            ),
          ),
        `missing people membership relationship: ${root.id}`,
      )
    }
  }
  for (const relation of relations) {
    check(
      nodeIds.has(relation.source) &&
        nodeIds.has(relation.target) &&
        relation.source !== relation.target,
      `invalid relation endpoints: ${relation.id}`,
    )
    check(typeIds.has(relation.type), `unknown relation type: ${relation.id}`)
    const definition = metadata.relationTypes.find((type) => type.id === relation.type)
    if (relation.timeRange)
      check(rangeValid(relation.timeRange), `invalid time range: ${relation.id}`)
    if (definition.temporalRule === 'overlap') {
      const first = nodes.find((node) => node.id === relation.source).timeRange
      const second = nodes.find((node) => node.id === relation.target).timeRange
      check(
        !definition.directed &&
          rangeValid(first) &&
          rangeValid(second) &&
          rangeValid(relation.timeRange) &&
          relation.timeRange.start >= Math.max(first.start, second.start) &&
          relation.timeRange.end <= Math.min(first.end, second.end),
        `invalid coexistence interval: ${relation.id}`,
      )
    }
    const endpoints = [relation.source, relation.target]
    if (!definition.directed) endpoints.sort()
    const relationKey = JSON.stringify([
      endpoints,
      relation.type,
      relation.label,
      relation.period,
      relation.basis,
    ])
    check(!relationKeys.has(relationKey), `duplicate relationship: ${relation.id}`)
    relationKeys.add(relationKey)
    for (const key of ['label', 'description', 'period'])
      check(text(relation[key]), `missing ${key}: ${relation.id}`)
    if (
      nodes.some(
        (node) =>
          (node.id === relation.source || node.id === relation.target) && node.basis === 'literary',
      )
    )
      check(
        relation.basis === 'literary',
        `literary endpoint on documented relation: ${relation.id}`,
      )
    citationsValid(relation)
  }
  check(
    Array.isArray(metadata.initialNodeIds) &&
      metadata.initialNodeIds.length > 0 &&
      new Set(metadata.initialNodeIds).size === metadata.initialNodeIds.length &&
      metadata.initialNodeIds.every((id) => nodeIds.has(id)),
    'invalid initial node ids',
  )
  check(
    metadata.initialNodeIds.includes(metadata.initialSelectionId),
    'initial selection must be initially visible',
  )
  if (metadata.viewport?.initialFocusIds !== undefined) {
    const focusIds = metadata.viewport.initialFocusIds
    check(
      Array.isArray(focusIds) &&
        focusIds.length > 0 &&
        new Set(focusIds).size === focusIds.length &&
        focusIds.every((id) => metadata.initialNodeIds.includes(id)),
      'initial focus must contain unique initially visible node ids',
    )
  }
  return { nodes: nodes.length, relations: relations.length, sources: sources.length }
}
