import { timeCardDayWarning, type TimeCardValue } from '@quick-filler/domain'
import { PlusIcon, TrashIcon } from '../components/icons'
import {
  buttonQuiet,
  dangerIconButton,
  eyebrow,
  iconButton,
  inlineAction,
  recordSection,
  tableCell,
  tableHeadCell,
  textInput,
} from '../components/ui-classes'

type Props = {
  value: TimeCardValue
  onChange(value: TimeCardValue): void
}

export function TimeCardEditor({ value, onChange }: Props) {
  const days = value.pages.flatMap((page) => page.days.map((day) => ({ day, page: page.page })))
  const updateDay = (
    pageIndex: number,
    dayIndex: number,
    updater: (day: TimeCardValue['pages'][number]['days'][number]) => void,
  ) => {
    const next = structuredClone(value)
    updater(next.pages[pageIndex]!.days[dayIndex]!)
    onChange(next)
  }
  const removeDay = (pageIndex: number, dayIndex: number) => {
    const next = structuredClone(value)
    next.pages[pageIndex]!.days.splice(dayIndex, 1)
    onChange(next)
  }
  const addDay = (pageIndex: number) => {
    const next = structuredClone(value)
    next.pages[pageIndex]!.days.push({ date_raw: '', punches: [] })
    onChange(next)
  }

  let linearIndex = 0
  return (
    <div className="grid gap-3.5 p-2 min-[1025px]:p-3.5">
      {value.pages.map((page, pageIndex) => (
        <section className={recordSection} key={`${page.page}-${pageIndex}`}>
          <div className="flex min-h-16 flex-col items-start justify-between gap-3 px-3.5 py-3 min-[1025px]:flex-row min-[1025px]:items-center min-[1025px]:gap-4.5">
            <div>
              <span className={`${eyebrow} text-[9px]`}>Página física {page.page}</span>
              <h2 className="mt-1 font-display text-base font-bold">Batidas registradas</h2>
            </div>
            <button className={buttonQuiet} type="button" onClick={() => addDay(pageIndex)}>
              <PlusIcon /> Adicionar dia
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={`${tableHeadCell} w-42.5`}>Data</th>
                  <th className={tableHeadCell}>Batidas</th>
                  <th className={`${tableHeadCell} w-13`}>
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {page.days.map((day, dayIndex) => {
                  const previous = days[linearIndex - 1]?.day
                  const warning = timeCardDayWarning(day, previous)
                  const warningClasses =
                    warning?.severity === 'red'
                      ? '[&_td]:bg-red-100 [&_td:first-child]:border-l-4 [&_td:first-child]:border-l-red-500'
                      : warning?.severity === 'yellow'
                        ? '[&_td]:bg-amber-100'
                        : ''
                  linearIndex += 1
                  return (
                    <tr key={dayIndex} className={warningClasses}>
                      <td className={`${tableCell} w-42.5`}>
                        <input
                          className={textInput}
                          aria-label={`Data do dia ${dayIndex + 1}`}
                          value={day.date_raw}
                          onChange={(event) =>
                            updateDay(pageIndex, dayIndex, (current) => {
                              current.date_raw = event.target.value
                            })
                          }
                        />
                        {warning && (
                          <span
                            className="mt-1.5 block max-w-37.5 text-[9px] leading-snug text-amber-800"
                            title={warning.reasons.join('. ')}
                          >
                            {warning.reasons.join(' · ')}
                          </span>
                        )}
                      </td>
                      <td className={tableCell}>
                        <div className="flex flex-wrap gap-2">
                          {day.punches.map((punch, punchIndex) => (
                            <div
                              className="grid grid-cols-[minmax(72px,86px)_34px] gap-1"
                              key={punchIndex}
                            >
                              <span className="col-span-full text-[9px] font-bold uppercase text-slate-500">
                                {punch.kind === 'IN' ? 'Entrada' : 'Saída'}{' '}
                                {Math.floor(punchIndex / 2) + 1}
                              </span>
                              <input
                                className={`${textInput} min-w-17.5`}
                                aria-label={`${punch.kind === 'IN' ? 'Entrada' : 'Saída'} ${punchIndex + 1}`}
                                value={punch.time_raw}
                                onChange={(event) =>
                                  updateDay(pageIndex, dayIndex, (current) => {
                                    const target = current.punches[punchIndex]!
                                    target.time_raw = event.target.value
                                    target.time_hhmm = event.target.value.padStart(5, '0')
                                  })
                                }
                              />
                              <button
                                className={`${iconButton} size-8.5`}
                                type="button"
                                aria-label="Remover batida"
                                onClick={() =>
                                  updateDay(pageIndex, dayIndex, (current) => {
                                    current.punches.splice(punchIndex, 1)
                                    current.punches.forEach((item, index) => {
                                      item.kind = index % 2 === 0 ? 'IN' : 'OUT'
                                    })
                                  })
                                }
                              >
                                <TrashIcon />
                              </button>
                            </div>
                          ))}
                          <button
                            className={inlineAction}
                            type="button"
                            onClick={() =>
                              updateDay(pageIndex, dayIndex, (current) => {
                                current.punches.push({
                                  kind: current.punches.length % 2 === 0 ? 'IN' : 'OUT',
                                  time_raw: '',
                                  time_hhmm: '??:??',
                                })
                              })
                            }
                          >
                            <PlusIcon /> Batida
                          </button>
                        </div>
                      </td>
                      <td className={`${tableCell} w-13`}>
                        <button
                          className={dangerIconButton}
                          type="button"
                          aria-label="Remover dia"
                          onClick={() => removeDay(pageIndex, dayIndex)}
                        >
                          <TrashIcon />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  )
}
