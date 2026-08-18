import { timeCardDayWarning, type TimeCardValue } from '@quick-filler/domain'
import { PlusIcon, TrashIcon } from '../../components/icons'

type Props = {
  value: TimeCardValue
  onChange(value: TimeCardValue): void
}

export function TimeCardEditor({ value, onChange }: Props) {
  const days = value.pages.flatMap((page) => page.days.map((day) => ({ day, page: page.page })))
  const updateDay = (pageIndex: number, dayIndex: number, updater: (day: TimeCardValue['pages'][number]['days'][number]) => void) => {
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
    <div className="editor-stack">
      {value.pages.map((page, pageIndex) => (
        <section className="record-section" key={`${page.page}-${pageIndex}`}>
          <div className="record-heading">
            <div><span className="eyebrow">Página física {page.page}</span><h2>Batidas registradas</h2></div>
            <button className="button button-quiet" type="button" onClick={() => addDay(pageIndex)}>
              <PlusIcon /> Adicionar dia
            </button>
          </div>
          <div className="table-scroll">
            <table className="review-table time-table">
              <thead><tr><th>Data</th><th>Batidas</th><th><span className="sr-only">Ações</span></th></tr></thead>
              <tbody>
                {page.days.map((day, dayIndex) => {
                  const previous = days[linearIndex - 1]?.day
                  const warning = timeCardDayWarning(day, previous)
                  linearIndex += 1
                  return (
                    <tr key={dayIndex} className={warning ? `warning-${warning.severity}` : undefined}>
                      <td className="date-cell">
                        <input aria-label={`Data do dia ${dayIndex + 1}`} value={day.date_raw} onChange={(event) => updateDay(pageIndex, dayIndex, (current) => { current.date_raw = event.target.value })} />
                        {warning && <span className="warning-copy" title={warning.reasons.join('. ')}>{warning.reasons.join(' · ')}</span>}
                      </td>
                      <td>
                        <div className="punch-list">
                          {day.punches.map((punch, punchIndex) => (
                            <div className="punch-field" key={punchIndex}>
                              <span>{punch.kind === 'IN' ? 'Entrada' : 'Saída'} {Math.floor(punchIndex / 2) + 1}</span>
                              <input aria-label={`${punch.kind === 'IN' ? 'Entrada' : 'Saída'} ${punchIndex + 1}`} value={punch.time_raw} onChange={(event) => updateDay(pageIndex, dayIndex, (current) => {
                                const target = current.punches[punchIndex]!
                                target.time_raw = event.target.value
                                target.time_hhmm = event.target.value.padStart(5, '0')
                              })} />
                              <button className="icon-button" type="button" aria-label="Remover batida" onClick={() => updateDay(pageIndex, dayIndex, (current) => {
                                current.punches.splice(punchIndex, 1)
                                current.punches.forEach((item, index) => { item.kind = index % 2 === 0 ? 'IN' : 'OUT' })
                              })}><TrashIcon /></button>
                            </div>
                          ))}
                          <button className="inline-action" type="button" onClick={() => updateDay(pageIndex, dayIndex, (current) => {
                            current.punches.push({ kind: current.punches.length % 2 === 0 ? 'IN' : 'OUT', time_raw: '', time_hhmm: '??:??' })
                          })}><PlusIcon /> Batida</button>
                        </div>
                      </td>
                      <td><button className="icon-button danger" type="button" aria-label="Remover dia" onClick={() => removeDay(pageIndex, dayIndex)}><TrashIcon /></button></td>
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
