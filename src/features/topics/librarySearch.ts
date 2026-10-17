import { topics } from '../../data/catalog'
import { isExplorerTopic } from '../../types/knowledge'
import type { KnowledgeTopic } from '../../types/knowledge'
import { searchNodes } from '../graph/explorerModel'
export function matchesKnowledge(topic: KnowledgeTopic, query: string) {
  const q = query.trim().toLowerCase()
  return (
    !q ||
    (topic.title + topic.description + topic.tags.join('')).toLowerCase().includes(q) ||
    (isExplorerTopic(topic)
      ? searchNodes(topic.dataset, q, true).length > 0
      : topic.nodes.some((node) => (node.label + node.description).toLowerCase().includes(q)))
  )
}
export function libraryResults(query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return topics
    .flatMap((topic) => {
      const topicMatch = (topic.title + topic.tags.join('')).toLowerCase().includes(q)
        ? [
            {
              id: topic.id,
              label: topic.title,
              detail: '知识专题',
              topic: topic.title,
              url: '/topics/' + topic.id,
              kind: 'collection',
            },
          ]
        : []
      const nodes = isExplorerTopic(topic)
        ? searchNodes(topic.dataset, q, true).map((node) => ({
            id: node.id,
            label: node.label,
            detail: node.identity,
            kind: node.kind,
          }))
        : topic.nodes
            .filter((node) => (node.label + node.description).toLowerCase().includes(q))
            .map((node) => ({ id: node.id, label: node.label, detail: '知识点', kind: 'concept' }))
      return [
        ...topicMatch,
        ...nodes.map((node) => ({
          ...node,
          topic: topic.title,
          url: isExplorerTopic(topic)
            ? '/topics/' + topic.id + '?node=' + encodeURIComponent(node.id)
            : '/topics/' + topic.id + '#knowledge-' + node.id,
        })),
      ]
    })
    .slice(0, 10)
}
