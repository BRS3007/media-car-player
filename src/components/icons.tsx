import { IconProps } from './icon-types'

export function MusicIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 3v10.55A4 4 0 1 0 13.5 17V7h4V3z" />
    </svg>
  )
}

export function VideoIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4z" />
    </svg>
  )
}

export function DownloadIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3v10M8 9l4 4 4-4" />
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </svg>
  )
}

export function TrashIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
      <path d="M6 6l1 14h10l1-14M10 11v6M14 11v6" />
    </svg>
  )
}

export function BackIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

export function HelpIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M9.5 9a2.5 2.5 0 1 1 3.9 2.1c-.9.6-1.4 1-1.4 1.9" />
      <circle cx="12" cy="17" r="0.5" fill="currentColor" />
    </svg>
  )
}

export function CarLogo({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <defs>
        <linearGradient id="carLogoGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#1e3a8a" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="22" height="22" rx="5.5" fill="url(#carLogoGrad)" />
      <path
        d="M5.5 13.2a2 2 0 0 1 1.6-.8h1.9L11 9.4a1.6 1.6 0 0 1 1.3-.6h3.7a1.6 1.6 0 0 1 1.5 1l.9 2.6h1.5a2 2 0 0 1 2 2v1.4a1.3 1.3 0 0 1-1.3 1.3h-1a2.5 2.5 0 0 1-4.9 0h-3a2.5 2.5 0 0 1-4.9 0H5.3a1.3 1.3 0 0 1-1.3-1.3v-.8a2 2 0 0 1 1.5-1.9z"
        fill="#f8fafc"
      />
      <path d="M4.9 7.6h4.2v2.2H4.9a1 1 0 0 1 0-2.2z" fill="#7dd3fc" />
      <circle cx="7.2" cy="15.6" r="1.1" fill="#0f172a" />
      <circle cx="16.8" cy="15.6" r="1.1" fill="#0f172a" />
    </svg>
  )
}