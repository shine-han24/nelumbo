import { useEffect, useState } from 'react'
import { del, get, set } from 'idb-keyval'

/**
 * 배경 이미지는 IndexedDB에 Blob으로 두고, 화면에는 object URL로 붙인다.
 * localStorage에 data URL로 넣으면 몇 장 만에 용량 한계에 걸린다.
 */
const PREFIX = 'nelumbo:img:'
const urlCache = new Map<string, string>()
/** object URL → IndexedDB 키. 내보낼 때 원본 Blob을 되찾는 데 쓴다. */
const keyByUrl = new Map<string, string>()

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
  keyByUrl.set(url, key)
  return url
}

/**
 * object URL이 가리키는 이미지를 data URL로 돌려준다.
 *
 * 내보내기에서 쓴다. html-to-image는 배경 이미지를 인라인하려고
 * fetch(blob:...)를 시도하는데, CSP의 connect-src에 blob:이 없으면
 * 조용히 실패하고 배경이 통째로 사라진다(라이브러리가 오류를 삼킨다).
 * 여기서는 fetch 대신 IndexedDB에서 원본 Blob을 직접 꺼내므로
 * CSP 설정과 무관하게 항상 동작한다.
 */
export async function dataUrlForObjectUrl(url: string): Promise<string | null> {
  const key = keyByUrl.get(url)
  if (!key) return null
  const blob = await get<Blob>(key)
  if (!blob) return null

  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
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
