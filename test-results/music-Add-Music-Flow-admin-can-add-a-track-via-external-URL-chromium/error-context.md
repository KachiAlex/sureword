# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: music.spec.ts >> Add Music Flow >> admin can add a track via external URL
- Location: e2e\music.spec.ts:4:7

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
  23  |     })
  24  | 
  25  |     await page.route('**/api/auth/users', async (route) => {
  26  |       await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ users: [] }) })
  27  |     })
  28  | 
  29  |     await page.route('**/api/sermons', async (route) => {
  30  |       await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ sermons: [] }) })
  31  |     })
  32  | 
  33  |     await page.route('**/api/music', async (route) => {
  34  |       if (route.request().method() === 'POST') {
  35  |         const postData = route.request().postData()
  36  |         let title = ''
  37  |         let artist = ''
  38  |         let album = ''
  39  |         let genre = ''
  40  |         let duration = ''
  41  |         let lyrics = ''
  42  |         let audio_url = ''
  43  |         let hasCover = false
  44  | 
  45  |         if (postData && typeof postData === 'string' && postData.includes('------')) {
  46  |           const parts = postData.split(/------[\w-]+/)
  47  |           for (const part of parts) {
  48  |             if (part.includes('name="title"')) title = part.split('\r\n\r\n')[1]?.trim() || ''
  49  |             if (part.includes('name="artist"')) artist = part.split('\r\n\r\n')[1]?.trim() || ''
  50  |             if (part.includes('name="album"')) album = part.split('\r\n\r\n')[1]?.trim() || ''
  51  |             if (part.includes('name="genre"')) genre = part.split('\r\n\r\n')[1]?.trim() || ''
  52  |             if (part.includes('name="duration"')) duration = part.split('\r\n\r\n')[1]?.trim() || ''
  53  |             if (part.includes('name="lyrics"')) lyrics = part.split('\r\n\r\n')[1]?.trim() || ''
  54  |             if (part.includes('name="audio_url"')) audio_url = part.split('\r\n\r\n')[1]?.trim() || ''
  55  |             if (part.includes('name="cover"')) hasCover = true
  56  |           }
  57  |         } else {
  58  |           const body = await route.request().postDataJSON()
  59  |           title = body.title || ''
  60  |           artist = body.artist || ''
  61  |           album = body.album || ''
  62  |           genre = body.genre || ''
  63  |           duration = body.duration || ''
  64  |           lyrics = body.lyrics || ''
  65  |           audio_url = body.audio_url || ''
  66  |         }
  67  | 
  68  |         const id = `track-${Date.now()}`
  69  |         musicTracks.push({
  70  |           id,
  71  |           title,
  72  |           artist,
  73  |           album,
  74  |           genre,
  75  |           audio_url,
  76  |           cover_url: hasCover ? 'data:image/png;base64,mockcover' : '',
  77  |           duration: parseInt(duration) || 0,
  78  |           lyrics,
  79  |           file_format: '',
  80  |           file_size: 0,
  81  |           created_at: new Date().toISOString()
  82  |         })
  83  |         await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id, title }) })
  84  |       } else {
  85  |         await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ music: musicTracks }) })
  86  |       }
  87  |     })
  88  | 
  89  |     await page.route('**/api/prayer', async (route) => {
  90  |       await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ prayers: [] }) })
  91  |     })
  92  | 
  93  |     await page.route('**/api/analytics/dashboard', async (route) => {
  94  |       await route.fulfill({
  95  |         status: 200,
  96  |         contentType: 'application/json',
  97  |         body: JSON.stringify({
  98  |           stats: { listenersOnline: 0, totalListenersToday: 0, sermonCount: 0, podcastCount: 0, prayerCount: 0, totalDonations: 0 },
  99  |           platformBreakdown: [],
  100 |           recentSermons: [],
  101 |           pendingTestimonies: [],
  102 |           recentDonations: [],
  103 |           activeCampaigns: [],
  104 |           transcripts: [],
  105 |           listenerHistory: []
  106 |         })
  107 |       })
  108 |     })
  109 | 
  110 |     await page.route('**/api/chat/**', async (route) => {
  111 |       await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ messages: [] }) })
  112 |     })
  113 | 
  114 |     await page.goto('/login')
  115 |     await page.evaluate(() => {
  116 |       localStorage.setItem('token', 'mock-admin-token')
  117 |       localStorage.setItem('user', JSON.stringify({ id: 'admin-1', email: 'admin@zionite.online', name: 'Admin User', role: 'admin' }))
  118 |     })
  119 | 
  120 |     await page.goto('/admin')
  121 |     await expect(page.getByText(/welcome back/i)).toBeVisible()
  122 | 
