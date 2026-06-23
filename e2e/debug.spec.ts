import { test, expect } from '@playwright/test'

test('debug home page', async ({ page }) => {
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
  await page.waitForTimeout(5000)

  const html = await page.content()
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  console.log('=== BODY HTML ===')
  console.log(bodyMatch ? bodyMatch[1].substring(0, 2000) : 'NO BODY FOUND')
  console.log('=== END BODY HTML ===')

  const text = await page.locator('body').innerText()
  console.log('=== PAGE TEXT ===')
  console.log(text)
  console.log('=== END PAGE TEXT ===')

  // Check if root div exists
  const rootHtml = await page.locator('#root').innerHTML().catch(() => 'ROOT NOT FOUND')
  console.log('=== ROOT HTML ===')
  console.log(rootHtml)
  console.log('=== END ROOT HTML ===')
})

test('debug music page', async ({ page }) => {
  await page.route('**/api/music', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ music: [] }) })
  })

  page.on('console', msg => console.log(`[CONSOLE ${msg.type()}] ${msg.text()}`))
  page.on('pageerror', err => console.log(`[PAGE ERROR] ${err.message}`))
  page.on('requestfailed', req => console.log(`[REQUEST FAILED] ${req.url()} - ${req.failure()?.errorText}`))

  await page.goto('/music')
  await page.waitForTimeout(5000)

  const html = await page.content()
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  console.log('=== BODY HTML ===')
  console.log(bodyMatch ? bodyMatch[1].substring(0, 2000) : 'NO BODY FOUND')
  console.log('=== END BODY HTML ===')

  const text = await page.locator('body').innerText()
  console.log('=== PAGE TEXT ===')
  console.log(text)
  console.log('=== END PAGE TEXT ===')

  const rootHtml = await page.locator('#root').innerHTML().catch(() => 'ROOT NOT FOUND')
  console.log('=== ROOT HTML ===')
  console.log(rootHtml)
  console.log('=== END ROOT HTML ===')
})
