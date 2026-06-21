# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: music.spec.ts >> Add Music Flow >> admin can upload a track with cover image
- Location: e2e\music.spec.ts:202:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: /auto dj/i })

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - navigation [ref=e3]:
    - generic [ref=e4]:
      - link "ZIONITEFM The Voice of Redemption" [ref=e5] [cursor=pointer]:
        - /url: /
        - img [ref=e7]
        - generic [ref=e10]:
          - generic [ref=e11]: ZIONITEFM
          - generic [ref=e12]: The Voice of Redemption
      - generic [ref=e13]:
        - link "Home" [ref=e14] [cursor=pointer]:
          - /url: /
        - link "Live Radio" [ref=e15] [cursor=pointer]:
          - /url: /live
        - link "Sermons" [ref=e16] [cursor=pointer]:
          - /url: /archive
        - link "Music" [ref=e17] [cursor=pointer]:
          - /url: /music
        - link "Podcasts" [ref=e18] [cursor=pointer]:
          - /url: /podcasts
        - link "Prayer Wall" [ref=e19] [cursor=pointer]:
          - /url: /prayer
        - link "Events" [ref=e20] [cursor=pointer]:
          - /url: /events
        - link "About Us" [ref=e21] [cursor=pointer]:
          - /url: /about
      - generic [ref=e22]:
        - button "Search sermons, topics, speakers..." [ref=e23] [cursor=pointer]:
          - img [ref=e24]
          - generic [ref=e27]: Search sermons, topics, speakers...
        - button [ref=e29] [cursor=pointer]:
          - img [ref=e30]
        - button "Donate" [ref=e35] [cursor=pointer]:
          - img [ref=e36]
          - text: Donate
  - generic [ref=e39]:
    - banner [ref=e40]:
      - link "Back to home" [ref=e41] [cursor=pointer]:
        - /url: /
        - img [ref=e42]
        - text: Back to home
    - main [ref=e44]:
      - generic [ref=e45]:
        - generic [ref=e46]:
          - img [ref=e48]
          - heading "Welcome Back" [level=1] [ref=e54]
          - paragraph [ref=e55]: Sign in to your account
        - generic [ref=e56]:
          - generic [ref=e57]:
            - generic [ref=e58]:
              - generic [ref=e59]: Email Address
              - textbox "you@example.com" [ref=e60]
            - generic [ref=e61]:
              - generic [ref=e62]: Password
              - textbox "Enter your password" [ref=e63]
              - paragraph [ref=e64]: Must be at least 6 characters
            - button "Sign In" [ref=e65] [cursor=pointer]:
              - img [ref=e66]
              - text: Sign In
          - paragraph [ref=e70]:
            - text: Don't have an account?
            - button "Create one" [ref=e71] [cursor=pointer]
