import type { KybClient } from './types'

// Dev-only synthetic clients, injected into the /api/clients response so the
// UI (Segment A/B tables, Send modal) can be exercised end-to-end without
// touching the real Redshift warehouse. Gated by KYB_TEST_MODE, which must
// only ever be set in a local .env.local — never in a deployed environment.
export function getSyntheticTestClients(): KybClient[] {
  if (process.env.KYB_TEST_MODE !== 'true') return []

  return [
    {
      segment: 'A',
      flow: 'Open page',
      cod_client: 'TEST-MAICOL',
      company: 'Ontop Test',
      country_code: 'COL',
      country: 'Colombia',
      msg_language: 'EN', // forced EN for this test contact, regardless of country
      first_login: '2026-07-01',
      last_login: '2026-07-25',
      days_since_last_login: 5,
      kyb_submitted: null,
      kyb_check: null,
      kyb_ttv: null,
      days_since_kyb_submit: null,
      kyb_status: null,
      last_request_status: null,
      pending_docs: null,
      pending_docs_list: null,
      days_doc_pending: null,
      first_name: 'Maicol',
      last_name: 'Andres Rojas',
      email: null,
      role: 'Account Owner',
      phone: '+573195142548',
      wsp_confirmed: 'Yes',
      phone_available: 'Yes',
      amplitude_user_id: 'ONTOP_TEST-MAICOL',
    },
  ]
}
