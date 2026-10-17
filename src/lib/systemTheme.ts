import { useSyncExternalStore } from 'react'
const query = '(prefers-color-scheme: dark)'
const subscribe = (notify: () => void) => {
  const media = window.matchMedia(query)
  media.addEventListener('change', notify)
  return () => media.removeEventListener('change', notify)
}
export const useSystemTheme = () =>
  useSyncExternalStore(
    subscribe,
    () => (window.matchMedia(query).matches ? 'dark' : 'light'),
    () => 'light',
  )
