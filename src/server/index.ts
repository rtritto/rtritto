import { cors } from 'hono/cors'
import { Hono } from 'hono/quick'
import { renderPage } from 'vike-lite/server'

import apiRoutes from './apiRoutes'

const app = new Hono()

if (process.env.NODE_ENV === 'production') {
  app.use(cors())
}

app.route('/api', apiRoutes)

app.get('*', async (c) => {
  return await renderPage(c.req.raw)
})

app.onError((error, c) => {
  console.error(error)
  return c.json({ error: 'Internal Server Error' }, 500)
})

export default app
