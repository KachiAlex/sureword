"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JWT_REFRESH_SECRET = exports.JWT_SECRET = void 0;
exports.authenticateToken = authenticateToken;
exports.requireRole = requireRole;
function authenticateToken(_req, _res, next) { next(); }
function requireRole(..._roles) { return (_req, _res, next) => next(); }
exports.JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
exports.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret';
//# sourceMappingURL=auth.js.map