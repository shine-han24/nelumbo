import { saveAs } from 'file-saver'
import { getPaper } from '@/layout/paperSizes'
import {
  renderAllPages,
  renderOnePage,
  type ImageFormat,
  type RenderAllProgress,
  type RenderOptions,
} from './renderPages'

const stamp = () => {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`
}

const safeName = (s: string) =>
  (s.replace(/[\\/:*?"<>|]/g, '_').trim() || 'nelumbo').slice(0, 60)

const EXT: Record<ImageFormat, string> = { png: 'png', jpeg: 'jpg', webp: 'webp' }

export interface ExportJob extends RenderOptions {
  docTitle: string
}

/**
 * 전체 페이지를 낱장 이미지로 내려받는다.
 *
 * ZIP으로 묶으면 사용자가 압축을 한 번 더 풀어야 한다. 발췌물은 보통
 * 몇 장이라 그 수고가 더 크므로, 쪽번호를 붙인 파일로 그냥 여러 장 저장한다.
 * 파일명은 `제목-01.png` 처럼 0으로 채워 정렬 순서를 보장한다.
 */
export async function exportAllPages(
  job: ExportJob,
  onProgress?: (p: RenderAllProgress) => void,
) {
  const blobs = await renderAllPages(job, onProgress)
  const pad = String(blobs.length).length
  const base = safeName(job.docTitle)

  for (let i = 0; i < blobs.length; i++) {
    const n = String(i + 1).padStart(pad, '0')
    saveAs(blobs[i], `${base}-${n}.${EXT[job.format]}`)
    // 브라우저가 연속 다운로드를 스팸으로 보고 막는 경우가 있어 간격을 둔다
    if (i < blobs.length - 1) await new Promise((r) => setTimeout(r, 220))
  }
}

/**
 * 여러 장을 ZIP 하나로. 장수가 많을 때만 쓸모가 있어 부차적인 경로로 남겨 뒀다.
 * jszip은 여기서만 쓰이므로 필요할 때 불러온다.
 */
export async function exportZip(job: ExportJob, onProgress?: (p: RenderAllProgress) => void) {
  const [{ default: JSZip }, blobs] = await Promise.all([
    import('jszip'),
    renderAllPages(job, onProgress),
  ])
  const zip = new JSZip()
  const pad = String(blobs.length).length

  blobs.forEach((blob, i) => {
    const n = String(i + 1).padStart(pad, '0')
    zip.file(`${safeName(job.docTitle)}-${n}.${EXT[job.format]}`, blob)
  })

  const out = await zip.generateAsync({ type: 'blob' })
  saveAs(out, `${safeName(job.docTitle)}-${stamp()}.zip`)
}

/** 현재 보이는 페이지 한 장만 */
export async function exportSinglePage(job: ExportJob, index = 0) {
  const { blob } = await renderOnePage(index, job)
  saveAs(blob, `${safeName(job.docTitle)}-${index + 1}.${EXT[job.format]}`)
}

/**
 * 이미지 PDF.
 *
 * 벡터 PDF(텍스트 선택 가능)는 브라우저 print 파이프라인을 타야 하는데
 * 한글 폰트 임베딩과 페이지 경계가 브라우저마다 달라진다. 결과가 확실한
 * 이미지 PDF를 기본으로 두고, 벡터가 필요하면 printPdf()를 쓴다.
 */
export async function exportPdf(
  job: ExportJob,
  paperId: string,
  onProgress?: (p: RenderAllProgress) => void,
) {
  const [{ jsPDF }, blobs] = await Promise.all([
    import('jspdf'),
    renderAllPages({ ...job, format: 'jpeg' }, onProgress),
  ])
  const paper = getPaper(paperId)

  const pdf = new jsPDF({
    orientation: paper.width >= paper.height ? 'landscape' : 'portrait',
    unit: 'px',
    format: [paper.width, paper.height],
    compress: true,
  })

  for (let i = 0; i < blobs.length; i++) {
    if (i > 0) pdf.addPage([paper.width, paper.height])
    const dataUrl = await blobToDataUrl(blobs[i])
    pdf.addImage(dataUrl, 'JPEG', 0, 0, paper.width, paper.height, undefined, 'FAST')
  }

  pdf.save(`${safeName(job.docTitle)}-${stamp()}.pdf`)
}

/** 벡터 PDF — 브라우저 인쇄 대화상자를 연다 */
export function printPdf() {
  window.print()
}

/** 클립보드로 복사 — SNS 카드 한 장 만들 때 가장 자주 쓰는 경로 */
export async function copyPageToClipboard(job: ExportJob, index = 0) {
  // 클립보드 이미지는 PNG만 폭넓게 지원된다
  const { blob } = await renderOnePage(index, { ...job, format: 'png' })
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}
