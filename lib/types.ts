export type Segment = 'A' | 'B'
export type Channel = 'whatsapp' | 'email'
export type ContactStatus = 'sent' | 'delivered' | 'responded' | 'failed' | 'opted_out' | 'no_response'
export type MsgLanguage = 'ES' | 'PT' | 'EN' | 'ES-EU'

export interface KybClient {
  segment: Segment
  flow: string
  cod_client: string
  company: string
  country_code: string
  country: string
  msg_language: MsgLanguage
  first_login: string | null
  last_login: string | null
  days_since_last_login: number | null
  // Segment B fields
  kyb_submitted: string | null
  kyb_check: string | null
  kyb_ttv: number | null
  days_since_kyb_submit: number | null
  kyb_status: string | null
  last_request_status: string | null
  pending_docs: number | null
  pending_docs_list: string | null
  days_doc_pending: number | null
  // Contact
  first_name: string | null
  last_name: string | null
  email: string | null
  role: string | null
  phone: string | null
  wsp_confirmed: 'Yes' | 'No' | null
  phone_available: 'Yes' | 'No'
  amplitude_user_id: string | null
  // Enriched from Supabase
  contacts_sent?: number
  last_contact_at?: string | null
  last_contact_status?: ContactStatus | null
  last_contact_channel?: Channel | null
}

export interface ContactLog {
  id: string
  cod_client: string
  segment: Segment
  company: string | null
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  channel: Channel
  sent_at: string
  sent_by: string | null
  zendly_workflow_id: string | null
  status: ContactStatus
  response_summary: string | null
  attempt_number: number
  msg_language: MsgLanguage
  created_at: string
}

export interface Setting {
  id: string
  key: string
  value: string
  updated_at: string
  updated_by: string | null
}

export interface SendMessagePayload {
  cod_client: string
  channel: Channel
  phone?: string
  email?: string
  contact_name: string
  company: string
  segment: Segment
  msg_language: MsgLanguage
  pending_docs_list?: string | null
  attempt_number: number
  // Manual-only fields: required for some segment B WhatsApp categories whose
  // template needs data compliance never puts in Redshift. See
  // lib/kyb-templates.ts REQUIRED_MANUAL_FIELDS for which category needs which.
  holder_name?: string
  attorney_name?: string
  reason?: string
  link?: string
  detail?: string
}

export interface ZendlyWebhookPayload {
  workflow_id: string
  status: string
  contact_phone?: string
  contact_response?: string
  completed_at?: string
  [key: string]: unknown
}

export interface DashboardStats {
  total_segment_a: number
  total_segment_b: number
  contacted_today: number
  pending_response: number
  responded_this_week: number
  total_contacted: number
}
