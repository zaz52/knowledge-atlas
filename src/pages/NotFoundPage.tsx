import { Link } from 'react-router-dom'
export function NotFoundPage() {
  return (
    <section className="shell empty-state not-found">
      <span className="section-kicker">404 / A NEW DIRECTION</span>
      <h1>这张地图还没有展开</h1>
      <p>试试回到专题图书馆，找一条新的探索路线。</p>
      <Link className="primary-link" to="/topics">
        浏览知识专题 →
      </Link>
    </section>
  )
}
