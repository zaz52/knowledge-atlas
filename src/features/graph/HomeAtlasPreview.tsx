import { useMemo, useState, useSyncExternalStore } from 'react'
import { Link } from 'react-router-dom'
import { getTopic } from '../../data/catalog'
import { isExplorerTopic } from '../../types/knowledge'
import { ArrowUpRight } from '../../components/icons'
import { ExplorerCanvas } from './ExplorerCanvas'
import '../../styles/explorer.css'

const query = '(max-width: 760px)'
const subscribe = (notify: () => void) => {
  const media = window.matchMedia(query)
  media.addEventListener('change', notify)
  return () => media.removeEventListener('change', notify)
}
const snapshot = () => window.matchMedia(query).matches
export default function HomeAtlasPreview() {
  const mobile = useSyncExternalStore(subscribe, snapshot, () => false)
  const dataset = useMemo(() => {
    const topic = getTopic('three-kingdoms')
    if (!topic || !isExplorerTopic(topic)) throw new Error('Knowledge preview topic unavailable')
    const source = topic.dataset
    const center = source.nodes.find((node) => node.kind === 'person')!
    const people = source.nodes
      .filter((node) => node.kind === 'person' && node.id !== center.id)
      .slice(0, mobile ? 2 : 5)
    const event = source.nodes.find((node) => node.kind === 'event' && node.basis === 'documented')!
    const selectedNodes = [center, ...people, event]
    const mobilePositions = [
      { x: 150, y: 160 },
      { x: 25, y: 20 },
      { x: 280, y: 20 },
      { x: 150, y: 315 },
    ]
    const nodes = selectedNodes.map((node, index) => ({
      ...node,
      position: mobile
        ? mobilePositions[index]
        : index === 0
          ? { x: 330, y: 260 }
          : {
              x: 330 + 245 * Math.cos(((index - 1) * Math.PI) / 3 - 1.9),
              y: 260 + 185 * Math.sin(((index - 1) * Math.PI) / 3 - 1.9),
            },
    }))
    const ids = new Set(nodes.map((node) => node.id))
    return {
      ...source,
      nodes,
      relations: source.relations.filter(
        (relation) => ids.has(relation.source) && ids.has(relation.target),
      ),
      metadata: {
        ...source.metadata,
        viewport: undefined,
        initialSelectionId: center.id,
        initialNodeIds: [...ids],
      },
    }
  }, [mobile])
  const [selectedId, setSelectedId] = useState(dataset.metadata.initialSelectionId)
  const selected = dataset.nodes.find((node) => node.id === selectedId) ?? dataset.nodes[0]
  const scene = useMemo(() => ({ nodes: dataset.nodes, relations: dataset.relations }), [dataset])
  return (
    <div className="knowledge-preview">
      <div className="preview-heading">
        <span>
          <i className="live-dot" /> 正在连接 · 三国人物关系网
        </span>
        <span>{dataset.nodes.length} 个节点 / 真实图谱</span>
      </div>
      <ExplorerCanvas
        dataset={dataset}
        preview
        scene={scene}
        selectedId={selected.id}
        highlight
        layoutRevision={0}
        onSelect={setSelectedId}
        onStatusChange={() => {}}
        onZoomChange={() => {}}
      />
      <div className="preview-bottom">
        <div>
          <strong>{selected.label}</strong>
          <span>{selected.identity}</span>
        </div>
        <Link to="/topics/three-kingdoms">
          进入图谱 <ArrowUpRight size={16} />
        </Link>
      </div>
      <p className="preview-interaction-note">点击节点，看看知识如何彼此相连</p>
    </div>
  )
}
