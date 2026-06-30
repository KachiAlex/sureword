import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { db, initDb } from '../db.js';
export const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-me';
export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET;
export function generateTokens(user) {
    const accessToken = jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    const refreshToken = jwt.sign({ id: user.id }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
    return { accessToken, refreshToken };
}
export async function storeRefreshToken(userId, refreshToken) {
    await initDb();
    const id = uuidv4();
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await db.run('INSERT INTO refresh_tokens (id, token, user_id, expires_at) VALUES ($1, $2, $3, $4)', [id, refreshToken, userId, expires.toISOString()]);
}
export async function verifyRefreshToken(token) {
    try {
        const decoded = jwt.verify(token, JWT_REFRESH_SECRET);
        await initDb();
        const row = await db.get('SELECT * FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()', [token]);
        if (!row)
            return null;
        return decoded;
    }
    catch {
        return null;
    }
}
export async function revokeRefreshToken(token) {
    await initDb();
    await db.run('DELETE FROM refresh_tokens WHERE token = $1', [token]);
}
export async function revokeAllUserTokens(userId) {
    await initDb();
    await db.run('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
}
export function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        res.status(401).json({ error: 'Access token required' });
        return;
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET, { clockTolerance: 60 });
        req.user = decoded;
        next();
    }
    catch (err) {
        console.error('[AUTH] token verify error:', err.message, '| token prefix:', token.slice(0, 20) + '...');
        const isExpired = err.name === 'TokenExpiredError';
        res.status(isExpired ? 401 : 403).json({ error: isExpired ? 'Token expired' : 'Invalid or expired token' });
    }
}
export function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        if (!roles.includes(req.user.role)) {
            res.status(403).json({ error: 'Insufficient permissions' });
            return;
        }
        next();
    };
}
//# sourceMappingURL=auth.js.map