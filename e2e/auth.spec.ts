import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('can navigate to login page', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible({ timeout: 10000 })
  })

  test('shows validation error for empty fields', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page.locator('input:invalid')).toHaveCount(2)
  })

  test('can toggle to registration', async ({ page }) => {
    await page.goto('/login')
    await page.getByText(/create one/i).click()
    await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible()
  })
})

test.describe('Navigation', () => {
  test('home page loads', async ({ page }) => {
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
    await page.goto('/')
    await expect(page.getByText(/zionite\s*fm/i).first()).toBeVisible({ timeout: 20000 })
  })

  test('archive page loads', async ({ page }) => {
    await page.route('**/api/sermons', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ sermons: [] }) })
    })
    await page.goto('/archive')
    await expect(page.getByRole('heading', { name: /sermon archive/i })).toBeVisible()
  })
})
