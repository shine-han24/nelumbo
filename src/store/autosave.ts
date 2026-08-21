import { get, set } from 'idb-keyval'
import type { JSONContent } from '@tiptap/core'
import type { DocMeta, StyleSnapshot } from '@/types'
import { useDocStore } from './docStore'
import { useStyleStore } from './styleStore'

/**
 * 자동 저장.
 *
 * 발췌 작업은 긴 원고를 다루는데 결과물이 브라우저 안에만 있다.
 * 탭이 닫히거나 새로고침되면 전부 날아가므로 IndexedDB에 스냅샷을 둔다.
 * localStorage가 아니라 IndexedDB인 이유는 원고가 수십만 자까지 갈 수 있어서다.
 */
const KEY = 'nelumbo:session'
const DEBOUNCE_MS = 900

export interface Session {
  version: 1
  savedAt: number
  doc: JSONContent
  meta: DocMeta
  style: StyleSnapshot
}

let timer: ReturnType<typeof setTimeout> | null = null
let lastDoc: JSONContent | null = null

export function scheduleSave(doc: JSONContent) {
  lastDoc = doc
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => void saveNow(), DEBOUNCE_MS)
}

export async function saveNow() {
  if (!lastDoc) return
  const session: Session = {
    version: 1,
    savedAt: Date.now(),
    doc: lastDoc,
    meta: useDocStore.getState().meta,
    style: useStyleStore.getState().snapshot(),
  }
  try {
    await set(KEY, session)
  } catch {
    // 용량 초과 등으로 실패해도 편집은 계속되어야 한다
  }
}

export async function loadSession(): Promise<Session | null> {
  try {
    const saved = await get<Session>(KEY)
    if (!saved || saved.version !== 1) return null

    // 조판 설정도 함께 복구한다 — 글만 돌아오고 서식이 초기화되면
    // 복구된 느낌이 들지 않는다
    if (saved.style) useStyleStore.getState().applySnapshot(saved.style)
    if (saved.meta) useDocStore.getState().setMeta(saved.meta)

    return saved
  } catch {
    return null
  }
}

/** 조판 설정만 바뀌었을 때도 저장한다 */
export function watchStyleChanges() {
  useStyleStore.subscribe(() => {
    if (lastDoc) scheduleSave(lastDoc)
  })
}

/** 탭을 닫기 직전 마지막 저장 */
export function installUnloadSave() {
  window.addEventListener('beforeunload', () => {
    if (timer) clearTimeout(timer)
    void saveNow()
  })
}
