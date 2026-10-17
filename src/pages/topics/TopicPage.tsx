import { ArrowLeft, ArrowRight, Clock3 } from '../../components/icons'
import { Link, useParams } from 'react-router-dom'
import { getTopic } from '../../data/catalog'
import { NotFoundPage } from '../NotFoundPage'
import { lazy, Suspense } from 'react'
import { isExplorerTopic } from '../../types/knowledge'

const ExplorerTopicPage = lazy(() => import('./ExplorerTopicPage'))
export function TopicPage() {
  const { topicId } = useParams()
  const topic = getTopic(topicId)
  if (!topic) return <NotFoundPage />
  if (isExplorerTopic(topic))
    return (
      <Suspense
        fallback={
          <div className="page-loading" role="status">
            正在展开知识图谱…
          </div>
        }
      >
        <ExplorerTopicPage key={topic.id} dataset={topic.dataset} />
      </Suspense>
    )
  return (
    <section className={`shell detail-page ${topic.theme}`}>
      <Link to="/topics" className="back-link">
        <ArrowLeft size={16} /> 返回专题图书馆
      </Link>
      <div className="detail-heading">
        <span className="section-kicker">{topic.category} / KNOWLEDGE ATLAS</span>
        <h1>{topic.title}</h1>
        <p className="page-description">{topic.description}</p>
        <div className="card-tags">
          {topic.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      </div>
      <div className="question-panel">
        <span>从一个问题开始</span>
        <h2>{topic.question}</h2>
        {topic.status === 'planned' ? (
          <p className="planned-note">
            <Clock3 size={18} /> 专题筹备中，欢迎先探索自然与宇宙的基础图谱。
          </p>
        ) : (
          <>
            <p>
              {topic.nodes.length} 个知识节点 · {topic.edges.length} 条联系 · 基础演示版
            </p>
            <Link className="primary-link" to={`/graph/${topic.id}`}>
              展开知识图谱 <ArrowRight size={17} />
            </Link>
          </>
        )}
      </div>
      {topic.status === 'preview' && (
        <div className="node-reading">
          <h2>先认识这几个知识点</h2>
          <div>
            {topic.nodes.map((node) => (
              <article key={node.id} id={`knowledge-${node.id}`}>
                <h3>{node.label}</h3>
                <p>{node.description}</p>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
