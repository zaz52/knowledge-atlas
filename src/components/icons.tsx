import type { ReactNode, SVGProps } from 'react'

type IconProps = Omit<SVGProps<SVGSVGElement>, 'name'> & { size?: number; strokeWidth?: number }
type IconName =
  | 'arrow-left'
  | 'arrow-right'
  | 'arrow-up-right'
  | 'arrow-down'
  | 'book'
  | 'bug'
  | 'clock'
  | 'compass'
  | 'droplets'
  | 'flower'
  | 'lightbulb'
  | 'pointer'
  | 'orbit'
  | 'scroll'
  | 'search'
  | 'sprout'
  | 'sun'
  | 'close'
  | 'filter'
  | 'more'
  | 'reset'
  | 'nodes'

const paths: Record<IconName, ReactNode> = {
  filter: <path d="M4 6h16M7 12h10m-7 6h4M8 3v6m8 0v6m-4 0v6" />,
  more: (
    <>
      <circle cx="5" cy="12" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
    </>
  ),
  reset: (
    <>
      <path d="M3 10a9 9 0 1 1 2 8M3 4v6h6" />
    </>
  ),
  nodes: (
    <>
      <circle cx="6" cy="6" r="3" />
      <circle cx="18" cy="8" r="3" />
      <circle cx="10" cy="19" r="3" />
      <path d="m9 6 6 1M7 9l2 7m7-5-4 5" />
    </>
  ),
  'arrow-left': (
    <>
      <path d="M19 12H5m7-7-7 7 7 7" />
    </>
  ),
  'arrow-right': (
    <>
      <path d="M5 12h14m-7-7 7 7-7 7" />
    </>
  ),
  'arrow-up-right': (
    <>
      <path d="M7 17 17 7M7 7h10v10" />
    </>
  ),
  'arrow-down': (
    <>
      <path d="M12 5v14m-7-7 7 7 7-7" />
    </>
  ),
  book: (
    <>
      <path d="M12 5C8 2 4 3 2 4v15c4-1 7-1 10 1 3-2 6-2 10-1V4c-2-1-6-2-10 1Zm0 0v15" />
    </>
  ),
  bug: (
    <>
      <rect x="7" y="7" width="10" height="14" rx="5" />
      <path d="M9 7V5a3 3 0 0 1 6 0v2M7 11H3m4 5H3m14-5h4m-4 5h4M8 8 5 5m11 3 3-3m-7 6v9" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m16 8-2 6-6 2 2-6 6-2Z" />
    </>
  ),
  droplets: (
    <>
      <path d="M9 3S3 9 3 13a6 6 0 0 0 12 0c0-4-6-10-6-10Zm9 0s-3 4-3 6a3 3 0 0 0 6 0c0-2-3-6-3-6Z" />
    </>
  ),
  flower: (
    <>
      <path d="M12 8C5 0 0 9 8 12c-8 6 2 12 4 4 4 8 13 1 4-4 8-4 2-12-4-4Zm0 8v7m0-3c-5 0-7-2-7-4 4 0 7 1 7 4Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  lightbulb: (
    <>
      <path d="M9 18v-2c-7-5-3-13 3-13s10 8 3 13v2H9Zm0 3h6" />
    </>
  ),
  pointer: (
    <>
      <path d="m4 3 7 18 3-7 7-3L4 3Z" />
    </>
  ),
  orbit: (
    <>
      <circle cx="12" cy="12" r="3" />
      <ellipse cx="12" cy="12" rx="11" ry="5" transform="rotate(-35 12 12)" />
      <ellipse cx="12" cy="12" rx="11" ry="5" transform="rotate(60 12 12)" />
    </>
  ),
  scroll: (
    <>
      <path d="M6 3h12a3 3 0 0 1 3 3v2h-5V6a3 3 0 0 0-6 0v12a3 3 0 0 1-6 0v-2h12v2a3 3 0 0 0 6 0V8M10 11h6m-6 3h6M6 3a3 3 0 0 0-3 3v2h7" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m16 16 5 5" />
    </>
  ),
  sprout: (
    <>
      <path d="M12 22V12C5 13 2 8 3 4c7-1 10 3 9 8 0-6 4-10 10-9 1 6-3 10-10 9M7 22h10" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 1v2m0 18v2M1 12h2m18 0h2M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2" />
    </>
  ),
  close: (
    <>
      <path d="m6 6 12 12M6 18 18 6" />
    </>
  ),
}

function Icon({ name, size = 24, strokeWidth = 2, ...props }: IconProps & { name: IconName }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name]}
    </svg>
  )
}

export function ArrowLeft(props: IconProps) {
  return <Icon name="arrow-left" {...props} />
}
export function ArrowRight(props: IconProps) {
  return <Icon name="arrow-right" {...props} />
}
export function ArrowUpRight(props: IconProps) {
  return <Icon name="arrow-up-right" {...props} />
}
export function MoveUpRight(props: IconProps) {
  return <Icon name="arrow-up-right" {...props} />
}
export function ArrowDown(props: IconProps) {
  return <Icon name="arrow-down" {...props} />
}
export function BookOpen(props: IconProps) {
  return <Icon name="book" {...props} />
}
export function Bug(props: IconProps) {
  return <Icon name="bug" {...props} />
}
export function Clock3(props: IconProps) {
  return <Icon name="clock" {...props} />
}
export function Compass(props: IconProps) {
  return <Icon name="compass" {...props} />
}
export function Droplets(props: IconProps) {
  return <Icon name="droplets" {...props} />
}
export function Flower2(props: IconProps) {
  return <Icon name="flower" {...props} />
}
export function Lightbulb(props: IconProps) {
  return <Icon name="lightbulb" {...props} />
}
export function MousePointer2(props: IconProps) {
  return <Icon name="pointer" {...props} />
}
export function Orbit(props: IconProps) {
  return <Icon name="orbit" {...props} />
}
export function ScrollText(props: IconProps) {
  return <Icon name="scroll" {...props} />
}
export function Search(props: IconProps) {
  return <Icon name="search" {...props} />
}
export function Sprout(props: IconProps) {
  return <Icon name="sprout" {...props} />
}
export function Sun(props: IconProps) {
  return <Icon name="sun" {...props} />
}
export function X(props: IconProps) {
  return <Icon name="close" {...props} />
}
export function Filter(props: IconProps) {
  return <Icon name="filter" {...props} />
}
export function MoreHorizontal(props: IconProps) {
  return <Icon name="more" {...props} />
}
export function RotateCcw(props: IconProps) {
  return <Icon name="reset" {...props} />
}
export function ListTree(props: IconProps) {
  return <Icon name="nodes" {...props} />
}
