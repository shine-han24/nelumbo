/**
 * nelumbo 아이콘 세트 — 총 · 칼 · 연꽃 · 게임 · 트럭 · 노을 · 구름 · 눈.
 *
 * 24 그리드, 선 굵기 1.6, 끝맺음 둥글게로 통일했다.
 * 좌측 설정 탭과 브랜드·내보내기에만 쓴다. 굵게/기울임 같은 서식 버튼까지
 * 이 그림으로 바꾸면 무슨 버튼인지 알아볼 수 없어진다.
 */
import type { SVGProps } from 'react'

type Props = SVGProps<SVGSVGElement> & { size?: number }

const Svg = ({ size = 20, children, ...rest }: Props) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...rest}
  >
    {children}
  </svg>
)

/** 총 — 리볼버 실루엣 */
export const IconPistol = (p: Props) => (
  <Svg {...p}>
    {/* 총열 */}
    <path d="M3 8h17v3.5H3z" />
    {/* 손잡이 */}
    <path d="M9.5 11.5 7.6 19.5h4.1l2.4-8" />
    {/* 방아쇠울 */}
    <path d="M9.8 13.5h4.3" />
    {/* 실린더 */}
    <circle cx="7" cy="9.7" r="1.5" />
    {/* 가늠쇠 */}
    <path d="M18 8V6.6" />
  </Svg>
)

/** 칼 — 곧은 도신과 코등이 */
export const IconBlade = (p: Props) => (
  <Svg {...p}>
    {/* 도신 */}
    <path d="M19.8 2.6 9.6 12.8l1.6 1.6L21.4 4.2z" />
    {/* 코등이 */}
    <path d="m8.2 14.2 1.6 1.6" />
    <path d="M7 12.9 4.4 15.5l4.1 4.1 2.6-2.6" />
    {/* 자루 */}
    <path d="m5.6 18.1-2.9 2.9" />
  </Svg>
)

/** 연꽃 — 브랜드 */
export const IconLotus = (p: Props) => (
  <Svg {...p}>
    {/* 바깥 두 잎 */}
    <path d="M12 20.4c-4.2 0-7.6-2.5-8.8-6.2 3.4-1.2 6.5-.2 8.8 2.6 2.3-2.8 5.4-3.8 8.8-2.6-1.2 3.7-4.6 6.2-8.8 6.2Z" />
    {/* 안쪽 두 잎 */}
    <path d="M12 16.8c-2.4-1.7-3.6-3.9-3.6-6.7 2.2 1 3.6 3.2 3.6 6.7Z" />
    <path d="M12 16.8c2.4-1.7 3.6-3.9 3.6-6.7-2.2 1-3.6 3.2-3.6 6.7Z" />
    {/* 가운데 잎 */}
    <path d="M12 16.4c-1.1-2.7-1.1-5.6 0-8.9 1.1 3.3 1.1 6.2 0 8.9Z" />
  </Svg>
)

/** 게임 — 패드 */
export const IconGamepad = (p: Props) => (
  <Svg {...p}>
    <path d="M8 7.5h8a5.2 5.2 0 0 1 5.1 6.2l-.6 3.1a2.5 2.5 0 0 1-4.3 1.2L14.4 16H9.6l-1.8 2a2.5 2.5 0 0 1-4.3-1.2l-.6-3.1A5.2 5.2 0 0 1 8 7.5Z" />
    {/* 십자키 */}
    <path d="M7.4 11.3v2.6" />
    <path d="M6.1 12.6h2.6" />
    {/* 버튼 */}
    <circle cx="15.9" cy="11.8" r="1" fill="currentColor" stroke="none" />
    <circle cx="17.9" cy="13.8" r="1" fill="currentColor" stroke="none" />
  </Svg>
)

/** 트럭 — 옮겨 나르기 */
export const IconTruck = (p: Props) => (
  <Svg {...p}>
    <path d="M2.4 6h10.2v10.4H2.4z" />
    <path d="M12.6 9.4h4.3l3.7 3.7v3.3h-8z" />
    <circle cx="6.6" cy="18.4" r="1.9" />
    <circle cx="16.6" cy="18.4" r="1.9" />
    <path d="M8.5 18.4h6.2" />
  </Svg>
)

/** 노을 — 지는 해 (그대로 유지) */
export const IconSunset = (p: Props) => (
  <Svg {...p}>
    <path d="M2.5 18.5h19" />
    <path d="M6 14.5a6 6 0 0 1 12 0" />
    <path d="M12 2.5v3" />
    <path d="M4.4 5.6 6.5 7.7" />
    <path d="M19.6 5.6 17.5 7.7" />
    <path d="M5 21.5h5" />
    <path d="M14 21.5h5" />
  </Svg>
)

/** 구름 */
export const IconCloud = (p: Props) => (
  <Svg {...p}>
    <path d="M7.2 18.5h10a4.3 4.3 0 0 0 .5-8.6 5.6 5.6 0 0 0-10.6-1.3A3.9 3.9 0 0 0 7.2 18.5Z" />
  </Svg>
)

/** 눈 — 눈송이 */
export const IconSnow = (p: Props) => (
  <Svg {...p}>
    <path d="M12 2.8v18.4" />
    <path d="m4 7.4 16 9.2" />
    <path d="m20 7.4-16 9.2" />
    {/* 가지 */}
    <path d="M9.5 5.3 12 7.8l2.5-2.5" />
    <path d="M9.5 18.7 12 16.2l2.5 2.5" />
    <path d="m5.1 11.6.9-3.4 3.4.9" />
    <path d="m18.9 12.4-.9 3.4-3.4-.9" />
    <path d="m18.9 11.6-.9-3.4-3.4.9" />
    <path d="m5.1 12.4.9 3.4 3.4-.9" />
  </Svg>
)
