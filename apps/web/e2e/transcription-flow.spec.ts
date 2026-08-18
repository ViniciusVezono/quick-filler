import { expect, test, type Page } from '@playwright/test'

const fakePdf = Buffer.from('%PDF-1.4\n%%EOF')

async function mockFlow(page: Page, value: unknown, type: 'cartao-ponto' | 'holerite') {
  let reads = 0
  await page.route('**/api/transcricoes', async (route) => {
    await route.fulfill({ status: 202, contentType: 'application/json', body: JSON.stringify({ id: 'test-id' }) })
  })
  await page.route('**/api/transcricoes/test-id/arquivo', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/pdf', body: fakePdf })
  })
  await page.route('**/api/transcricoes/test-id/planilha?**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  })
  await page.route('**/api/transcricoes/test-id', async (route) => {
    if (route.request().method() === 'PUT') {
      const body = route.request().postDataJSON() as { value: unknown }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'test-id', tipo: type, status: 'concluido', erro: null, value: body.value }) })
      return
    }
    reads += 1
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'test-id', tipo: type, status: reads === 1 ? 'processando' : 'concluido', erro: null, value: reads === 1 ? null : value }) })
  })
}

test('cartão: upload, edição estrutural, save e download', async ({ page }) => {
  await mockFlow(page, { pages: [{ page: 1, days: [{ date_raw: '01/08/2026', punches: [{ kind: 'IN', time_raw: '08:00', time_hhmm: '08:00' }] }] }] }, 'cartao-ponto')
  await page.goto('/')
  await page.locator('#pdf-file').setInputFiles({ name: 'ponto.pdf', mimeType: 'application/pdf', buffer: fakePdf })
  await page.getByRole('button', { name: /Transcrever documento/ }).click()
  await expect(page.getByRole('heading', { name: 'Cartão de ponto' })).toBeVisible({ timeout: 5000 })
  await page.getByRole('button', { name: 'Batida', exact: true }).click()
  await page.getByRole('button', { name: 'Salvar correções' }).click()
  await expect(page.getByText('Salvo')).toBeVisible()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Baixar' }).click()
  await download
})

test('ficha financeira: preserva múltiplas competências da mesma página', async ({ page }) => {
  await mockFlow(page, { pages: [
    { page: 1, month: '01', year: '2026', fields: [{ code: '100', label: 'Salário', reference: '30', value: '2.500,00' }], bases: [] },
    { page: 1, month: '02', year: '2026', fields: [{ code: '100', label: 'Salário', reference: '30', value: '2.600,00' }], bases: [] },
  ] }, 'holerite')
  await page.goto('/')
  await page.getByText('Holerite', { exact: true }).click()
  await page.locator('#pdf-file').setInputFiles({ name: 'ficha.pdf', mimeType: 'application/pdf', buffer: fakePdf })
  await page.getByRole('button', { name: /Transcrever documento/ }).click()
  await expect(page.getByRole('heading', { name: 'Holerite' })).toBeVisible({ timeout: 5000 })
  await expect(page.getByLabel('Mês')).toHaveCount(2)
  await page.getByRole('button', { name: 'Adicionar base' }).first().click()
  await page.getByRole('button', { name: 'Salvar correções' }).click()
  await expect(page.getByText('Salvo')).toBeVisible()
})
