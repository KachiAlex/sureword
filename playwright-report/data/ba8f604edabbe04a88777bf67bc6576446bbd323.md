# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: music.spec.ts >> Add Music Flow >> user can discover and play music from home and library
- Location: e2e\music.spec.ts:150:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Amazing Grace')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText('Amazing Grace')

```

```yaml
- navigation:
  - link "ZIONITEFM The Voice of Redemption":
    - /url: /
    - img
    - text: ZIONITEFM The Voice of Redemption
  - link "Home":
    - /url: /
  - link "Live Radio":
    - /url: /live
  - link "Sermons":
    - /url: /archive
  - link "Music":
    - /url: /music
  - link "Podcasts":
    - /url: /podcasts
  - link "Prayer Wall":
    - /url: /prayer
  - link "Events":
    - /url: /events
  - link "About Us":
    - /url: /about
  - button "Search sermons, topics, speakers...":
    - img
    - text: Search sermons, topics, speakers...
  - button:
    - img
  - button "Donate":
    - img
    - text: Donate
- img
- heading "Music Library" [level=1]
- paragraph: Stream worship music and gospel tracks
- img
- textbox "Search by song, artist, or album..."
- img
- paragraph: No tracks available yet
```

# Test source

```ts
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
  123 |     await page.getByRole('button', { name: /auto dj/i }).click()
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
> 192 |     await expect(page.getByText('Amazing Grace')).toBeVisible()
      |                                                   ^ Error: expect(locator).toBeVisible() failed
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
```