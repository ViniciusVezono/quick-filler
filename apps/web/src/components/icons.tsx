import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

function Icon({ children, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" {...props}>
      {children}
    </svg>
  )
}

export const UploadIcon = (props: IconProps) => (
  <Icon {...props}><path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5"/><path d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"/></Icon>
)
export const FileIcon = (props: IconProps) => (
  <Icon {...props}><path d="M7 3h7l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M14 3v5h5M8.5 13h7M8.5 17h5"/></Icon>
)
export const SaveIcon = (props: IconProps) => (
  <Icon {...props}><path d="M5 4h12l2 2v14H5V4Z"/><path d="M8 4v6h8V4M8 20v-6h8v6"/></Icon>
)
export const DownloadIcon = (props: IconProps) => (
  <Icon {...props}><path d="M12 4v11m0 0 4-4m-4 4-4-4"/><path d="M5 19h14"/></Icon>
)
export const PlusIcon = (props: IconProps) => (
  <Icon {...props}><path d="M12 5v14M5 12h14"/></Icon>
)
export const TrashIcon = (props: IconProps) => (
  <Icon {...props}><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13"/><path d="M10 11v5M14 11v5"/></Icon>
)
export const ArrowLeftIcon = (props: IconProps) => (
  <Icon {...props}><path d="m14 6-6 6 6 6"/></Icon>
)
export const CheckIcon = (props: IconProps) => (
  <Icon {...props}><path d="m5 12 4 4L19 6"/></Icon>
)
export const AlertIcon = (props: IconProps) => (
  <Icon {...props}><path d="M12 3 2.5 20h19L12 3Z"/><path d="M12 9v5m0 3v.1"/></Icon>
)
