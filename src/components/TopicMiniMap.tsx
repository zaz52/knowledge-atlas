import type { KnowledgeTopic } from '../types/knowledge'
import { isExplorerTopic } from '../types/knowledge'
import { nodeThemeKey } from '../features/graph/graphTheme'

export function TopicMiniMap({ topic }: { topic: KnowledgeTopic }) {
  const explorer = isExplorerTopic(topic)
  const nodes = explorer
    ? topic.dataset.nodes
        .filter((node) => topic.initialNodeIds.includes(node.id))
        .slice(0, 10)
        .map((node) => ({ ...node, x: node.position.x, y: node.position.y }))
    : topic.nodes.map((node) => ({ ...node, kind: 'concept' as const }))
  const edges = explorer ? topic.dataset.relations : topic.edges
  const minX = Math.min(...nodes.map((node) => node.x)),
    maxX = Math.max(...nodes.map((node) => node.x))
  const minY = Math.min(...nodes.map((node) => node.y)),
    maxY = Math.max(...nodes.map((node) => node.y))
  const points = new Map(
    nodes.map((node) => [
      node.id,
      {
        x: 22 + ((node.x - minX) / Math.max(maxX - minX, 1)) * 256,
        y: 24 + ((node.y - minY) / Math.max(maxY - minY, 1)) * 92,
      },
    ]),
  )
  return (
    <svg className="topic-mini-map" viewBox="0 0 300 144" aria-hidden="true">
      {edges
        .filter((edge) => points.has(edge.source) && points.has(edge.target))
        .map((edge) => {
          const a = points.get(edge.source)!,
            b = points.get(edge.target)!
          return (
            <path
              key={edge.id}
              d={
                'M' +
                a.x +
                ',' +
                a.y +
                ' Q' +
                (a.x + b.x) / 2 +
                ',' +
                ((a.y + b.y) / 2 - 14) +
                ' ' +
                b.x +
                ',' +
                b.y
              }
            />
          )
        })}
      {nodes.map((node, index) => {
        const p = points.get(node.id)!
        return (
          <g key={node.id} data-kind={nodeThemeKey(node.kind)}>
            <circle className="mini-node-halo" cx={p.x} cy={p.y} r={index === 0 ? 12 : 8} />
            <circle cx={p.x} cy={p.y} r={index === 0 ? 4.5 : 3} />
          </g>
        )
      })}
    </svg>
  )
}