```

# Test source

```ts
  213 |     })
  214 | 
  215 |     await page.route('**/api/broadcasts', async (route) => {
  216 |       await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ broadcasts: [] }) })
  217 |     })
  218 | 
  219 |     await page.route('**/api/broadcasts/stats/overview', async (route) => {
  220 |       await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ total: 0, live: 0, ended: 0 }) })
  221 |     })
  222 | 
  223 |     await page.route('**/api/auth/users', async (route) => {
  224 |       await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ users: [] }) })
  225 |     })
  226 | 
  227 |     await page.route('**/api/sermons', async (route) => {
  228 |       await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ sermons: [] }) })
  229 |     })
  230 | 
  231 |     await page.route('**/api/music', async (route) => {
  232 |       if (route.request().method() === 'POST') {
  233 |         const postData = route.request().postData()
  234 |         let title = ''
  235 |         let artist = ''
  236 |         let album = ''
  237 |         let genre = ''
  238 |         let duration = ''
  239 |         let lyrics = ''
  240 |         let hasAudio = false
  241 |         let hasCover = false
  242 | 
  243 |         if (postData && typeof postData === 'string' && postData.includes('------')) {
  244 |           // multipart form data
  245 |           const parts = postData.split(/------[\w-]+/)
  246 |           for (const part of parts) {
  247 |             if (part.includes('name="title"')) title = part.split('\r\n\r\n')[1]?.trim() || ''
  248 |             if (part.includes('name="artist"')) artist = part.split('\r\n\r\n')[1]?.trim() || ''
  249 |             if (part.includes('name="album"')) album = part.split('\r\n\r\n')[1]?.trim() || ''
  250 |             if (part.includes('name="genre"')) genre = part.split('\r\n\r\n')[1]?.trim() || ''
  251 |             if (part.includes('name="duration"')) duration = part.split('\r\n\r\n')[1]?.trim() || ''
  252 |             if (part.includes('name="lyrics"')) lyrics = part.split('\r\n\r\n')[1]?.trim() || ''
  253 |             if (part.includes('name="audio"')) hasAudio = true
  254 |             if (part.includes('name="cover"')) hasCover = true
  255 |           }
  256 |         }
  257 | 
  258 |         const id = `track-${Date.now()}`
  259 |         musicTracks.push({
  260 |           id,
  261 |           title,
  262 |           artist,
  263 |           album,
  264 |           genre,
  265 |           audio_url: hasAudio ? 'data:audio/mpeg;base64,mock' : '',
  266 |           cover_url: hasCover ? 'data:image/png;base64,mockcover' : '',
  267 |           duration: parseInt(duration) || 0,
  268 |           lyrics,
  269 |           file_format: hasAudio ? 'audio/mpeg' : '',
  270 |           file_size: hasAudio ? 1024 : 0,
  271 |           created_at: new Date().toISOString()
  272 |         })
  273 |         await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id, title }) })
  274 |       } else {
  275 |         await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ music: musicTracks }) })
  276 |       }
  277 |     })
  278 | 
  279 |     await page.route('**/api/prayer', async (route) => {
  280 |       await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ prayers: [] }) })
  281 |     })
  282 | 
  283 |     await page.route('**/api/analytics/dashboard', async (route) => {
  284 |       await route.fulfill({
  285 |         status: 200,
  286 |         contentType: 'application/json',
  287 |         body: JSON.stringify({
  288 |           stats: { listenersOnline: 0, totalListenersToday: 0, sermonCount: 0, podcastCount: 0, prayerCount: 0, totalDonations: 0 },
  289 |           platformBreakdown: [],
  290 |           recentSermons: [],
  291 |           pendingTestimonies: [],
  292 |           recentDonations: [],
  293 |           activeCampaigns: [],
  294 |           transcripts: [],
  295 |           listenerHistory: []
  296 |         })
  297 |       })
  298 |     })
  299 | 
  300 |     await page.route('**/api/chat/**', async (route) => {
  301 |       await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ messages: [] }) })
  302 |     })
  303 | 
  304 |     await page.goto('/login')
  305 |     await page.evaluate(() => {
  306 |       localStorage.setItem('token', 'mock-admin-token')
  307 |       localStorage.setItem('user', JSON.stringify({ id: 'admin-1', email: 'admin@zionite.online', name: 'Admin User', role: 'admin' }))
  308 |     })
  309 | 
  310 |     await page.goto('/admin')
  311 |     await expect(page.getByText(/welcome back/i)).toBeVisible()
  312 | 
> 313 |     await page.getByRole('button', { name: /auto dj/i }).click()
      |                                                          ^ Error: locator.click: Test timeout of 30000ms exceeded.
  314 |     await expect(page.getByRole('heading', { name: /add music/i })).toBeVisible()
  315 | 
  316 |     // Ensure File Upload mode is selected
  317 |     await page.getByRole('button', { name: /file upload/i }).click()
  318 | 
  319 |     // Upload audio file
  320 |     await page.locator('input[type="file"]').first().setInputFiles({
  321 |       name: 'test-audio.mp3',
  322 |       mimeType: 'audio/mpeg',
  323 |       buffer: Buffer.from('mock audio data')
  324 |     })
  325 | 
  326 |     // Upload cover image
  327 |     await page.locator('input[type="file"]').nth(1).setInputFiles({
  328 |       name: 'test-cover.png',
  329 |       mimeType: 'image/png',
  330 |       buffer: Buffer.from('mock image data')
  331 |     })
  332 | 
  333 |     await page.getByPlaceholder('Title *').fill('Track With Cover')
  334 |     await page.getByPlaceholder('Artist').fill('Cover Artist')
  335 |     await page.getByPlaceholder('Album').fill('Cover Album')
  336 |     await page.locator('select').selectOption('Gospel')
  337 |     await page.getByPlaceholder('Duration (seconds)').fill('200')
  338 | 
  339 |     await page.getByRole('button', { name: /add track/i }).click()
  340 | 
  341 |     await expect(page.getByText('Track With Cover')).toBeVisible()
  342 |     await expect(page.getByText('Cover Artist')).toBeVisible()
  343 |     await expect(page.getByText('Cover Album')).toBeVisible()
  344 |   })
  345 | })
  346 | 
```