'use client'

import { useEffect, useState } from 'react'
import type { ContactLog } from '@/lib/types'
import { formatDateTime, getStatusColor, getStatusLabel } from '@/lib/utils'
import { MessageCircle, Mail, Search, Filter } from 'lucide-react'

const STATUS_OPTIONS = ['all', 'sent', 'delivered', 'responded', 'failed', 'opted_out', 'no_response'] as const
const SEGMENT_OPTIONS = ['all', 'A', 'B'] as const

export default function ContactsPage() {
  const [contacts, setContacts] = useState<ContactLog[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<typeof STATUS_OPTIONS[number]>('all')
  const [segmentFilter, setSegmentFilter] = useState<typeof SEGMENT_OPTIONS[number]>('all')

  useEffect(() => {
    fetch('/api/contacts')
      .then(r => r.json())
      .then(d => setContacts(d.contacts ?? []))
      .finally(() => setLoading(false))
  }, [])

  const filtered = contacts.filter(c => {
    const matchSearch = !search ||
      c.company?.toLowerCase().includes(search.toLowerCase()) ||
      c.cod_client?.toLowerCase().includes(search.toLowerCase()) ||
      c.contact_email?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || c.status === statusFilter
    const matchSegment = segmentFilter === 'all' || c.segment === segmentFilter
    return matchSearch && matchStatus && matchSegment
  })

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Contact History</h1>
        <p className="text-[#8b92a5] mt-1">All follow-up messages sent to KYB clients.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b92a5]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search company, client ID, email…"
            className="w-full pl-9 pr-4 py-2.5 bg-[#13161e] border border-[#252836] rounded-xl text-sm text-white placeholder-[#8b92a5] focus:outline-none focus:border-[#6c63ff]/50"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={14} className="text-[#8b92a5]" />
          <select
            value={segmentFilter}
            onChange={e => setSegmentFilter(e.target.value as typeof SEGMENT_OPTIONS[number])}
            className="bg-[#13161e] border border-[#252836] rounded-xl text-sm text-[#f0f2f7] px-3 py-2.5 focus:outline-none focus:border-[#6c63ff]/50"
          >
            <option value="all">All Segments</option>
            <option value="A">Segment A</option>
            <option value="B">Segment B</option>
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as typeof STATUS_OPTIONS[number])}
            className="bg-[#13161e] border border-[#252836] rounded-xl text-sm text-[#f0f2f7] px-3 py-2.5 focus:outline-none focus:border-[#6c63ff]/50"
          >
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>{s === 'all' ? 'All Statuses' : getStatusLabel(s as ContactLog['status'])}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#13161e] border border-[#252836] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-[#8b92a5]">Loading contacts…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#252836]">
                  <th className="px-4 py-3 text-left text-[#8b92a5] font-medium text-xs uppercase tracking-wide">Company</th>
                  <th className="px-4 py-3 text-left text-[#8b92a5] font-medium text-xs uppercase tracking-wide hidden md:table-cell">Contact</th>
                  <th className="px-4 py-3 text-left text-[#8b92a5] font-medium text-xs uppercase tracking-wide">Channel</th>
                  <th className="px-4 py-3 text-left text-[#8b92a5] font-medium text-xs uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-left text-[#8b92a5] font-medium text-xs uppercase tracking-wide hidden lg:table-cell">Sent By</th>
                  <th className="px-4 py-3 text-left text-[#8b92a5] font-medium text-xs uppercase tracking-wide">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#252836]">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-[#8b92a5]">
                      No contacts found.
                    </td>
                  </tr>
                ) : filtered.map(c => (
                  <tr key={c.id} className="hover:bg-[#1a1e28] transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-white">{c.company ?? c.cod_client}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[#8b92a5] text-xs">{c.cod_client}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${c.segment === 'A' ? 'bg-[#6c63ff]/15 text-[#a78bfa]' : 'bg-orange-400/15 text-orange-400'}`}>
                          Seg {c.segment}
                        </span>
                        <span className="text-[10px] text-[#8b92a5]">#{c.attempt_number}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      <div className="text-[#f0f2f7] text-sm">{c.contact_name ?? '—'}</div>
                      <div className="text-[#8b92a5] text-xs">{c.contact_email ?? '—'}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`flex items-center gap-1.5 text-xs font-medium ${c.channel === 'whatsapp' ? 'text-green-400' : 'text-blue-400'}`}>
                        {c.channel === 'whatsapp' ? <MessageCircle size={13} /> : <Mail size={13} />}
                        {c.channel === 'whatsapp' ? 'WhatsApp' : 'Email'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(c.status)}`}>
                        {getStatusLabel(c.status)}
                      </span>
                      {c.response_summary && (
                        <div className="text-[#8b92a5] text-xs mt-1 max-w-48 truncate" title={c.response_summary}>
                          {c.response_summary}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 hidden lg:table-cell">
                      <span className="text-[#8b92a5] text-xs">{c.sent_by ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-[#8b92a5] text-xs">{formatDateTime(c.sent_at)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-4 py-3 border-t border-[#252836] text-xs text-[#8b92a5]">
          {filtered.length} records
        </div>
      </div>
    </div>
  )
}
