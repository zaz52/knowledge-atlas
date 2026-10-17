import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { SiteLayout } from './components/SiteLayout'
import { HomePage } from './pages/home/HomePage'
import { TopicsPage } from './pages/topics/TopicsPage'
import { TopicPage } from './pages/topics/TopicPage'
import { NotFoundPage } from './pages/NotFoundPage'

const GraphPage = lazy(() => import('./pages/graph/GraphPage'))

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<SiteLayout />}>
          <Route index element={<HomePage />} />
          <Route path="topics" element={<TopicsPage />} />
          <Route path="topics/:topicId" element={<TopicPage />} />
          <Route
            path="graph/:topicId"
            element={
              <Suspense
                fallback={
                  <div className="page-loading" role="status">
                    正在展开知识图谱…
                  </div>
                }
              >
                <GraphPage />
              </Suspense>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
