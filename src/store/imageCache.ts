import { useEffect, useState } from 'react'
import { del, get, set } from 'idb-keyval'

/**
 * 배경 이미지는 IndexedDB에 Blob으로 두고, 화면에는 object URL로 붙인다.
 * localStorage에 data URL로 넣으면 몇 장 만에 용량 한계에 걸린다.
 */
const PREFIX = 'nelumbo:img:'
const urlCache = new Map<string, string>()

export async function putImage(blob: Blob): Promise<string> {
  const key = `${PREFIX}${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  await set(key, blob)
  return key
}

export async function removeImage(key: string) {
  const url = urlCache.get(key)
  if (url) {
    URL.revokeObjectURL(url)
    urlCache.delete(key)
  }
  await del(key)
}

export async function loadImageUrl(key: string): Promise<string | null> {
  const cached = urlCache.get(key)
  if (cached) return cached

  const blob = await get<Blob>(key)
  if (!blob) return null

  const url = URL.createObjectURL(blob)
  urlCache.set(key, url)
  return url
}

export function useImageUrl(key: string | null): string | null {
  const [url, setUrl] = useState<string | null>(() => (key ? urlCache.get(key) ?? null : null))

  useEffect(() => {
    if (!key) {
      setUrl(null)
      return
    }
    let alive = true
    loadImageUrl(key).then((u) => {
      if (alive) setUrl(u)
    })
    return () => {
      alive = false
    }
  }, [key])

  return url
}
