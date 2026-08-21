import type { CSSProperties } from 'react'
import type { BackgroundSetup, BgAnchor } from '@/types'
import { useImageUrl } from '@/store/imageCache'

const ANCHOR_POS: Record<BgAnchor, string> = {
  'top-left': '0% 0%',
  top: '50% 0%',
  'top-right': '100% 0%',
  left: '0% 50%',
  center: '50% 50%',
  right: '100% 50%',
  'bottom-left': '0% 100%',
  bottom: '50% 100%',
  'bottom-right': '100% 100%',
}

/**
 * 페이지 배경 레이어 스택.
 *
 * 사진 위에 글씨를 얹으면 열에 아홉은 안 읽힌다. 그래서 이미지 자체보다
 * "가독성 오버레이"가 이 컴포넌트의 핵심이다 — 기본 UI에서 항상 노출한다.
 */
export function PageBackground({ background: bg }: { background: BackgroundSetup }) {
  const url = useImageUrl(bg.imageKey)

  const hasImage = Boolean(url)
  const hasOverlay = bg.overlayOpacity > 0
  if (!hasImage && !hasOverlay && !bg.grain && !bg.vignette) return null

  const size =
    bg.fit === 'tile'
      ? `${100 * bg.scale}%`
      : bg.fit === 'stretch'
        ? '100% 100%'
        : bg.fit === 'contain'
          ? `${100 * bg.scale}% auto`
          : `${100 * bg.scale}%`

  const imageStyle: CSSProperties = {
    position: 'absolute',
    inset: 0,
    backgroundImage: url ? `url(${url})` : undefined,
    backgroundSize: bg.fit === 'cover' && bg.scale === 1 ? 'cover' : size,
    backgroundPosition: `calc(${ANCHOR_POS[bg.anchor].split(' ')[0]} + ${bg.offsetX}px) calc(${
      ANCHOR_POS[bg.anchor].split(' ')[1]
    } + ${bg.offsetY}px)`,
    backgroundRepeat: bg.fit === 'tile' ? 'repeat' : 'no-repeat',
    opacity: bg.opacity,
    filter: [
      bg.blur ? `blur(${bg.blur}px)` : '',
      bg.brightness !== 1 ? `brightness(${bg.brightness})` : '',
      bg.contrast !== 1 ? `contrast(${bg.contrast})` : '',
      bg.grayscale ? `grayscale(${bg.grayscale})` : '',
    ]
      .filter(Boolean)
      .join(' '),
    // blur는 가장자리를 투명하게 만든다 — 살짝 키워 종이 밖으로 밀어낸다
    transform: bg.blur ? `scale(${1 + bg.blur / 60})` : undefined,
  }

  return (
    <>
      {hasImage && <div style={imageStyle} />}

      {hasOverlay && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: bg.overlayColor,
            opacity: bg.overlayOpacity,
            mixBlendMode: bg.overlayBlend,
          }}
        />
      )}

      {bg.grain > 0 && <div className="np-grain" style={{ opacity: bg.grain }} />}

      {bg.vignette > 0 && (
        <div
          className="np-vignette"
          style={{
            background: `radial-gradient(ellipse at center, transparent 45%, rgb(0 0 0 / ${bg.vignette}) 100%)`,
          }}
        />
      )}
    </>
  )
}
