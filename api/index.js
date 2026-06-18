// Re-export the compiled backend handler for Vercel serverless routing
const mod = require('../backend/dist/index')
module.exports = mod.default || mod
