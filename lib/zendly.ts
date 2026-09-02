export interface ZendlyStartPayload {
  workflowName: string
  initialInput: {
    CHANNEL_ACCOUNT_ID: string
    RECIPIENT_ID: string
    WHATSAPP_TEMPLATE_CONFIG: {
      name: string
      language: string
      structuredParameters: { text: string }[]
    }
  }
}

export interface ZendlyResponse {
  id: string
  status: string
  [key: string]: unknown
}

// Template name + language now come from the caller (see lib/kyb-templates.ts,
// which picks them per document category + msg_language) rather than one global
// env var — there are 11+ distinct KYB templates, not one.
export function buildZendlyPayload({
  phone,
  templateName,
  templateLanguage,
  structuredParameters,
}: {
  phone: string
  templateName: string
  templateLanguage: string
  structuredParameters: string[]
}): ZendlyStartPayload {
  const channelAccountId = process.env.ZENDLY_CHANNEL_ACCOUNT_ID
  const workflowName = process.env.ZENDLY_WORKFLOW_NAME || 'ontop-quick-workflow'

  if (!channelAccountId) throw new Error('ZENDLY_CHANNEL_ACCOUNT_ID not configured')

  return {
    workflowName,
    initialInput: {
      CHANNEL_ACCOUNT_ID: channelAccountId,
      // Zendly wants the recipient without the leading "+", even though phone
      // arrives as "+<phonecode><number>" from the Redshift query.
      RECIPIENT_ID: phone.replace(/^\+/, ''),
      WHATSAPP_TEMPLATE_CONFIG: {
        name: templateName,
        language: templateLanguage,
        structuredParameters: structuredParameters.map(text => ({ text })),
      },
    },
  }
}

export async function startZendlyWorkflow(payload: ZendlyStartPayload): Promise<ZendlyResponse> {
  const apiKey = process.env.ZENDLY_API_KEY
  const userId = process.env.ZENDLY_USER_ID
  if (!apiKey) throw new Error('ZENDLY_API_KEY not configured')
  if (!userId) throw new Error('ZENDLY_USER_ID not configured')

  const res = await fetch('https://api.zendly.ai/api/v1/workflows/start', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: apiKey,
      'X-User-ID': userId,
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Zendly API error ${res.status}: ${error}`)
  }

  return res.json()
}
