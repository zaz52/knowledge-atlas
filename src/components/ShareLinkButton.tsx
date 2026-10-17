import { useState } from 'react'
import { topicShareUrl } from '../lib/pageMetadata'

export function ShareLinkButton({ topicId }: { topicId: string }) {
  const [message, setMessage] = useState('')
  const [manualLink, setManualLink] = useState('')
  const [copying, setCopying] = useState(false)
  async function copy() {
    const url = topicShareUrl(topicId, window.location.origin)
    setCopying(true)
    setManualLink('')
    try {
      await navigator.clipboard.writeText(url)
      setMessage('链接已复制，可以分享给朋友。')
    } catch {
      setManualLink(url)
      setMessage('浏览器未能自动复制，请长按或选中下方链接复制。')
    } finally {
      setCopying(false)
    }
  }
  return (
    <div className="topic-share">
      <button type="button" onClick={() => void copy()} disabled={copying}>
        {copying ? '正在复制…' : '复制分享链接'}
      </button>
      {message && <p role="status">{message}</p>}
      {manualLink && (
        <input
          aria-label="分享链接"
          value={manualLink}
          readOnly
          onFocus={(event) => event.currentTarget.select()}
        />
      )}
    </div>
  )
}
