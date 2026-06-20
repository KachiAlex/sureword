import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db, initDb } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
const router = Router();
// Public: list podcasts
router.get('/', async (req, res) => {
    try {
        await initDb();
        const rows = await db.all('SELECT * FROM podcasts ORDER BY date DESC, created_at DESC');
        res.json({ podcasts: rows });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Public: get single podcast
router.get('/:id', async (req, res) => {
    try {
        await initDb();
        const row = await db.get('SELECT * FROM podcasts WHERE id = $1', [req.params.id]);
        if (!row)
            return res.status(404).json({ error: 'Not found' });
        res.json({ podcast: row });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Admin: create
router.post('/', authenticateToken, async (req, res) => {
    try {
        await initDb();
        const user = req.user;
        if (user?.role !== 'admin')
            return res.status(403).json({ error: 'Admin only' });
        const { title, speaker, duration, audio_url, description, date } = req.body;
        if (!title)
            return res.status(400).json({ error: 'Title is required' });
        const id = uuidv4();
        await db.run(`INSERT INTO podcasts (id, title, speaker, duration, audio_url, description, date)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`, [id, title, speaker || '', duration || '', audio_url || '', description || '', date || '']);
        const row = await db.get('SELECT * FROM podcasts WHERE id = $1', [id]);
        res.status(201).json({ podcast: row });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Admin: update
router.patch('/:id', authenticateToken, async (req, res) => {
    try {
        await initDb();
        const user = req.user;
        if (user?.role !== 'admin')
            return res.status(403).json({ error: 'Admin only' });
        const { title, speaker, duration, audio_url, description, date } = req.body;
        const existing = await db.get('SELECT * FROM podcasts WHERE id = $1', [req.params.id]);
        if (!existing)
            return res.status(404).json({ error: 'Not found' });
        await db.run(`UPDATE podcasts SET title = $1, speaker = $2, duration = $3, audio_url = $4, description = $5, date = $6 WHERE id = $7`, [title ?? existing.title, speaker ?? existing.speaker, duration ?? existing.duration,
            audio_url ?? existing.audio_url, description ?? existing.description, date ?? existing.date, req.params.id]);
        const row = await db.get('SELECT * FROM podcasts WHERE id = $1', [req.params.id]);
        res.json({ podcast: row });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Admin: delete
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        await initDb();
        const user = req.user;
        if (user?.role !== 'admin')
            return res.status(403).json({ error: 'Admin only' });
        await db.run('DELETE FROM podcasts WHERE id = $1', [req.params.id]);
        res.json({ ok: true });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
export default router;
//# sourceMappingURL=podcasts.js.map