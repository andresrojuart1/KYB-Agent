import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { startZendlyWorkflow, buildZendlyPayload } from '@/lib/zendly'
import { sendEmail, buildKybEmailBody } from '@/lib/gmail'
import {
  routeSegmentB,
  getTemplateName,
  buildTemplateParams,
  localeFor,
  type TemplateContext,
} from '@/lib/kyb-templates'
import type { SendMessagePayload } from '@/lib/types'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const requestPayload: SendMessagePayload = await req.json()
  const {
    cod_client, channel, phone, email, contact_name, company, segment, msg_language, pending_docs_list, attempt_number,
  } = requestPayload

  // Check max follow-ups
  const { data: settingsRows } = await supabaseAdmin
    .from('settings')
    .select('key, value')
    .in('key', ['max_follow_ups'])
  const maxFollowUps = parseInt(settingsRows?.find(s => s.key === 'max_follow_ups')?.value ?? '3')

  const { count } = await supabaseAdmin
    .from('contacts_log')
    .select('*', { count: 'exact', head: true })
    .eq('cod_client', cod_client)

  if ((count ?? 0) >= maxFollowUps) {
    return NextResponse.json({ error: `Max follow-ups (${maxFollowUps}) reached for this client` }, { status: 400 })
  }

  const firstName = contact_name.split(' ')[0] || contact_name

  try {
    let zendlyWorkflowId: string | null = null

    if (channel === 'whatsapp') {
      if (!phone) return NextResponse.json({ error: 'No phone number available' }, { status: 400 })

      if (segment === 'A') {
        const templateName = getTemplateName('segment_a_nudge', msg_language)
        const params = buildTemplateParams('segment_a_nudge', { firstName, company })
        const zendlyPayload = buildZendlyPayload({
          phone,
          templateName,
          templateLanguage: localeFor(msg_language),
          structuredParameters: params,
        })
        const result = await startZendlyWorkflow(zendlyPayload)
        zendlyWorkflowId = result.id
      } else {
        const routing = routeSegmentB(pending_docs_list)
        if (routing.kind === 'needs_review') {
          return NextResponse.json(
            { error: `Can't auto-route this client's pending docs (${routing.reason}). Check the document manually before sending.` },
            { status: 400 },
          )
        }

        const ctx: TemplateContext = { firstName, company, docsText: routing.docsText }
        const templateName = getTemplateName('generic', msg_language)
        const params = buildTemplateParams('generic', ctx)
        const zendlyPayload = buildZendlyPayload({
          phone,
          templateName,
          templateLanguage: localeFor(msg_language),
          structuredParameters: params,
        })
        const result = await startZendlyWorkflow(zendlyPayload)
        zendlyWorkflowId = result.id
      }
    } else {
      if (!email) return NextResponse.json({ error: 'No email available' }, { status: 400 })

      const { subject, html } = buildKybEmailBody({
        firstName,
        company,
        segment,
        pendingDocsList: pending_docs_list,
        language: msg_language,
      })
      await sendEmail({ to: email, subject, htmlBody: html })
    }

    // Log to Supabase
    await supabaseAdmin.from('contacts_log').insert({
      cod_client,
      segment,
      company,
      contact_name,
      contact_email: email ?? null,
      contact_phone: phone ?? null,
      channel,
      sent_by: session.user?.email ?? 'system',
      zendly_workflow_id: zendlyWorkflowId,
      status: 'sent',
      attempt_number,
      msg_language,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Send error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'

    // Log failure
    await supabaseAdmin.from('contacts_log').insert({
      cod_client,
      segment,
      company,
      contact_name,
      contact_email: email ?? null,
      contact_phone: phone ?? null,
      channel,
      sent_by: session.user?.email ?? 'system',
      status: 'failed',
      response_summary: message,
      attempt_number,
      msg_language,
    })

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
