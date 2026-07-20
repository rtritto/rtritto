import type { Context } from 'hono'
import { Resend } from 'resend'
import { z } from 'zod'

const ContactSchema = z.object({
  name: z.string().trim().min(5).max(100),
  email: z.email().trim().max(254),
  message: z.string().trim().min(10).max(5000),
  website: z.string().optional()
})

function sanitizeForSubject(value: string) {
  return value.replaceAll(/[\r\n]/g, ' ').slice(0, 100)
}

export default async function contact(c: Context) {
  const contentType = c.req.header('content-type') || ''
  if (!contentType.includes('application/json')) return c.json({ success: false, error: 'Unsupported content type' }, 415)

  const contentLength = Number(c.req.header('content-length') || 0)
  if (contentLength > 10_000) return c.json({ success: false, error: 'Payload too large' }, 413)

  let result: ReturnType<typeof ContactSchema.safeParse>
  try {
    const body = await c.req.json()
    result = ContactSchema.safeParse(body)
    if (!result.success) return c.json({ success: false, error: 'Invalid payload' }, 400)
  } catch { }


  const { name, email, message, website } = result!.data!
  // Honeypot check: if the hidden "website" field is filled,
  // treat it as spam and return success without sending an email
  if (website) return c.json({ success: true }, 200)

  const { CONTACT_EMAIL, RESEND_API_KEY } = process.env
  const safeName = sanitizeForSubject(name)
  const resend = new Resend(RESEND_API_KEY!)
  const emailResult = await resend.emails.send({
    from: 'Portfolio <onboarding@resend.dev>',
    to: CONTACT_EMAIL!,
    replyTo: email,
    subject: `Resend ~ CV GitHub ~ New message from ${safeName}`,
    text: `Name: ${name} ~ Email: ${email}\nMessage:\n${message}`
  })
  if (emailResult.error) {
    console.error('Resend error:', emailResult.error)
    return c.json({ success: false, error: 'Email delivery failed' }, 502)
  }
  return c.json({ success: true }, 200)
}
