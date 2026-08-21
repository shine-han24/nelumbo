import { get, set } from 'idb-keyval'
import type { StyleSnapshot } from '@/types'

const KEY = 'nelumbo:user-themes'
const FILE_VERSION = 1

export interface UserTheme {
  id: string
  label: string
  savedAt: number
  snapshot: StyleSnapshot
}

export async function listUserThemes(): Promise<UserTheme[]> {
  return (await get<UserTheme[]>(KEY)) ?? []
}

export async function saveUserTheme(label: string, snapshot: StyleSnapshot): Promise<UserTheme[]> {
  const list = await listUserThemes()
  const theme: UserTheme = {
    id: `u${Date.now().toString(36)}`,
    label: label.trim() || '이름 없는 테마',
    savedAt: Date.now(),
    snapshot: structuredClone(snapshot),
  }
  const next = [theme, ...list]
  await set(KEY, next)
  return next
}

export async function deleteUserTheme(id: string): Promise<UserTheme[]> {
  const next = (await listUserThemes()).filter((t) => t.id !== id)
  await set(KEY, next)
  return next
}

/* ── 파일로 주고받기 ────────────────────────────────────────── */

export function exportThemeFile(label: string, snapshot: StyleSnapshot) {
  const payload = { app: 'nelumbo', version: FILE_VERSION, label, snapshot }
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${sanitize(label)}.nelumbo-theme.json`
  a.click()
  URL.revokeObjectURL(url)
}

export interface ImportedTheme {
  label: string
  snapshot: StyleSnapshot
}

export async function importThemeFile(file: File): Promise<ImportedTheme> {
  const data = JSON.parse(await file.text())
  if (data?.app !== 'nelumbo' || !data?.snapshot) {
    throw new Error('nelumbo 테마 파일이 아닙니다.')
  }
  // 배경 이미지는 IndexedDB 키라서 다른 기기에서는 열리지 않는다.
  // 조판 설정만 가져오고 이미지는 비운다.
  const snapshot: StyleSnapshot = data.snapshot
  snapshot.background = { ...snapshot.background, imageKey: null }
  return { label: String(data.label ?? '가져온 테마'), snapshot }
}

const sanitize = (s: string) => s.replace(/[\\/:*?"<>|]/g, '_').slice(0, 60) || 'theme'
