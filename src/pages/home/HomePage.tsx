import { lazy, Suspense } from 'react'
import { ArrowRight, ArrowUpRight, BookOpen, Search, Lightbulb } from '../../components/icons'
import { Link } from 'react-router-dom'
import { TopicExplorer } from '../../features/topics/TopicExplorer'
import { DomainDirectory } from '../../components/DomainDirectory'
import { LibrarySearch } from '../../components/LibrarySearch'
import { topics } from '../../data/catalog'
import { isExplorerTopic } from '../../types/knowledge'
import '../../styles/library.css'
const HomeAtlasPreview = lazy(() => import('../../features/graph/HomeAtlasPreview'))
const nodeCount = topics.reduce(
  (sum, topic) => sum + (isExplorerTopic(topic) ? topic.dataset.nodes.length : topic.nodes.length),
  0,
)
export function HomePage() {
  return (
    <div className="library-home">
      <section className="library-entrance">
        <div className="entrance-inner shell">
          <div className="hero-copy">
            <div className="eyebrow">
              <BookOpen size={15} /> 一座可以探索的数字知识图书馆
            </div>
            <h1>
              让知识之间的联系，
              <br />
              一目了然<span>。</span>
            </h1>
            <p className="hero-description">
              在这里，探索历史、科学与世界的万物联系。
              <br />
              从一个名字开始，打开一段故事。
            </p>
            <LibrarySearch />
            <div className="popular-searches">
              <span>热门索引</span>
              {['三国', '中国历史', '植物'].map((term) => (
                <Link key={term} to={'/topics?q=' + encodeURIComponent(term)}>
                  {term}
                  <ArrowUpRight size={12} />
                </Link>
              ))}
            </div>
          </div>
          <div className="entrance-caption" aria-hidden="true">
            <span>KNOWLEDGE, CONNECTED</span>
            <p>
              好奇心，
              <br />
              是通往世界的第一扇窗。
            </p>
          </div>
        </div>
      </section>
      <section className="shell domains-section">
        <DomainDirectory />
      </section>
      <section id="topics" className="topics-section shell">
        <div className="section-heading">
          <div>
            <span className="section-kicker">CURATED COLLECTIONS</span>
            <h2>精选专题</h2>
          </div>
          <Link className="text-link" to="/topics">
            浏览更多 <ArrowRight size={16} />
          </Link>
        </div>
        <TopicExplorer />
      </section>
      <section className="living-atlas-section shell">
        <div className="living-atlas-copy">
          <span className="section-kicker">OPEN A MAP. FOLLOW A CONNECTION.</span>
          <h2>
            知识有联系，
            <br />
            探索有方向。
          </h2>
          <p>
            点击一个熟悉的人物，看看他的故事与谁相连。
            <br />
            每次选择，都能打开新的阅读路径。
          </p>
          <div className="hero-proof">
            <span>
              <strong>{topics.length}</strong> 个馆藏专题
            </span>
            <span>
              <strong>{nodeCount}</strong> 个知识节点
            </span>
          </div>
          <Link className="text-link" to="/topics/three-kingdoms">
            探索完整三国图谱 <ArrowRight size={17} />
          </Link>
        </div>
        <Suspense
          fallback={
            <div className="preview-loading" role="status">
              正在连接知识与故事…
            </div>
          }
        >
          <HomeAtlasPreview />
        </Suspense>
      </section>
      <section id="guide" className="family-section shell">
        <div className="family-intro">
          <span className="section-kicker">EXPLORE TOGETHER</span>
          <h2>让好奇心，成为一起阅读的起点。</h2>
          <p>从一句“为什么”开始，发现知识的来龙去脉。</p>
          <Link to="/topics/garden" className="text-link">
            从身边的自然开始 <ArrowRight size={16} />
          </Link>
        </div>
        <div className="guide-steps">
          {[
            { icon: Search, title: '找到好奇的问题', text: '人物、时代、事件，都可以成为起点。' },
            { icon: Lightbulb, title: '沿着关系继续探索', text: '点开节点，发现知识之间的联系。' },
            { icon: BookOpen, title: '回到资料读得更深', text: '阅读来源，理解每一段故事的来处。' },
          ].map(({ icon: Icon, title, text }, index) => (
            <div className="guide-step" key={title}>
              <span className="step-number">0{index + 1}</span>
              <span className="step-icon">
                <Icon size={20} />
              </span>
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
