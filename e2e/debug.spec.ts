import { test, expect } from '@playwright/test'

test('debug home page', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'serviceWorker', { value: undefined, writable: false })
  })
  await page.route('**/api/broadcasts/active', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ broadcast: null }) })
  })
  await page.route('**/api/sermons', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ sermons: [] }) })
  })
  await page.route('**/api/music', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ music: [] }) })
  })
  await page.route('**/api/guest-speakers', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ speakers: [] }) })
  })
  await page.route('**/api/events', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ events: [] }) })
  })

  page.on('console', msg => console.log(`[CONSOLE ${msg.type()}] ${msg.text()}`))
  page.on('pageerror', err => console.log(`[PAGE ERROR] ${err.message}`))
  page.on('requestfailed', req => console.log(`[REQUEST FAILED] ${req.url()} - ${req.failure()?.errorText}`))

  await page.goto('/')
  await page.waitForTimeout(3000)

  const html = await page.content()
  console.log('=== PAGE HTML (first 3000 chars) ===')
  console.log(html.substring(0, 3000))
  console.log('=== END PAGE HTML ===')

  const text = await page.locator('body').innerText()
  console.log('=== PAGE TEXT ===')
  console.log(text)
  console.log('=== END PAGE TEXT ===')

  await page.screenshot({ path: 'c:/zionite/debug-home.png', fullPage: true })
})

test('debug music page', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'serviceWorker', { value: undefined, writable: false })
  })
  await page.route('**/api/music', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ music: [] }) })
  })

  page.on('console', msg => console.log(`[CONSOLE ${msg.type()}] ${msg.text()}`))
  page.on('pageerror', err => console.log(`[PAGE ERROR] ${err.message}`))
  page.on('requestfailed', req => console.log(`[REQUEST FAILED] ${req.url()} - ${req.failure()?.errorText}`))

  await page.goto('/music')
  await page.waitForTimeout(3000)

  const html = await page.content()
  console.log('=== PAGE HTML (first 3000 chars) ===')
  console.log(html.substring(0, 3000))
  console.log('=== END PAGE HTML ===')

  const text = await page.locator('body').innerText()
  console.log('=== PAGE TEXT ===')
  console.log(text)
  console.log('=== END PAGE TEXT ===')

  await page.screenshot({ path: 'c:/zionite/debug-music.png', fullPage: true })
})
