import { google } from 'googleapis'

function getGmailClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
  )
  oauth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN,
  })
  return google.gmail({ version: 'v1', auth: oauth2Client })
}

function buildRawEmail(to: string, subject: string, htmlBody: string): string {
  const from = process.env.GMAIL_FROM_EMAIL || 'kyb@getontop.com'
  const message = [
    `From: Ontop KYB <${from}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    '',
    htmlBody,
  ].join('\n')

  return Buffer.from(message).toString('base64url')
}

export async function sendEmail({
  to,
  subject,
  htmlBody,
}: {
  to: string
  subject: string
  htmlBody: string
}): Promise<string> {
  const gmail = getGmailClient()
  const raw = buildRawEmail(to, subject, htmlBody)

  const res = await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw },
  })

  return res.data.id || ''
}

export function buildKybEmailBody({
  firstName,
  company,
  segment,
  pendingDocsList,
  language,
}: {
  firstName: string
  company: string
  segment: 'A' | 'B'
  pendingDocsList?: string | null
  language: string
}): { subject: string; html: string } {
  const isSpanish = language === 'ES' || language === 'ES-EU'
  const isPortuguese = language === 'PT'

  if (segment === 'A') {
    if (isSpanish) {
      return {
        subject: `${company} – Completa tu verificación KYB en Ontop`,
        html: `<p>Hola ${firstName},</p>
<p>Notamos que tu empresa <strong>${company}</strong> aún no ha completado el proceso de verificación KYB en Ontop.</p>
<p>Este proceso es necesario para activar tu cuenta y comenzar a gestionar pagos internacionales.</p>
<p>Por favor ingresa a tu cuenta de Ontop y completa el proceso. Si tienes dudas, estamos aquí para ayudarte.</p>
<p>Saludos,<br/>Equipo Ontop</p>`,
      }
    }
    if (isPortuguese) {
      return {
        subject: `${company} – Complete sua verificação KYB na Ontop`,
        html: `<p>Olá ${firstName},</p>
<p>Notamos que sua empresa <strong>${company}</strong> ainda não completou o processo de verificação KYB na Ontop.</p>
<p>Este processo é necessário para ativar sua conta.</p>
<p>Por favor acesse sua conta Ontop e complete o processo.</p>
<p>Atenciosamente,<br/>Equipe Ontop</p>`,
      }
    }
    return {
      subject: `${company} – Complete your KYB verification on Ontop`,
      html: `<p>Hi ${firstName},</p>
<p>We noticed that your company <strong>${company}</strong> hasn't completed the KYB verification process on Ontop yet.</p>
<p>This is required to activate your account and start managing international payments.</p>
<p>Please log in to your Ontop account and complete the process. We're here to help if you have any questions.</p>
<p>Best regards,<br/>Ontop Team</p>`,
    }
  }

  // Segment B
  const docsText = pendingDocsList ? `<ul>${pendingDocsList.split(' | ').map(d => `<li>${d}</li>`).join('')}</ul>` : ''
  if (isSpanish) {
    return {
      subject: `${company} – Documentos pendientes en tu KYB`,
      html: `<p>Hola ${firstName},</p>
<p>Tu empresa <strong>${company}</strong> tiene documentos pendientes en el proceso KYB que nuestro equipo necesita para continuar:</p>
${docsText}
<p>Por favor ingresa a tu cuenta de Ontop y sube los documentos solicitados.</p>
<p>Saludos,<br/>Equipo Ontop</p>`,
    }
  }
  if (isPortuguese) {
    return {
      subject: `${company} – Documentos pendentes no seu KYB`,
      html: `<p>Olá ${firstName},</p>
<p>Sua empresa <strong>${company}</strong> tem documentos pendentes no processo KYB:</p>
${docsText}
<p>Acesse sua conta Ontop para enviar os documentos.</p>
<p>Atenciosamente,<br/>Equipe Ontop</p>`,
    }
  }
  return {
    subject: `${company} – Pending documents in your KYB`,
    html: `<p>Hi ${firstName},</p>
<p>Your company <strong>${company}</strong> has pending documents in the KYB process our team needs:</p>
${docsText}
<p>Please log in to your Ontop account and upload the requested documents.</p>
<p>Best regards,<br/>Ontop Team</p>`,
  }
}
