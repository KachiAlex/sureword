import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import jwt from 'jsonwebtoken'
import { db, initDb } from '../db.js'
import { authenticateToken, AuthenticatedRequest, JWT_SECRET } from '../middleware/auth.js'

const router = Router()

router.get('/broadcast/:broadcastId', async (req, res) => {
  try {
    await initDb()
    // Optional auth: extract user if token present
    let userId: string | null = null
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any
        userId = decoded?.id || null
      } catch {}
    }
    let messages
    if (userId) {
      messages = await db.all(
        `SELECT * FROM chat_messages WHERE broadcast_id = $1 AND (
          is_private = FALSE OR user_id = $2 OR recipient_id = $2
        ) ORDER BY created_at DESC LIMIT 200`,
        [req.params.broadcastId, userId])
    } else {
      messages = await db.all(
        `SELECT * FROM chat_messages WHERE broadcast_id = $1 AND is_private = FALSE ORDER BY created_at DESC LIMIT 200`,
        [req.params.broadcastId])
    }
    res.json({ messages: messages.reverse() })
  } catch (err: any) {
    console.error('[CHAT] get error:', err.message)
    res.status(500).json({ error: 'Failed to fetch chat messages' })
  }
})

router.post('/broadcast/:broadcastId', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    await initDb()
    const { message, recipientId } = req.body
    if (!message?.trim()) { res.status(400).json({ error: 'Message is required' }); return }

    const id = uuidv4()
    const isPrivate = !!recipientId
    await db.run(
      `INSERT INTO chat_messages (id, broadcast_id, user_id, user_name, recipient_id, message, is_private) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, req.params.broadcastId, req.user!.id, req.user!.name, recipientId || null, message.trim(), isPrivate]
    )
    res.status(201).json({ id, message: message.trim(), isPrivate })
  } catch (err: any) {
    console.error('[CHAT] post error:', err.message)
    res.status(500).json({ error: 'Failed to send message' })
  }
})

router.post('/broadcast/:broadcastId/guest', async (req, res) => {
  try {
    await initDb()
    const { message, guestName } = req.body
    if (!message?.trim()) { res.status(400).json({ error: 'Message is required' }); return }
    if (!guestName?.trim()) { res.status(400).json({ error: 'Guest name required' }); return }
    const id = uuidv4()
    await db.run(
      `INSERT INTO chat_messages (id, broadcast_id, guest_name, message, is_private) VALUES ($1, $2, $3, $4, $5)`,
      [id, req.params.broadcastId, guestName.trim(), message.trim(), false])
    res.status(201).json({ id, message: message.trim() })
  } catch (err: any) {
    console.error('[CHAT] guest post error:', err.message)
    res.status(500).json({ error: 'Failed to send message' })
  }
})

router.get('/broadcast/:broadcastId/users', async (req, res) => {
  try {
    await initDb()
    const rows = await db.all(
      `SELECT DISTINCT user_id, user_name FROM chat_messages
       WHERE broadcast_id = $1 AND user_id IS NOT NULL
         AND created_at > NOW() - INTERVAL '30 minutes'
       ORDER BY user_name`,
      [req.params.broadcastId])
    res.json({ users: rows })
  } catch (err: any) {
    console.error('[CHAT] users error:', err.message)
    res.status(500).json({ error: 'Failed to fetch users' })
  }
})

export default router
