import { NextRequest, NextResponse } from 'next/server'
import { queryRedshift } from '@/lib/redshift'
import { supabaseAdmin } from '@/lib/supabase'
import { startZendlyWorkflow, buildZendlyPayload } from '@/lib/zendly'
import { KYB_ALL_SEGMENTS_SQL } from '@/lib/queries'
import {
  routeSegmentB,
  getTemplateName,
  buildTemplateParams,
  localeFor,
} from '@/lib/kyb-templates'
import type { KybClient } from '@/lib/types'

export async function GET(req: NextRequest) {
  // Vercel Cron sends Authorization: Bearer <CRON_SECRET>
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if cron is enabled in settings
  const { data: settingsData } = await supabaseAdmin
    .from('settings')
    .select('key, value')
    .in('key', ['cron_enabled', 'max_follow_ups', 'primary_channel'])

  const settings = Object.fromEntries((settingsData ?? []).map(r => [r.key, r.value]))

  if (settings.cron_enabled !== 'true') {
    await supabaseAdmin.from('cron_runs').insert({ success: true, skipped_reason: 'Cron disabled in settings' })
    return NextResponse.json({ skipped: true, reason: 'Cron disabled in settings' })
  }

  const maxFollowUps = parseInt(settings.max_follow_ups ?? '3')
  const primaryChannel = (settings.primary_channel ?? 'whatsapp') as 'whatsapp' | 'email'

  try {
    const clients = await queryRedshift<KybClient>(KYB_ALL_SEGMENTS_SQL)

    // Get existing contact counts
    const clientCodes = clients.map(c => c.cod_client)
    const { data: existingLogs } = await supabaseAdmin
      .from('contacts_log')
      .select('cod_client, attempt_number')
      .in('cod_client', clientCodes)
      .order('attempt_number', { ascending: false })

    const contactCounts = new Map<string, number>()
    for (const log of existingLogs ?? []) {
      if (!contactCounts.has(log.cod_client)) {
        contactCounts.set(log.cod_client, log.attempt_number)
      }
    }

    const eligible = clients.filter(c => {
      const attempts = contactCounts.get(c.cod_client) ?? 0
      return attempts < maxFollowUps
    })

    let sent = 0
    let skipped = 0
    let needsReview = 0
    const errors: string[] = []

    for (const client of eligible) {
      const attempts = contactCounts.get(client.cod_client) ?? 0
      const attemptNumber = attempts + 1
      const firstName = client.first_name ?? client.company ?? 'there'
      const contactName = `${client.first_name ?? ''} ${client.last_name ?? ''}`.trim()

      try {
        let zendlyWorkflowId: string | null = null

        if (primaryChannel === 'whatsapp' && client.phone) {
          if (client.segment === 'A') {
            const templateName = getTemplateName('segment_a_nudge', client.msg_language)
            const params = buildTemplateParams('segment_a_nudge', { firstName, company: client.company })
            const payload = buildZendlyPayload({
              phone: client.phone,
              templateName,
              templateLanguage: localeFor(client.msg_language),
              structuredParameters: params,
            })
            const result = await startZendlyWorkflow(payload)
            zendlyWorkflowId = result.id
          } else {
            // Segment B: always the generic template listing whatever is pending — the
            // only WhatsApp template approved for this segment so far. Titles we can't
            // safely sanitize are left for the manual Send modal instead of auto-sending.
            const routing = routeSegmentB(client.pending_docs_list)
            if (routing.kind === 'needs_review') {
              needsReview++
              continue
            }

            const templateName = getTemplateName('generic', client.msg_language)
            const params = buildTemplateParams('generic', { firstName, company: client.company, docsText: routing.docsText })
            const payload = buildZendlyPayload({
              phone: client.phone,
              templateName,
              templateLanguage: localeFor(client.msg_language),
              structuredParameters: params,
            })
            const result = await startZendlyWorkflow(payload)
            zendlyWorkflowId = result.id
          }
        } else {
          skipped++
          continue
        }

        await supabaseAdmin.from('contacts_log').insert({
          cod_client: client.cod_client,
          segment: client.segment,
          company: client.company,
          contact_name: contactName || null,
          contact_email: client.email ?? null,
          contact_phone: client.phone ?? null,
          channel: primaryChannel,
          sent_by: 'cron',
          zendly_workflow_id: zendlyWorkflowId,
          status: 'sent',
          attempt_number: attemptNumber,
          msg_language: client.msg_language,
        })

        sent++
      } catch (err) {
        errors.push(`${client.cod_client}: ${err instanceof Error ? err.message : 'error'}`)
      }
    }

    await supabaseAdmin.from('cron_runs').insert({
      success: true,
      total_eligible: eligible.length,
      sent,
      skipped,
      needs_review: needsReview,
      errors,
    })

    return NextResponse.json({
      success: true,
      total_eligible: eligible.length,
      sent,
      skipped,
      needs_review: needsReview,
      errors: errors.slice(0, 20),
      ran_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Cron error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    await supabaseAdmin.from('cron_runs').insert({ success: false, errors: [message] })
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 })
  }
}
