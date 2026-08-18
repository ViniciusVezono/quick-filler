import { payrollPageWarning, type PayrollEntry, type PayrollValue } from '@quick-filler/domain'
import { PlusIcon, TrashIcon } from '../../components/icons'

type Props = { value: PayrollValue; onChange(value: PayrollValue): void }

export function PayrollEditor({ value, onChange }: Props) {
  const updatePage = (pageIndex: number, updater: (page: PayrollValue['pages'][number]) => void) => {
    const next = structuredClone(value)
    updater(next.pages[pageIndex]!)
    onChange(next)
  }

  const renderEntries = (entries: PayrollEntry[], pageIndex: number, key: 'fields' | 'bases') => (
    <div className="table-scroll">
      <table className="review-table payroll-table">
        <thead><tr><th>Código</th><th>Descrição</th><th>Referência</th><th>Valor</th><th><span className="sr-only">Ações</span></th></tr></thead>
        <tbody>
          {entries.map((entry, entryIndex) => (
            <tr key={entryIndex}>
              {(['code', 'label', 'reference', 'value'] as const).map((field) => (
                <td key={field}><input aria-label={`${field} ${entryIndex + 1}`} value={entry[field] ?? ''} onChange={(event) => updatePage(pageIndex, (page) => { page[key][entryIndex]![field] = event.target.value })} /></td>
              ))}
              <td><button className="icon-button danger" type="button" aria-label={`Remover ${key === 'fields' ? 'verba' : 'base'}`} onClick={() => updatePage(pageIndex, (page) => { page[key].splice(entryIndex, 1) })}><TrashIcon /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  const addEntry = (pageIndex: number, key: 'fields' | 'bases') => updatePage(pageIndex, (page) => {
    page[key].push({ code: '', label: '', reference: '', value: '' })
  })

  return (
    <div className="editor-stack">
      {value.pages.map((page, pageIndex) => {
        const warning = payrollPageWarning(page, value.pages[pageIndex - 1])
        return (
          <section className={`record-section ${warning ? `warning-${warning.severity}` : ''}`} key={`${page.page}-${page.month}-${page.year}-${pageIndex}`}>
            <div className="record-heading payroll-heading">
              <div><span className="eyebrow">Página física {page.page}</span><h2>Competência</h2></div>
              <div className="competence-fields">
                <label>Mês<input value={page.month} aria-label="Mês" onChange={(event) => updatePage(pageIndex, (current) => { current.month = event.target.value })} /></label>
                <span>/</span>
                <label>Ano<input value={page.year} aria-label="Ano" onChange={(event) => updatePage(pageIndex, (current) => { current.year = event.target.value })} /></label>
              </div>
            </div>
            {warning && <div className="warning-banner">{warning.reasons.join(' · ')}</div>}
            <div className="entry-heading"><h3>Verbas</h3><button className="inline-action" type="button" onClick={() => addEntry(pageIndex, 'fields')}><PlusIcon /> Adicionar verba</button></div>
            {renderEntries(page.fields, pageIndex, 'fields')}
            <div className="entry-heading bases-heading"><h3>Bases e totais</h3><button className="inline-action" type="button" onClick={() => addEntry(pageIndex, 'bases')}><PlusIcon /> Adicionar base</button></div>
            {renderEntries(page.bases, pageIndex, 'bases')}
          </section>
        )
      })}
    </div>
  )
}
