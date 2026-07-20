import type { Context } from 'hono'
import { Resend } from 'resend'
import { z } from 'zod'

const ContactSchema = z.object({
  name: z.string().trim().min(5).max(100),
  email: z.email().trim().max(254),
  message: z.string().trim().min(10).max(5000),
  website: z.string().optional(),
  turnstileToken: z.string().min(1).max(2048).optional()
})

type TurnstileVerifyResponse = {
  success: boolean
  'error-codes'?: string[]
  hostname?: string
  challenge_ts?: string
  action?: string
  cdata?: string
}

function sanitizeForSubject(value: string) {
  return value.replaceAll(/[\r\n]/g, ' ').slice(0, 100)
}

function getClientIp(c: Context) {
  return (
    c.req.header('x-forwarded-for')?.split(',', 1)[0]?.trim() ||
    c.req.header('x-real-ip') ||
    ''
  )
}

async function verifyTurnstile(c: Context, token: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) {
    console.error('Missing TURNSTILE_SECRET_KEY')
    return false
  }
  const body = new URLSearchParams()
  body.set('secret', secret)
  body.set('response', token)
  const ip = getClientIp(c)
  if (ip) body.set('remoteip', ip)
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body
  })
  if (!response.ok) {
    console.error('Turnstile verification HTTP error:', response.status)
    return false
  }
  const result = (await response.json()) as TurnstileVerifyResponse
  if (!result.success) {
    console.error('Turnstile verification failed:', result['error-codes'])
    return false
  }
  return true
}

export default async function contact(c: Context) {
  const contentType = c.req.header('content-type') || ''
  if (!contentType.includes('application/json')) return c.json({ success: false, error: 'Unsupported content type' }, 415)

  const contentLength = Number(c.req.header('content-length') || 0)
  if (contentLength > 15_000) return c.json({ success: false, error: 'Payload too large' }, 413)



  let result: ReturnType<typeof ContactSchema.safeParse>
  try {
    const body = await c.req.json()
    result = ContactSchema.safeParse(body)
    if (!result.success) return c.json({ success: false, error: 'Invalid payload' }, 400)
  } catch { }

  const { name, email, message, website, turnstileToken } = result!.data!
  // Honeypot check: if the hidden "website" field is filled,
  // treat it as spam and return success without sending an email
  if (website) return c.json({ success: true }, 200)
  if (!turnstileToken) return c.json({ success: false, error: 'Missing captcha token' }, 403)
  const isCaptchaValid = await verifyTurnstile(c, turnstileToken)
  if (!isCaptchaValid) return c.json({ success: false, error: 'Captcha verification failed' }, 403)
  const { CONTACT_EMAIL, RESEND_API_KEY } = process.env
  if (!CONTACT_EMAIL || !RESEND_API_KEY) {
    console.error('Missing CONTACT_EMAIL or RESEND_API_KEY')
    return c.json({ success: false, error: 'Server not configured' }, 500)
  }
  const safeName = sanitizeForSubject(name)
  const resend = new Resend(RESEND_API_KEY)
  const emailResult = await resend.emails.send({
    from: 'Portfolio <onboarding@resend.dev>',
    to: CONTACT_EMAIL,
    replyTo: email,
    subject: `Resend ~ CV GitHub ~ New message from ${safeName}`,
    text: `Name: ${safeName} ~ Email: ${email}\nMessage:\n${message.trim()}`
  })
  if (emailResult.error) {
    console.error('Resend error:', emailResult.error)
    return c.json({ success: false, error: 'Email delivery failed' }, 502)
  }
  return c.json({ success: true }, 200)
}
