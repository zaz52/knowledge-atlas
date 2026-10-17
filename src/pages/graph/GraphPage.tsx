import { ArrowLeft, MousePointer2 } from '../../components/icons'
import { Link, useParams } from 'react-router-dom'
import { getTopic } from '../../data/catalog'
import { KnowledgeGraph } from '../../features/graph/KnowledgeGraph'
import { NotFoundPage } from '../NotFoundPage'
import { isExplorerTopic } from '../../types/knowledge'
import { KnowledgeExplorer } from '../../features/graph/KnowledgeExplorer'
export default function GraphPage() {
  const { topicId } = useParams()
  const topic = getTopic(topicId)
  if (!topic) return <NotFoundPage />
  if (isExplorerTopic(topic)) return <KnowledgeExplorer key={topic.id} dataset={topic.dataset} />
  return (
    <section className="shell graph-page">
      <Link className="back-link" to={`/topics/${topic.id}`}>
        <ArrowLeft size={16} /> 返回专题介绍
      </Link>
      <div className="graph-heading">
        <div>
          <span className="section-kicker">INTERACTIVE KNOWLEDGE MAP</span>
          <h1>{topic.title}</h1>
        </div>
        <span className="graph-badge">基础演示版</span>
      </div>
      {topic.status === 'planned' ? (
        <div className="empty-state">
          <h2>这张知识图谱正在筹备</h2>
          <p>从自然与宇宙的基础图谱，开始今天的探索。</p>
          <Link className="primary-link" to="/topics">
            浏览其他专题 →
          </Link>
        </div>
      ) : (
        <>
          <p className="graph-instructions">
            <MousePointer2 size={16} />{' '}
            拖动画布或节点，滚轮缩放；知识点文字见图下方。位置与尺寸均为示意。
          </p>
          <KnowledgeGraph key={topic.id} topic={topic} />
          <div className="graph-reading" aria-label="图谱文字说明">
            <h2>读一读图中的联系</h2>
            <div className="reading-grid">
              {topic.nodes.map((node) => (
                <article key={node.id}>
                  <h3>{node.label}</h3>
                  <p>{node.description}</p>
                </article>
              ))}
            </div>
            <ul>
              {topic.edges.map((edge) => (
                <li key={edge.id}>
                  {topic.nodes.find((node) => node.id === edge.source)?.label} → {edge.label} →{' '}
                  {topic.nodes.find((node) => node.id === edge.target)?.label}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </section>
  )
}
