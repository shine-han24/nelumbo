import { useEffect, useState } from 'react'

/** 세 칸(설정·원고·미리보기)을 나란히 두기에 화면이 좁은가 */
export function useIsNarrow(maxWidth = 900): boolean {
  const [narrow, setNarrow] = useState(
    () => typeof window !== 'undefined' && window.innerWidth <= maxWidth,
  )

  useEffect(() => {
    const mq = matchMedia(`(max-width: ${maxWidth}px)`)
    const onChange = () => setNarrow(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [maxWidth])

  return narrow
}
