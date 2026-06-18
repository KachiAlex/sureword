"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uuid_1 = require("uuid");
const db_1 = require("../db");
const router = (0, express_1.Router)();
// Submit a prayer request
router.post('/', async (req, res) => {
    const { request, userName = 'Anonymous', is_private = true } = req.body;
    if (!request || request.trim().length === 0) {
        res.status(400).json({ error: 'Prayer request is required' });
        return;
    }
    try {
        const db = await (0, db_1.getDb)();
        const id = (0, uuid_1.v4)();
        await db.run(`INSERT INTO prayer_requests (id, user_id, user_name, request, is_private, status)
       VALUES ($1, $2, $3, $4, $5, $6)`, [id, null, userName, request.trim(), is_private, 'pending']);
        res.status(201).json({ success: true, id });
    }
    catch {
        res.status(500).json({ error: 'Failed to submit prayer request' });
    }
});
// Get all prayer requests
router.get('/all', async (req, res) => {
    try {
        const db = await (0, db_1.getDb)();
        const { status } = req.query;
        let query = `
      SELECT id, user_name, request, status, created_at
      FROM prayer_requests
      WHERE 1=1
    `;
        const params = [];
        if (status) {
            query += ` AND status = $${params.length + 1}`;
            params.push(status);
        }
        query += ` ORDER BY created_at DESC LIMIT 100`;
        const requests = await db.all(query, params);
        res.json({ requests });
    }
    catch {
        res.status(500).json({ error: 'Failed to fetch requests' });
    }
});
// Update prayer request status
router.put('/:id/status', async (req, res) => {
    const { status } = req.body;
    if (!['pending', 'praying', 'answered'].includes(status)) {
        res.status(400).json({ error: 'Invalid status' });
        return;
    }
    try {
        const db = await (0, db_1.getDb)();
        await db.run('UPDATE prayer_requests SET status = $1 WHERE id = $2', [status, req.params.id]);
        const updated = await db.get('SELECT * FROM prayer_requests WHERE id = $1', [req.params.id]);
        res.json({ request: updated });
    }
    catch {
        res.status(500).json({ error: 'Failed to update status' });
    }
});
exports.default = router;
//# sourceMappingURL=prayer.js.map