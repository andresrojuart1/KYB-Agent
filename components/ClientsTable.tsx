'use client'

import { useMemo, useState, useTransition } from 'react'
import { MessageCircle, Mail, Send, ChevronDown, ChevronUp, Search, AlertTriangle } from 'lucide-react'
import type { KybClient } from '@/lib/types'
import { formatDate, getUrgencyColor } from '@/lib/utils'
import { routeSegmentB } from '@/lib/kyb-templates'
import SendModal from './SendModal'

interface ClientsTableProps {
  clients: KybClient[]
  segment: 'A' | 'B'
  onRefresh: () => void
}

export default function ClientsTable({ clients, segment, onRefresh }: ClientsTableProps) {
  const [search, setSearch] = useState('')
  const [onlyNeedsReview, setOnlyNeedsReview] = useState(false)
  const [selected, setSelected] = useState<KybClient | null>(null)
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [sortKey, setSortKey] = useState<keyof KybClient>('days_since_last_login')
  const [sortAsc, setSortAsc] = useState(false)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [, startTransition] = useTransition()

  // Segment B only: whether the cron would auto-send this client or leave it for
  // manual review (unsanitizable pending doc title). Computed once per client list
  // so the badge/filter below don't re-run the routing logic on every render.
  const needsReviewByClient = useMemo(() => {
    if (segment !== 'B') return new Map<string, boolean>()
    return new Map(clients.map(c => [c.cod_client, routeSegmentB(c.pending_docs_list).kind === 'needs_review']))
  }, [clients, segment])

  const needsReviewCount = segment === 'B'
    ? clients.filter(c => needsReviewByClient.get(c.cod_client)).length
    : 0

  const filtered = clients
    .filter(c =>
      c.company?.toLowerCase().includes(search.toLowerCase()) ||
      c.cod_client?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase())
    )
    .filter(c => !onlyNeedsReview || needsReviewByClient.get(c.cod_client))
    .sort((a, b) => {
      const av = a[sortKey] ?? ''
      const bv = b[sortKey] ?? ''
      const cmp = av < bv ? -1 : av > bv ? 1 : 0
      return sortAsc ? cmp : -cmp
    })

  const toggleSort = (key: keyof KybClient) => {
    if (sortKey === key) setSortAsc(!sortAsc)
    else { setSortKey(key); setSortAsc(false) }
  }

  const toggleRow = (cod: string) => {
    const next = new Set(selectedRows)
    if (next.has(cod)) next.delete(cod)
    else next.add(cod)
    setSelectedRows(next)
  }

  const toggleAll = () => {
    if (selectedRows.size === filtered.length) setSelectedRows(new Set())
    else setSelectedRows(new Set(filtered.map(c => c.cod_client)))
  }

  const handleBulkSend = async (channel: 'whatsapp' | 'email') => {
    if (selectedRows.size === 0) return
    setBulkLoading(true)
    const targets = filtered.filter(c => selectedRows.has(c.cod_client))
    await Promise.all(
      targets.map(c =>
        fetch('/api/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cod_client: c.cod_client,
            channel,
            phone: c.phone,
            email: c.email,
            contact_name: `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim(),
            company: c.company,
            segment: c.segment,
            msg_language: c.msg_language,
            pending_docs_list: c.pending_docs_list,
            attempt_number: (c.contacts_sent ?? 0) + 1,
          }),
        })
      )
    )
    setBulkLoading(false)
    setSelectedRows(new Set())
    startTransition(() => onRefresh())
  }

  const SortIcon = ({ col }: { col: keyof KybClient }) =>
    sortKey === col
      ? sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />
      : <ChevronDown size={12} className="opacity-30" />

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b92a5]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search company, client ID, email…"
            className="w-full pl-9 pr-4 py-2.5 bg-[#1a1e28] border border-[#252836] rounded-xl text-sm text-white placeholder-[#8b92a5] focus:outline-none focus:border-[#6c63ff]/50"
          />
        </div>

        {segment === 'B' && needsReviewCount > 0 && (
          <button
            onClick={() => setOnlyNeedsReview(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors border ${
              onlyNeedsReview
                ? 'bg-orange-400/15 border-orange-400/50 text-orange-400'
                : 'border-[#252836] text-[#8b92a5] hover:border-orange-400/50 hover:text-orange-400'
            }`}
          >
            <AlertTriangle size={14} />
            {onlyNeedsReview ? 'Showing' : 'Show'} {needsReviewCount} needing review
          </button>
        )}

        {selectedRows.size > 0 && (
          <div className="flex gap-2">
            <span className="text-sm text-[#8b92a5] self-center">{selectedRows.size} selected</span>
            <button
              onClick={() => handleBulkSend('whatsapp')}
              disabled={bulkLoading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-500/10 text-green-400 hover:bg-green-500/20 text-sm font-medium transition-colors disabled:opacity-50"
            >
              <MessageCircle size={14} />
              Send WA
            </button>
            <button
              onClick={() => handleBulkSend('email')}
              disabled={bulkLoading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 text-sm font-medium transition-colors disabled:opacity-50"
            >
              <Mail size={14} />
              Send Email
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-[#13161e] border border-[#252836] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#252836]">
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selectedRows.size === filtered.length}
                    onChange={toggleAll}
                    className="accent-[#6c63ff]"
                  />
                </th>
                <th className="px-4 py-3 text-left">
                  <button onClick={() => toggleSort('company')} className="flex items-center gap-1 text-[#8b92a5] hover:text-white font-medium text-xs uppercase tracking-wide">
                    Company <SortIcon col="company" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left hidden md:table-cell">
                  <button onClick={() => toggleSort('country')} className="flex items-center gap-1 text-[#8b92a5] hover:text-white font-medium text-xs uppercase tracking-wide">
                    Country <SortIcon col="country" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <span className="text-[#8b92a5] font-medium text-xs uppercase tracking-wide">Contact</span>
                </th>
                {segment === 'A' ? (
                  <th className="px-4 py-3 text-left">
                    <button onClick={() => toggleSort('days_since_last_login')} className="flex items-center gap-1 text-[#8b92a5] hover:text-white font-medium text-xs uppercase tracking-wide">
                      Last Login <SortIcon col="days_since_last_login" />
                    </button>
                  </th>
                ) : (
                  <>
                    <th className="px-4 py-3 text-left hidden lg:table-cell">
                      <button onClick={() => toggleSort('pending_docs')} className="flex items-center gap-1 text-[#8b92a5] hover:text-white font-medium text-xs uppercase tracking-wide">
                        Pending <SortIcon col="pending_docs" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left hidden lg:table-cell">
                      <button onClick={() => toggleSort('days_doc_pending')} className="flex items-center gap-1 text-[#8b92a5] hover:text-white font-medium text-xs uppercase tracking-wide">
                        Days Waiting <SortIcon col="days_doc_pending" />
                      </button>
                    </th>
                  </>
                )}
                <th className="px-4 py-3 text-left hidden sm:table-cell">
                  <span className="text-[#8b92a5] font-medium text-xs uppercase tracking-wide">Contacts Sent</span>
                </th>
                <th className="px-4 py-3 text-left">
                  <span className="text-[#8b92a5] font-medium text-xs uppercase tracking-wide">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#252836]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-[#8b92a5]">
                    No clients found.
                  </td>
                </tr>
              ) : (
                filtered.map(client => (
                  <tr key={client.cod_client} className="hover:bg-[#1a1e28] transition-colors">
                    <td className="px-4 py-3.5">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(client.cod_client)}
                        onChange={() => toggleRow(client.cod_client)}
                        className="accent-[#6c63ff]"
                      />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{client.company}</span>
                        {needsReviewByClient.get(client.cod_client) && (
                          <span
                            className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-orange-400/15 text-orange-400"
                            title="The cron can't auto-send this one — a pending doc title couldn't be safely sanitized. Send it manually."
                          >
                            <AlertTriangle size={10} />
                            Needs Review
                          </span>
                        )}
                      </div>
                      <div className="text-[#8b92a5] text-xs">{client.cod_client}</div>
                    </td>
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      <span className="text-[#f0f2f7] text-sm">{client.country}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="text-[#f0f2f7] text-sm">
                        {client.first_name} {client.last_name}
                      </div>
                      <div className="text-[#8b92a5] text-xs">{client.role}</div>
                      <div className="flex gap-2 mt-1">
                        {client.phone && (
                          <span className="text-[10px] text-green-400 flex items-center gap-0.5">
                            <MessageCircle size={10} />
                            {client.wsp_confirmed === 'Yes' ? 'WA ✓' : 'WA'}
                          </span>
                        )}
                        {client.email && (
                          <span className="text-[10px] text-blue-400 flex items-center gap-0.5">
                            <Mail size={10} />
                            Email
                          </span>
                        )}
                      </div>
                    </td>
                    {segment === 'A' ? (
                      <td className="px-4 py-3.5">
                        <span className={`text-sm font-medium ${getUrgencyColor(client.days_since_last_login)}`}>
                          {client.days_since_last_login != null ? `${client.days_since_last_login}d ago` : '—'}
                        </span>
                        <div className="text-[#8b92a5] text-xs">{formatDate(client.last_login)}</div>
                      </td>
                    ) : (
                      <>
                        <td className="px-4 py-3.5 hidden lg:table-cell">
                          {client.pending_docs != null && client.pending_docs > 0 ? (
                            <div>
                              <span className="text-orange-400 font-medium">{client.pending_docs} doc{client.pending_docs > 1 ? 's' : ''}</span>
                              <div className="text-[#8b92a5] text-xs truncate max-w-32" title={client.pending_docs_list ?? ''}>
                                {client.pending_docs_list}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[#8b92a5]">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 hidden lg:table-cell">
                          <span className={`text-sm font-medium ${getUrgencyColor(client.days_doc_pending)}`}>
                            {client.days_doc_pending != null ? `${client.days_doc_pending}d` : '—'}
                          </span>
                        </td>
                      </>
                    )}
                    <td className="px-4 py-3.5 hidden sm:table-cell">
                      {client.contacts_sent != null && client.contacts_sent > 0 ? (
                        <div>
                          <span className="text-[#f0f2f7] font-medium">{client.contacts_sent}</span>
                          <span className="text-[#8b92a5] text-xs ml-1">sent</span>
                          {client.last_contact_status && (
                            <div className="text-xs mt-0.5">
                              <span className={`${
                                client.last_contact_status === 'responded' ? 'text-green-400' :
                                client.last_contact_status === 'failed' ? 'text-red-400' :
                                'text-[#8b92a5]'
                              }`}>
                                {client.last_contact_status}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-[#8b92a5]">None</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <button
                        onClick={() => setSelected(client)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#6c63ff]/10 text-[#a78bfa] hover:bg-[#6c63ff]/20 text-xs font-medium transition-colors"
                      >
                        <Send size={12} />
                        Send
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-[#252836] text-xs text-[#8b92a5]">
          {filtered.length} of {clients.length} clients
        </div>
      </div>

      {selected && (
        <SendModal
          client={selected}
          onClose={() => setSelected(null)}
          onSent={() => {
            setSelected(null)
            startTransition(() => onRefresh())
          }}
        />
      )}
    </div>
  )
}
