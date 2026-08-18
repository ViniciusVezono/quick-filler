import { payrollPageWarning, type PayrollEntry, type PayrollValue } from '@quick-filler/domain'
import { PlusIcon, TrashIcon } from '../../components/icons'
import {
  dangerIconButton,
  eyebrow,
  inlineAction,
  recordSection,
  tableCell,
  tableHeadCell,
  textInput,
} from '../../components/ui-classes'

type Props = { value: PayrollValue; onChange(value: PayrollValue): void }

export function PayrollEditor({ value, onChange }: Props) {
  const updatePage = (
    pageIndex: number,
    updater: (page: PayrollValue['pages'][number]) => void,
  ) => {
    const next = structuredClone(value)
    updater(next.pages[pageIndex]!)
    onChange(next)
  }

  const renderEntries = (entries: PayrollEntry[], pageIndex: number, key: 'fields' | 'bases') => (
    <div className="overflow-x-auto">
      <table className="w-full min-w-165 border-collapse">
        <thead>
          <tr>
            <th className={`${tableHeadCell} w-22.5`}>Código</th>
            <th className={`${tableHeadCell} min-w-52.5`}>Descrição</th>
            <th className={`${tableHeadCell} w-30`}>Referência</th>
            <th className={`${tableHeadCell} w-30`}>Valor</th>
            <th className={`${tableHeadCell} w-12.5`}>
              <span className="sr-only">Ações</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, entryIndex) => (
            <tr key={entryIndex}>
              {(['code', 'label', 'reference', 'value'] as const).map((field) => (
                <td className={tableCell} key={field}>
                  <input
                    className={textInput}
                    aria-label={`${field} ${entryIndex + 1}`}
                    value={entry[field] ?? ''}
                    onChange={(event) =>
                      updatePage(pageIndex, (page) => {
                        page[key][entryIndex]![field] = event.target.value
                      })
                    }
                  />
                </td>
              ))}
              <td className={tableCell}>
                <button
                  className={dangerIconButton}
                  type="button"
                  aria-label={`Remover ${key === 'fields' ? 'verba' : 'base'}`}
                  onClick={() =>
                    updatePage(pageIndex, (page) => {
                      page[key].splice(entryIndex, 1)
                    })
                  }
                >
                  <TrashIcon />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  const addEntry = (pageIndex: number, key: 'fields' | 'bases') =>
    updatePage(pageIndex, (page) => {
      page[key].push({ code: '', label: '', reference: '', value: '' })
    })

  return (
    <div className="grid gap-3.5 p-2 min-[1025px]:p-3.5">
      {value.pages.map((page, pageIndex) => {
        const warning = payrollPageWarning(page, value.pages[pageIndex - 1])
        const warningClasses =
          warning?.severity === 'red'
            ? 'border-l-4 border-l-red-500 bg-red-100'
            : warning?.severity === 'yellow'
              ? 'bg-amber-100'
              : ''
        return (
          <section
            className={`${recordSection} ${warningClasses}`}
            key={`${page.page}-${page.month}-${page.year}-${pageIndex}`}
          >
            <div className="flex min-h-16 flex-col items-start gap-2.5 px-3.5 py-3 min-[1025px]:flex-row min-[1025px]:items-center min-[1025px]:gap-4.5">
              <div>
                <span className={`${eyebrow} text-[9px]`}>Página física {page.page}</span>
                <h2 className="mt-1 font-display text-base font-bold">Competência</h2>
              </div>
              <div className="flex items-end gap-1.5 min-[1025px]:ml-auto">
                <label className="grid gap-1 text-[9px] font-bold uppercase text-slate-500">
                  Mês
                  <input
                    className={`${textInput} w-14.5`}
                    value={page.month}
                    aria-label="Mês"
                    onChange={(event) =>
                      updatePage(pageIndex, (current) => {
                        current.month = event.target.value
                      })
                    }
                  />
                </label>
                <span className="pb-1.5 text-slate-500">/</span>
                <label className="grid gap-1 text-[9px] font-bold uppercase text-slate-500">
                  Ano
                  <input
                    className={`${textInput} w-19.5`}
                    value={page.year}
                    aria-label="Ano"
                    onChange={(event) =>
                      updatePage(pageIndex, (current) => {
                        current.year = event.target.value
                      })
                    }
                  />
                </label>
              </div>
            </div>
            {warning && (
              <div className="mx-3.5 mb-2.5 rounded-lg bg-white/65 px-2.5 py-2 text-[11px] text-amber-800">
                {warning.reasons.join(' · ')}
              </div>
            )}
            <div className="flex min-h-10.5 items-center justify-between border-t border-slate-200 px-3.5 py-2">
              <h3 className="font-display text-xs font-bold">Verbas</h3>
              <button
                className={inlineAction}
                type="button"
                onClick={() => addEntry(pageIndex, 'fields')}
              >
                <PlusIcon /> Adicionar verba
              </button>
            </div>
            {renderEntries(page.fields, pageIndex, 'fields')}
            <div className="mt-2 flex min-h-10.5 items-center justify-between border-t border-slate-200 px-3.5 py-2">
              <h3 className="font-display text-xs font-bold">Bases e totais</h3>
              <button
                className={inlineAction}
                type="button"
                onClick={() => addEntry(pageIndex, 'bases')}
              >
                <PlusIcon /> Adicionar base
              </button>
            </div>
            {renderEntries(page.bases, pageIndex, 'bases')}
          </section>
        )
      })}
    </div>
  )
}
