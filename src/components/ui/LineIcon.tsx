import type { ReactNode, SVGProps } from 'react'

type IconName =
  | 'alert'
  | 'arrowLeft'
  | 'arrowRight'
  | 'book'
  | 'check'
  | 'clock'
  | 'close'
  | 'download'
  | 'ear'
  | 'eye'
  | 'eyeOff'
  | 'edit'
  | 'home'
  | 'link'
  | 'loader'
  | 'magnifier'
  | 'message'
  | 'mic'
  | 'play'
  | 'plus'
  | 'refresh'
  | 'save'
  | 'settings'
  | 'sound'
  | 'sparkle'
  | 'star'
  | 'stop'
  | 'trash'
  | 'upload'
  | 'xmark'

interface LineIconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName
}

const PATHS: Record<IconName, ReactNode> = {
  alert: <path d="M12 8v4m0 4h.01M10.3 3.7 2.7 17.1A2 2 0 0 0 4.4 20h15.2a2 2 0 0 0 1.7-2.9L13.7 3.7a2 2 0 0 0-3.4 0Z" />,
  arrowLeft: <path d="M19 12H5m0 0 6-6m-6 6 6 6" />,
  arrowRight: <path d="M5 12h14m0 0-6-6m6 6-6 6" />,
  book: <path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H20v15H7.5A2.5 2.5 0 0 0 5 20.5V5.5Zm0 0A2.5 2.5 0 0 0 2.5 3H4m1 17.5A2.5 2.5 0 0 0 7.5 23H20" />,
  check: <path d="m5 12 4 4L19 6" />,
  clock: <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v5l3 2" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  download: <path d="M12 3v11m0 0 4-4m-4 4-4-4M5 17v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2" />,
  ear: <path d="M6.5 10.5a5.5 5.5 0 1 1 10.5 2.3c-.6 1.2-1.8 2-3.1 2.8-1.4.8-2.1 1.8-2.1 3.1A2.3 2.3 0 0 1 9.5 21M8.8 9.8a2.8 2.8 0 1 1 5.4 1.2c-.4.8-1.2 1.2-2 1.7" />,
  eye: <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Zm9.5 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />,
  eyeOff: <path d="m3 3 18 18M9.9 5.3A10.5 10.5 0 0 1 12 5c6 0 9.5 7 9.5 7a16 16 0 0 1-3 3.7M6.3 6.8A16 16 0 0 0 2.5 12S6 19 12 19c1.3 0 2.4-.3 3.4-.8M10.6 10.6a3 3 0 0 0 3.8 3.8" />,
  edit: <path d="M4 20h4.5L19 9.5a2.1 2.1 0 0 0-3-3L5.5 17 4 20Zm11-12 3 3" />,
  home: <path d="M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1v-8.5Z" />,
  link: <path d="M9.5 14.5 14.5 9.5M10 7.5l1.2-1.2a4 4 0 0 1 5.6 5.6L15.5 13M14 16.5l-1.2 1.2a4 4 0 0 1-5.6-5.6L8.5 11" />,
  loader: <path d="M12 3v3m6.4-.4-2.1 2.1M21 12h-3M18.4 18.4l-2.1-2.1M12 21v-3M5.6 18.4l2.1-2.1M3 12h3M5.6 5.6l2.1 2.1" />,
  magnifier: <path d="M10.5 18a7.5 7.5 0 1 1 5.3-2.2L21 21l-5.2-5.2" />,
  message: <path d="M4 5h16v11H8l-4 4V5Z" />,
  mic: <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3Zm7-4v1a7 7 0 0 1-14 0v-1m7 8v3m-4 0h8" />,
  play: <path d="M8 5v14l11-7L8 5Z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  refresh: <path d="M20 6v5h-5M4 18v-5h5m10-2a7 7 0 0 0-11.9-4.2L4 10m16 4-3.1 3.2A7 7 0 0 1 5 13" />,
  save: <path d="M5 4h12l2 2v14H5V4Zm3 0v6h8V4M8 20v-6h8v6" />,
  settings: <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm0-12v2m0 13v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M3 12h2m14 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />,
  sound: <path d="M4 10v4h4l5 4V6l-5 4H4Zm13 0a4 4 0 0 1 0 4m2.5-6.5a8 8 0 0 1 0 9" />,
  sparkle: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Zm6 12 .8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8L18 15Z" />,
  star: <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 16.9 6.6 19.8l1-6.1-4.4-4.3 6.1-.9L12 3Z" />,
  stop: <path d="M6 6h12v12H6V6Z" />,
  trash: <path d="M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3" />,
  upload: <path d="M12 21V10m0 0-4 4m4-4 4 4M5 7V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2" />,
  xmark: <path d="m7 7 10 10M17 7 7 17" />,
}

export function LineIcon({ name, className, ...props }: LineIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className ?? 'h-5 w-5'}
      {...props}
    >
      {PATHS[name]}
    </svg>
  )
}
