import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { queryRedshift } from '@/lib/redshift'
import { supabaseAdmin } from '@/lib/supabase'
import { KYB_ALL_SEGMENTS_SQL } from '@/lib/queries'
import { getSyntheticTestClients } from '@/lib/test-clients'
import type { KybClient } from '@/lib/types'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const segment = req.nextUrl.searchParams.get('segment') as 'A' | 'B' | null

  try {
    const rows = await queryRedshift<KybClient>(KYB_ALL_SEGMENTS_SQL)
    rows.push(...getSyntheticTestClients())
    const filtered = segment ? rows.filter(r => r.segment === segment) : rows

    // Enrich with contact history from Supabase
    const clientCodes = filtered.map(r => r.cod_client)
    if (clientCodes.length > 0) {
      const { data: logs } = await supabaseAdmin
        .from('contacts_log')
        .select('cod_client, status, channel, sent_at, attempt_number')
        .in('cod_client', clientCodes)
        .order('sent_at', { ascending: false })

      if (logs) {
        const byClient = new Map<string, typeof logs>()
        for (const log of logs) {
          if (!byClient.has(log.cod_client)) byClient.set(log.cod_client, [])
          byClient.get(log.cod_client)!.push(log)
        }

        for (const client of filtered) {
          const clientLogs = byClient.get(client.cod_client) ?? []
          client.contacts_sent = clientLogs.length
          if (clientLogs.length > 0) {
            client.last_contact_at = clientLogs[0].sent_at
            client.last_contact_status = clientLogs[0].status
            client.last_contact_channel = clientLogs[0].channel
          }
        }
      }
    }

    return NextResponse.json({ clients: filtered, total: filtered.length })
  } catch (error) {
    console.error('Redshift query error:', error)
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 })
  }
}