> 123 |     await page.getByRole('button', { name: /auto dj/i }).click()
      |                                                          ^ Error: locator.click: Test timeout of 30000ms exceeded.
  124 |     await expect(page.getByRole('heading', { name: /add music/i })).toBeVisible()
  125 | 
  126 |     await page.getByRole('button', { name: /external url/i }).click()
  127 | 
  128 |     await page.getByPlaceholder('Audio URL (e.g. CDN link)').fill('https://example.com/song.mp3')
  129 |     await page.getByPlaceholder('Title *').fill('Test Song')
  130 |     await page.getByPlaceholder('Artist').fill('Test Artist')
  131 |     await page.getByPlaceholder('Album').fill('Test Album')
  132 |     await page.locator('select').selectOption('Gospel')
  133 |     await page.getByPlaceholder('Duration (seconds)').fill('180')
  134 | 
  135 |     // Upload cover image via file picker
  136 |     await page.locator('input[type="file"]').setInputFiles({
  137 |       name: 'test-cover.png',
  138 |       mimeType: 'image/png',
  139 |       buffer: Buffer.from('mock image data')
  140 |     })
  141 | 
  142 |     await page.getByRole('button', { name: /add track/i }).click()
  143 | 
  144 |     await expect(page.getByText('Test Song')).toBeVisible()
  145 |     await expect(page.getByText('Test Artist')).toBeVisible()
  146 |     await expect(page.getByText('Test Album')).toBeVisible()
  147 |     await expect(page.getByText('3:00')).toBeVisible()
  148 |   })
  149 | 
  150 |   test('user can discover and play music from home and library', async ({ page }) => {
  151 |     const mockTrack = {
  152 |       id: 'track-123',
  153 |       title: 'Amazing Grace',
  154 |       artist: 'Worship Team',
  155 |       album: 'Sunday Worship',
  156 |       genre: 'Gospel',
  157 |       audio_url: 'https://example.com/amazing-grace.mp3',
  158 |       cover_url: 'https://example.com/cover.jpg',
  159 |       duration: 240,
  160 |       lyrics: 'Amazing grace, how sweet the sound...'
  161 |     }
  162 | 
  163 |     await page.route('**/api/music', async (route) => {
  164 |       await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ music: [mockTrack] }) })
  165 |     })
  166 | 
  167 |     await page.route('**/api/broadcasts/active', async (route) => {
  168 |       await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ broadcast: null }) })
  169 |     })
  170 | 
  171 |     await page.route('**/api/sermons?limit=4', async (route) => {
  172 |       await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ sermons: [] }) })
  173 |     })
  174 | 
  175 |     await page.route('**/api/guest-speakers', async (route) => {
  176 |       await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ speakers: [] }) })
  177 |     })
  178 | 
  179 |     await page.route('**/api/events', async (route) => {
  180 |       await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ events: [] }) })
  181 |     })
  182 | 
  183 |     // Home page shows featured music
  184 |     await page.goto('/')
  185 |     await expect(page.getByText(/featured music/i)).toBeVisible()
  186 |     await expect(page.getByText('Amazing Grace')).toBeVisible()
  187 |     await expect(page.getByText('Worship Team')).toBeVisible()
  188 | 
  189 |     // Navigate to Music page via navbar
  190 |     await page.getByRole('link', { name: /music/i }).click()
  191 |     await expect(page.getByRole('heading', { name: /music library/i })).toBeVisible()
  192 |     await expect(page.getByText('Amazing Grace')).toBeVisible()
  193 | 
  194 |     // Click to play track
  195 |     await page.getByText('Amazing Grace').click()
  196 | 
  197 |     // Global MiniPlayer appears
  198 |     await expect(page.locator('.fixed.bottom-0').getByText('Amazing Grace')).toBeVisible()
  199 |     await expect(page.locator('.fixed.bottom-0').getByText('Worship Team')).toBeVisible()
  200 |   })
  201 | 
  202 |   test('admin can upload a track with cover image', async ({ page }) => {
  203 |     let musicTracks: any[] = []
  204 | 
  205 |     await page.route('**/api/auth/verify', async (route) => {
  206 |       await route.fulfill({
  207 |         status: 200,
  208 |         contentType: 'application/json',
  209 |         body: JSON.stringify({
  210 |           user: { id: 'admin-1', email: 'admin@zionite.online', name: 'Admin User', role: 'admin' }
  211 |         })
  212 |       })
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
```