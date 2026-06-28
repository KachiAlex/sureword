import 'dotenv/config'
import { createServer } from 'http'
import app from './index.js'
import { initWebSocket } from './websocket.js'

const PORT = process.env.PORT || 3001

const server = createServer(app)
initWebSocket(server)

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
