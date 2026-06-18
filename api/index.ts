import serverless from 'serverless-http'
// @ts-ignore
import app from './dist/index.js'
export default serverless(app)
