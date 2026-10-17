import garden from './topics/garden.json'
import solarSystem from './topics/solar-system.json'
import metadata from './topics/three-kingdoms.json'
import nodes from './topics/three-kingdoms/nodes.json'
import relations from './topics/three-kingdoms/relations.json'
import sources from './topics/three-kingdoms/sources.json'
import dynastiesMetadata from './topics/chinese-dynasties.json'
import dynastiesNodes from './topics/chinese-dynasties/nodes.json'
import dynastiesRelations from './topics/chinese-dynasties/relations.json'
import dynastiesSources from './topics/chinese-dynasties/sources.json'
import type { KnowledgeTopic } from '../types/knowledge'
import { isExplorerTopic } from '../types/knowledge'
import type { ExplorerDataset, ExplorerKnowledgeTopic } from '../types/explorer'

const dataset = { metadata, nodes, relations, sources } as ExplorerDataset
const threeKingdoms: ExplorerKnowledgeTopic = { ...dataset.metadata, dataset }
const dynastiesDataset = {
  metadata: dynastiesMetadata,
  nodes: dynastiesNodes,
  relations: dynastiesRelations,
  sources: dynastiesSources,
} as ExplorerDataset
const chineseDynasties: ExplorerKnowledgeTopic = {
  ...dynastiesDataset.metadata,
  dataset: dynastiesDataset,
}

// Add new JSON topics to this catalog.
export const topics = [threeKingdoms, chineseDynasties, garden, solarSystem] as KnowledgeTopic[]

const topicIds = new Set<string>()
for (const topic of topics) {
  if (topicIds.has(topic.id)) throw new Error(`Duplicate topic: ${topic.id}`)
  topicIds.add(topic.id)
  if (isExplorerTopic(topic)) continue
  const nodeIds = new Set(topic.nodes.map((node) => node.id))
  const edgeIds = new Set(topic.edges.map((edge) => edge.id))
  if (nodeIds.size !== topic.nodes.length || edgeIds.size !== topic.edges.length)
    throw new Error(`Duplicate graph identifiers in ${topic.id}`)
  for (const edge of topic.edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target))
      throw new Error(`Unknown edge endpoint in ${topic.id}: ${edge.id}`)
  }
}

export function getTopic(id: string | undefined) {
  return topics.find((topic) => topic.id === id)
}
