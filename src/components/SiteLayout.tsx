import { useEffect } from 'react'
import { ArrowUpRight, BookOpen, Compass } from './icons'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { PageMetadata } from './PageMetadata'
import { getTopic } from '../data/catalog'
import { useSystemTheme } from '../lib/systemTheme'
import { isExplorerTopic } from '../types/knowledge'

const copyrightYear = new Date().getFullYear()

export function SiteLayout() {
  const theme = useSystemTheme()
  const { pathname, hash } = useLocation()
  const topic = /\/(topics|graph)\//.test(pathname) ? getTopic(pathname.split('/')[2]) : undefined
  const immersive = topic && isExplorerTopic(topic)
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' })
    else window.scrollTo(0, 0)
  }, [pathname, hash])
  return (
    <>
      <PageMetadata />
      <span className="sr-only" role="status">
        跟随系统：{theme === 'dark' ? '深色' : '浅色'}模式
      </span>
      <a className="skip-link" href="#main-content">
        跳转到主要内容
      </a>
      {!immersive && (
        <header className={'site-header shell' + (pathname === '/' ? ' entrance-header' : '')}>
          <Link to="/" className="brand" aria-label="知图首页">
            <span className="brand-mark">
              <BookOpen size={25} strokeWidth={1.6} />
            </span>
            <span className="brand-name">
              知图<span>KNOWLEDGE ATLAS</span>
            </span>
          </Link>
          <nav aria-label="主导航">
            <NavLink to="/" end>
              首页
            </NavLink>
            <NavLink to="/topics">专题图书馆</NavLink>
            <Link to="/#guide">
              共读指南 <ArrowUpRight size={13} />
            </Link>
          </nav>
          <Link className="header-explore" to="/topics">
            <Compass size={17} /> 浏览馆藏
          </Link>
        </header>
      )}
      <main id="main-content" className={immersive ? 'immersive-main' : undefined}>
        <Outlet />
      </main>
      {!immersive && (
        <footer className="site-footer shell">
          <Link to="/" className="footer-brand">
            知图 <span>让好奇心，有迹可循。</span>
          </Link>
          <p>知识有来处，探索有方向。</p>
          <span>KNOWLEDGE ATLAS © {copyrightYear}</span>
        </footer>
      )}
    </>
  )
}
