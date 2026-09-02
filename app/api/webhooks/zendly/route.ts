import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import type { ZendlyWebhookPayload } from '@/lib/types'

export async function POST(req: NextRequest) {
  // Optional webhook secret verification
  const secret = req.headers.get('x-zendly-secret') ?? req.headers.get('authorization')
  if (process.env.ZENDLY_WEBHOOK_SECRET && secret !== process.env.ZENDLY_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const payload: ZendlyWebhookPayload = await req.json()
  const { workflow_id, status, contact_response } = payload

  // Store raw webhook event
  await supabaseAdmin.from('webhook_events').insert({
    zendly_workflow_id: workflow_id,
    event_type: status,
    payload,
  })

  // Update matching contact log entry
  if (workflow_id) {
    const mappedStatus = mapZendlyStatus(status)

    await supabaseAdmin
      .from('contacts_log')
      .update({
        status: mappedStatus,
        response_summary: contact_response ?? null,
      })
      .eq('zendly_workflow_id', workflow_id)
  }

  return NextResponse.json({ received: true })
}

function mapZendlyStatus(zendlyStatus: string): string {
  // Map Zendly statuses to our internal statuses
  // Will be refined once we have Zendly's full status spec
  const map: Record<string, string> = {
    completed: 'responded',
    responded: 'responded',
    delivered: 'delivered',
    failed: 'failed',
    opted_out: 'opted_out',
    no_response: 'no_response',
    expired: 'no_response',
  }
  return map[zendlyStatus?.toLowerCase()] ?? 'sent'
}
