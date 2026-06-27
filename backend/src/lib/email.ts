import nodemailer from 'nodemailer'

const BREVO_SMTP_KEY = process.env.BREVO_SMTP_KEY || ''
const BREVO_SMTP_LOGIN = process.env.BREVO_SMTP_LOGIN || ''
const BREVO_SMTP_HOST = process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com'
const BREVO_SMTP_PORT = parseInt(process.env.BREVO_SMTP_PORT || '587', 10)
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@zionite.online'
const FROM_NAME = process.env.FROM_NAME || 'ZioniteFM'

const transporter = nodemailer.createTransport({
  host: BREVO_SMTP_HOST,
  port: BREVO_SMTP_PORT,
  secure: BREVO_SMTP_PORT === 465,
  auth: {
    user: BREVO_SMTP_LOGIN,
    pass: BREVO_SMTP_KEY,
  },
})

export async function sendEmail({ to, toName, subject, htmlContent, textContent }: {
  to: string
  toName?: string
  subject: string
  htmlContent: string
  textContent?: string
}) {
  if (!BREVO_SMTP_KEY || !BREVO_SMTP_LOGIN) {
    console.error('[EMAIL] Brevo SMTP credentials not configured')
    throw new Error('Email service not configured')
  }

  const info = await transporter.sendMail({
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to: `"${toName || to}" <${to}>`,
    subject,
    html: htmlContent,
    text: textContent || htmlContent.replace(/<[^>]+>/g, ''),
  })

  console.log('[EMAIL] sent:', info.messageId)
  return info
}
