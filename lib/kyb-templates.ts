import type { MsgLanguage } from './types'

export type DocCategory =
  | 'ownership'
  | 'incorporation'
  | 'id_document'
  | 'poa'
  | 'website'
  | 'kyc_reset'
  | 'edd'
  | 'proof_of_address'
  | 'tax'
  | 'additional_info'

// These categories ask for data compliance never puts in Redshift (the person on
// the ID, the attorney's name, a reset reason, a form link…). They never go through
// the cron — only through the manual Send modal, which collects the missing field.
export const MANUAL_ONLY_CATEGORIES: DocCategory[] = ['id_document', 'poa', 'kyc_reset', 'edd', 'additional_info']

export const REQUIRED_MANUAL_FIELDS: Partial<Record<DocCategory, string[]>> = {
  id_document: ['holderName'],
  poa: ['attorneyName'],
  kyc_reset: ['reason', 'link'],
  edd: ['link'],
  additional_info: ['detail'],
}

export interface TemplateContext {
  firstName: string
  company: string
  holderName?: string
  attorneyName?: string
  reason?: string
  link?: string
  detail?: string
  docsText?: string
}

// Checked top to bottom, first match wins. Order encodes the sheet's stated priority
// (Ownership > Incorporation > ID > POA > the rest) and resolves overlaps in the real
// data — e.g. "Operating Agreement" is accepted evidence for both Ownership and
// Incorporation, so Ownership (checked first) claims it.
//
// Keywords go beyond the sheet's original list: measured against 749 real pending
// `document_title` values in Redshift on 2026-07-29, the sheet's keywords alone
// covered ~77%. These additions close most of the gap (see coverage notes below).
const CATEGORY_KEYWORDS: [DocCategory, string[]][] = [
  ['ownership', [
    'shareholding', 'ownership', 'shareholder', 'share distribution', 'shares distribution',
    'beneficial owner', 'beneficial ownership', 'operating agreement', 'company structure',
    'company\'s ownership structure', 'organizational structure',
  ]],
  ['incorporation', [
    'incorporation', 'acta constitutiva', 'incumbency', 'articles of association',
    'contrato social', 'ccmei', 'certificate of registration', 'legal existence',
    'business certificate', 'registration number',
  ]],
  ['id_document', [
    'id document', 'id copy', 'id picture', 'passport', 'national id', 'identification document',
    'driver\'s license', 'drivers license', 'police clearance', 'residency permit',
    'residence permit', 'country of residence', 'additional id', 'usa id', 'cpf',
  ]],
  ['poa', ['power of attorney', 'poa', 'letter of authorization']],
  ['website', ['website', 'webpage', 'linkedin', 'company\'s url', 'company url']],
  ['kyc_reset', [
    'kyc reset', 'kyc process', 'kyc verification', 'kyc has been reset', 'vpn', 'proxy', 'incognito',
  ]],
  ['edd', ['due diligence', 'edd', 'politically exposed', 'pep']],
  ['proof_of_address', [
    'proof of address', 'proof of residence', 'confirm country of residence',
    'confirmation of country residence',
  ]],
  ['tax', ['tax', 'ruc', 'rfc', 'rnc', 'rut']],
  ['additional_info', [
    'additional information', 'additional info', 'additional document', 'additional documents',
    'additional questions', 'additional question', 'business description', 'contracts and roles',
    'duplicate account', 'duplicate accounts', 'duplicate ontop account', 'entity type', 'information',
  ]],
]

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Word-boundary match — a plain substring check would let a keyword like "id" match
// inside "residence" or "valid".
function containsKeyword(title: string, keyword: string): boolean {
  return new RegExp(`(^|[^a-z0-9])${escapeRegex(keyword)}([^a-z0-9]|$)`, 'i').test(title)
}

export function matchDocCategory(title: string): DocCategory | null {
  for (const [category, keywords] of CATEGORY_KEYWORDS) {
    if (keywords.some(kw => containsKeyword(title, kw))) return category
  }
  return null
}

const JUNK_TITLE_PATTERNS = [/^test\b/i, /^asas$/i, /^duplicate\b/i, /vpn\/proxy/i, /incognito/i, /^answer\b/i]

// "for/of/de <Capitalized Word Word>" and possessives ("Korotkova Svetlana's ID") are
// how a third party's name shows up in document_title. We can't reliably scrub a name
// out of free text, so when one is detected we refuse to auto-send rather than risk
// naming the wrong person (or a stranger) in a client-facing WhatsApp message.
const PERSON_NAME_PATTERN = /\b(?:for|of|de|del)\s+[A-ZÀ-Ý][a-zà-ÿ'-]+(?:\s+[A-ZÀ-Ý][a-zà-ÿ'-]+){1,3}\b/
const POSSESSIVE_NAME_PATTERN = /\b[A-ZÀ-Ý][a-zà-ÿ'-]+(?:\s+[A-ZÀ-Ý][a-zà-ÿ'-]+){0,2}'s\b/

