import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { validateExplorerDataset } from './lib/validate-explorer.mjs'

const directory = new URL('../src/data/topics/', import.meta.url)
const files = (await readdir(directory)).filter((file) => file.endsWith('.json'))
const topicIds = new Set()
let nodeCount = 0
let edgeCount = 0

for (const file of files) {
  const topic = JSON.parse(await readFile(new URL(file, directory), 'utf8'))
  const check = (condition, message) => assert(condition, `${file}: ${message}`)
  for (const key of ['id', 'title', 'subtitle', 'description', 'question'])
    check(typeof topic[key] === 'string' && topic[key].trim(), `${key} must be a nonempty string`)
  check(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(topic.id), 'invalid topic slug')
  check(file === `${topic.id}.json`, 'filename must match topic id')
  check(!topicIds.has(topic.id), 'duplicate topic id')
  topicIds.add(topic.id)
  check(['人文历史', '自然科学', '宇宙探索'].includes(topic.category), 'unknown category')
  check(['preview', 'planned', 'published'].includes(topic.status), 'unknown status')
  check(['history', 'nature', 'space'].includes(topic.theme), 'unknown theme')
  check(
    Array.isArray(topic.tags) && topic.tags.every((tag) => typeof tag === 'string' && tag.trim()),
    'tags must contain nonempty strings',
  )
  if (topic.mode === 'explorer') {
    const [nodes, relations, sources] = await Promise.all(
      ['nodes', 'relations', 'sources'].map(async (name) =>
        JSON.parse(await readFile(new URL(`${topic.id}/${name}.json`, directory), 'utf8')),
      ),
    )
    const result = validateExplorerDataset({ metadata: topic, nodes, relations, sources })
    nodeCount += result.nodes
    edgeCount += result.relations
    console.log(
      `${topic.title}: ${result.nodes} nodes, ${result.relations} relations, ${result.sources} sources.`,
    )
    continue
  }
  check(topic.status !== 'published', 'published topics require explorer mode')
  check(Array.isArray(topic.nodes) && Array.isArray(topic.edges), 'nodes and edges must be arrays')
  check(topic.status !== 'preview' || topic.nodes.length > 0, 'preview topic needs nodes')
  check(
    topic.status !== 'planned' || (topic.nodes.length === 0 && topic.edges.length === 0),
    'planned topic should have an empty graph',
  )
  const elementIds = new Set()
  const nodeIds = new Set()
  for (const node of topic.nodes) {
    check(
      typeof node.id === 'string' && node.id && !elementIds.has(node.id),
      'invalid or duplicate node id',
    )
    elementIds.add(node.id)
    nodeIds.add(node.id)
    check(typeof node.label === 'string' && node.label.trim(), 'missing node label')
    check(
      typeof node.description === 'string' && node.description.trim(),
      'missing node description',
    )
    check(Number.isFinite(node.x) && Number.isFinite(node.y), 'invalid node coordinates')
  }
  for (const edge of topic.edges) {
    check(
      typeof edge.id === 'string' && edge.id && !elementIds.has(edge.id),
      'invalid or duplicate edge id',
    )
    elementIds.add(edge.id)
    check(nodeIds.has(edge.source) && nodeIds.has(edge.target), 'unknown edge endpoint')
    check(typeof edge.label === 'string' && edge.label.trim(), 'missing edge label')
  }
  nodeCount += topic.nodes.length
  edgeCount += topic.edges.length
}
assert(files.length > 0, 'No knowledge topics found')
console.log(`Knowledge data valid: ${files.length} topics, ${nodeCount} nodes, ${edgeCount} edges.`)
