export const buttonBase =
  'inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-transparent px-4.5 font-bold no-underline transition duration-150 hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 [&_svg]:size-4.5'

export const buttonPrimary = `${buttonBase} bg-navy-800 text-white hover:bg-navy-700`

export const buttonSecondary = `${buttonBase} border-slate-300 bg-white text-navy-900 hover:border-navy-700 hover:bg-blue-50/50`

export const buttonQuiet = `${buttonBase} min-h-9 border-slate-300 bg-transparent px-3 text-xs text-navy-700`

export const iconButton =
  'inline-grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg border border-slate-300 bg-white p-0 text-slate-500 transition hover:border-slate-400 hover:text-navy-700 [&_svg]:size-4.5'

export const dangerIconButton = `${iconButton} hover:border-red-300 hover:bg-red-50 hover:text-red-700`

export const textInput =
  'h-8.5 w-full min-w-18 rounded-lg border border-slate-300 bg-white px-2.5 text-[13px] text-slate-800 transition hover:border-slate-400 focus:border-navy-700 focus:outline-none focus:ring-3 focus:ring-blue-200/60'

export const eyebrow = 'text-[10px] font-bold uppercase tracking-[.08em] text-navy-700'

export const inlineAction =
  'inline-flex min-h-8.5 cursor-pointer items-center gap-1.5 self-end rounded-lg border border-dashed border-slate-400 bg-transparent px-2.5 text-[11px] font-bold text-navy-700 transition hover:border-navy-700 hover:bg-blue-50 [&_svg]:size-3.5'

export const recordSection = 'overflow-hidden rounded-xl border border-slate-200 bg-white'

export const panelHeading =
  'flex min-h-12 items-center justify-between border-b border-slate-200 px-4 text-xs text-slate-600'

export const tableHeadCell =
  'h-9.5 whitespace-nowrap border-y border-slate-200 bg-slate-50 px-2.5 text-left text-[10px] font-bold uppercase tracking-[.05em] text-slate-500'

export const tableCell = 'border-b border-slate-100 px-2.5 py-2.5 align-top last:border-b-0'
