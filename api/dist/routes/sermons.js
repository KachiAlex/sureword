import { Router } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { db, initDb } from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
const router = Router();
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, 'uploads/'),
    filename: (_req, file, cb) => {
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
        cb(null, unique);
    }
});
const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });
router.get('/', async (req, res) => {
    try {
        await initDb();
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : undefined;
        const query = limit
            ? 'SELECT * FROM sermons ORDER BY date DESC LIMIT $1'
            : 'SELECT * FROM sermons ORDER BY date DESC';
        const sermons = limit ? await db.all(query, [limit]) : await db.all(query);
        res.json({ sermons });
    }
    catch (err) {
        console.error('[SERMONS] list error:', err.message);
        res.status(500).json({ error: 'Failed to fetch sermons' });
    }
});
router.post('/', authenticateToken, requireRole('admin'), upload.fields([{ name: 'audio', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }]), async (req, res) => {
    try {
        await initDb();
        const { title, description, scripture_reference, speaker, series, date, duration, video_url, thumbnail_url } = req.body;
        if (!title) {
            res.status(400).json({ error: 'Title is required' });
            return;
        }
        const files = req.files;
        const id = uuidv4();
        const audioFile = files?.audio?.[0];
        const thumbnailFile = files?.thumbnail?.[0];
        const audioUrl = audioFile ? `/uploads/${audioFile.filename}` : (req.body.audio_url || '');
        const thumbnailUrl = thumbnailFile ? `/uploads/${thumbnailFile.filename}` : (thumbnail_url || '');
        await db.run(`INSERT INTO sermons (id, title, description, scripture_reference, speaker, series, audio_url, video_url, thumbnail_url, date, duration)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`, [id, title, description || null, scripture_reference || null, speaker || null, series || null,
            audioUrl || null, video_url || null, thumbnailUrl || null, date || new Date().toISOString().split('T')[0], duration ? parseInt(duration, 10) : null]);
        res.json({ sermon: { id, title, description, scripture_reference, speaker, series, audio_url: audioUrl, video_url, thumbnail_url: thumbnailUrl, date, duration } });
    }
    catch (err) {
        console.error('[SERMONS] create error:', err.message);
        res.status(500).json({ error: 'Failed to upload sermon' });
    }
});
// Featured sermons
router.get('/featured', async (req, res) => {
    try {
        await initDb();
        const rows = await db.all(`SELECT s.* FROM sermons s
       JOIN featured_sermons fs ON s.id = fs.sermon_id
       ORDER BY fs.display_order ASC, fs.created_at DESC`);
        res.json({ sermons: rows });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.post('/featured', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        await initDb();
        const { sermon_id, display_order } = req.body;
        if (!sermon_id)
            return res.status(400).json({ error: 'sermon_id required' });
        const id = uuidv4();
        await db.run(`INSERT INTO featured_sermons (id, sermon_id, display_order) VALUES ($1, $2, $3)
       ON CONFLICT (sermon_id) DO UPDATE SET display_order = EXCLUDED.display_order`, [id, sermon_id, display_order || 0]);
        res.json({ ok: true });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.delete('/featured/:sermon_id', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        await initDb();
        await db.run('DELETE FROM featured_sermons WHERE sermon_id = $1', [req.params.sermon_id]);
        res.json({ ok: true });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Radio current - returns the sermon currently on air based on active playlist
router.get('/radio/current', async (_req, res) => {
    try {
        await initDb();
        const now = new Date();
        const playlist = await db.get(`SELECT * FROM sermon_playlists
       WHERE is_active = TRUE AND start_time <= $1 AND (end_time IS NULL OR end_time >= $1)
       ORDER BY start_time DESC LIMIT 1`, [now.toISOString()]);
        if (!playlist) {
            // Fall back to most recent sermon
            const latest = await db.get('SELECT * FROM sermons ORDER BY date DESC LIMIT 1');
            res.json({ current: latest ? { title: latest.title, speaker: latest.speaker, audioUrl: latest.audio_url, thumbnailUrl: latest.thumbnail_url, scriptureReference: latest.scripture_reference, offsetSeconds: 0 } : null, playlist: null });
            return;
        }
        const items = await db.all(`SELECT spi.id as item_id, spi.sermon_id, spi.order_index, spi.duration_minutes,
              s.title, s.speaker, s.audio_url, s.thumbnail_url, s.description, s.scripture_reference
       FROM sermon_playlist_items spi
       JOIN sermons s ON s.id = spi.sermon_id
       WHERE spi.playlist_id = $1
       ORDER BY spi.order_index ASC`, [playlist.id]);
        if (!items || items.length === 0) {
            res.json({ current: null, playlist: null });
            return;
        }
        const elapsedMin = (now.getTime() - new Date(playlist.start_time).getTime()) / 60000;
        const totalDuration = items.reduce((s, i) => s + (i.duration_minutes || 30), 0);
        const loopedMin = totalDuration > 0 ? elapsedMin % totalDuration : 0;
        let cum = 0;
        let currentItem = null;
        let offsetMin = 0;
        for (const item of items) {
            const dur = item.duration_minutes || 30;
            if (loopedMin >= cum && loopedMin < cum + dur) {
                currentItem = item;
                offsetMin = loopedMin - cum;
                break;
            }
            cum += dur;
        }
        if (!currentItem)
            currentItem = items[0];
        res.json({
            current: {
                itemId: currentItem.item_id,
                sermonId: currentItem.sermon_id,
                title: currentItem.title,
                speaker: currentItem.speaker,
                audioUrl: currentItem.audio_url,
                thumbnailUrl: currentItem.thumbnail_url,
                description: currentItem.description,
                scriptureReference: currentItem.scripture_reference,
                offsetSeconds: Math.floor(offsetMin * 60),
            },
            playlist: { id: playlist.id, title: playlist.title, startTime: playlist.start_time }
        });
    }
    catch (err) {
        console.error('[SERMONS] radio current error:', err.message);
        res.status(500).json({ error: 'Failed to fetch current sermon' });
    }
});
// Transcripts
router.get('/:id/transcript', async (req, res) => {
    try {
        await initDb();
        const row = await db.get('SELECT * FROM transcripts WHERE sermon_id = $1', [req.params.id]);
        res.json({ transcript: row || null });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.post('/:id/transcript', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        await initDb();
        const { content } = req.body;
        if (!content)
            return res.status(400).json({ error: 'Content required' });
        const id = uuidv4();
        await db.run(`INSERT INTO transcripts (id, sermon_id, content) VALUES ($1, $2, $3)
       ON CONFLICT (sermon_id) DO UPDATE SET content = EXCLUDED.content`, [id, req.params.id, content]);
        const row = await db.get('SELECT * FROM transcripts WHERE sermon_id = $1', [req.params.id]);
        res.json({ transcript: row });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
export default router;
//# sourceMappingURL=sermons.js.map