export function sanitizeDocTitle(raw: string): string | null {
  let t = raw.replace(/\s+/g, ' ').trim()
  if (!t || t.length < 3) return null
  if (JUNK_TITLE_PATTERNS.some(p => p.test(t))) return null

  t = t.replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim()
  if (!t || t.length < 3) return null
  if (PERSON_NAME_PATTERN.test(t) || POSSESSIVE_NAME_PATTERN.test(t)) return null

  return t
}

export type RoutingResult =
  | { kind: 'generic'; docsText: string }
  | { kind: 'needs_review'; reason: string }

// Only two WhatsApp templates are approved right now: segment_a_nudge (Segment A)
// and generic, which lists whatever is pending (Segment B). Category-specific
// templates below (ownership, incorporation, etc.) aren't approved yet, so routing
// always resolves to generic — or needs_review when a title can't be safely
// sanitized — never to a specific category.
export function routeSegmentB(pendingDocsList: string | null | undefined): RoutingResult {
  const list = (pendingDocsList ?? '').split('|').map(s => s.trim()).filter(Boolean)
  if (list.length === 0) return { kind: 'needs_review', reason: 'no pending_docs_list' }

  const sanitizedList = list.map(sanitizeDocTitle)
  if (sanitizedList.some(s => s === null)) {
    return { kind: 'needs_review', reason: 'one or more pending titles could not be safely sanitized' }
  }
  return { kind: 'generic', docsText: (sanitizedList as string[]).join(', ') }
}

export function localeFor(language: MsgLanguage): 'es' | 'en' {
  return language === 'ES' || language === 'ES-EU' ? 'es' : 'en'
}

export type TemplateKey = DocCategory | 'generic' | 'segment_a_nudge'

interface TemplateSpec {
  // Hardcoded default = the name confirmed approved in the KYB message-matrix sheet.
  // Set the matching env var to override without a code change.
  defaultName?: { es: string; en: string }
  envKey: string
  buildParams: (ctx: TemplateContext) => string[]
}

const TEMPLATE_SPECS: Record<TemplateKey, TemplateSpec> = {
  segment_a_nudge: {
    envKey: 'SEGMENT_A_NUDGE',
    defaultName: { es: 'neversubmittedkybgeneralnudge_spa', en: 'neversubmittedkybgeneralnudge_eng' },
    buildParams: c => [c.firstName, c.company],
  },
  ownership: {
    envKey: 'OWNERSHIP',
    defaultName: { es: 'ownershipshareholdingstructure_spa', en: 'ownershipshareholdingstructure_eng' },
    buildParams: c => [c.firstName, c.company],
  },
  incorporation: {
    envKey: 'INCORPORATION',
    defaultName: { es: 'proofofincorporation_spa', en: 'proofofincorporation_eng' },
    buildParams: c => [c.firstName, c.company],
  },
  website: {
    envKey: 'WEBSITE',
    defaultName: { es: 'companywebsite_spa', en: 'companywebsite_eng' },
    buildParams: c => [c.firstName, c.company],
  },
  proof_of_address: {
    envKey: 'PROOF_OF_ADDRESS',
    defaultName: { es: 'proofofaddress_spa', en: 'proofofaddress_eng' },
    buildParams: c => [c.firstName, c.company],
  },
  tax: {
    envKey: 'TAX',
    defaultName: { es: 'taxdocumentcertificate_spa', en: 'taxdocumentcertificate_eng' },
    buildParams: c => [c.firstName, c.company],
  },
  id_document: {
    envKey: 'ID_DOCUMENT',
    defaultName: { es: 'iddocumentshareholderrepresentative_spa', en: 'iddocumentshareholderrepresentative_eng' },
    buildParams: c => [c.firstName, c.company, c.holderName ?? ''],
  },
  poa: {
    envKey: 'POA',
    defaultName: { es: 'powerofattorney_spa', en: 'powerofattorney_eng' },
    buildParams: c => [c.firstName, c.company, c.attorneyName ?? ''],
  },
  // No approved name in the sheet for these three — must be set via env before use.
  kyc_reset: { envKey: 'KYC_RESET', buildParams: c => [c.firstName, c.reason ?? '', c.link ?? ''] },
  edd: { envKey: 'EDD', buildParams: c => [c.firstName, c.company, c.link ?? ''] },
  additional_info: { envKey: 'ADDITIONAL_INFO', buildParams: c => [c.firstName, c.company, c.detail ?? ''] },
  // New catch-all for titles that don't match any category (or 2+ pending docs). Also
  // has no approved name yet — must be set via env before use.
  generic: { envKey: 'GENERIC_MISSING_DOC', buildParams: c => [c.firstName, c.company, c.docsText ?? ''] },
}

export function getTemplateName(category: TemplateKey, language: MsgLanguage): string {
  const spec = TEMPLATE_SPECS[category]
  const locale = localeFor(language)
  const envVar = `ZENDLY_TEMPLATE_${spec.envKey}_${locale.toUpperCase()}`
  const fromEnv = process.env[envVar]
  const fallback = spec.defaultName?.[locale]
  const name = fromEnv || fallback
  if (!name) throw new Error(`${envVar} not configured and no default template name for "${category}"/${locale}`)
  return name
}

export function buildTemplateParams(category: TemplateKey, ctx: TemplateContext): string[] {
  return TEMPLATE_SPECS[category].buildParams(ctx)
}
