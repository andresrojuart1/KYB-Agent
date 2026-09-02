'use client'

import { useMemo, useState } from 'react'
import { X, MessageCircle, Mail, Send, AlertTriangle } from 'lucide-react'
import type { KybClient, Channel } from '@/lib/types'
import { routeSegmentB } from '@/lib/kyb-templates'

interface SendModalProps {
  client: KybClient
  onClose: () => void
  onSent: () => void
}

export default function SendModal({ client, onClose, onSent }: SendModalProps) {
  const [channel, setChannel] = useState<Channel>('whatsapp')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const contactName = `${client.first_name ?? ''} ${client.last_name ?? ''}`.trim() || '—'
  const attemptNumber = (client.contacts_sent ?? 0) + 1

  // Only segment B needs document-based routing — segment A and email both stay
  // on the existing generic flow, so this only matters for WhatsApp + segment B.
  const routing = useMemo(
    () => (client.segment === 'B' ? routeSegmentB(client.pending_docs_list) : null),
    [client.segment, client.pending_docs_list],
  )

  const whatsappBlocked = channel === 'whatsapp' && routing?.kind === 'needs_review'

  const handleSend = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cod_client: client.cod_client,
          channel,
          phone: client.phone,
          email: client.email,
          contact_name: contactName,
          company: client.company,
          segment: client.segment,
          msg_language: client.msg_language,
          pending_docs_list: client.pending_docs_list,
          attempt_number: attemptNumber,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to send')
      }
      onSent()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#13161e] border border-[#252836] rounded-2xl w-full max-w-md mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#252836]">
          <div>
            <h2 className="text-white font-semibold">Send Follow-up</h2>
            <p className="text-[#8b92a5] text-sm mt-0.5">Attempt #{attemptNumber}</p>
          </div>
          <button onClick={onClose} className="text-[#8b92a5] hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-5">
          {/* Client info */}
          <div className="bg-[#1a1e28] rounded-xl p-4">
            <p className="text-white font-medium">{client.company}</p>
            <p className="text-[#8b92a5] text-sm mt-0.5">{contactName}</p>
            <div className="flex gap-4 mt-3 text-xs text-[#8b92a5]">
              {client.phone && (
                <span className="flex items-center gap-1">
                  <MessageCircle size={12} />
                  {client.phone}
                </span>
              )}
              {client.email && (
                <span className="flex items-center gap-1">
                  <Mail size={12} />
                  {client.email}
                </span>
              )}
            </div>
            {client.segment === 'B' && client.pending_docs_list && (
              <div className="mt-3 pt-3 border-t border-[#252836]">
                <p className="text-xs text-[#8b92a5] mb-1">Pending docs:</p>
                <p className="text-xs text-orange-400">{client.pending_docs_list}</p>
              </div>
            )}
          </div>

          {/* Channel selector */}
          <div>
            <label className="block text-sm font-medium text-[#8b92a5] mb-2">Channel</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setChannel('whatsapp')}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-colors ${
                  channel === 'whatsapp'
                    ? 'border-[#6c63ff] bg-[#6c63ff]/10 text-[#a78bfa]'
                    : 'border-[#252836] text-[#8b92a5] hover:border-[#6c63ff]/50'
                }`}
              >
                <MessageCircle size={16} />
                WhatsApp
                {client.wsp_confirmed === 'Yes' && (
                  <span className="ml-auto text-[10px] text-green-400">✓</span>
                )}
              </button>
              <button
                onClick={() => setChannel('email')}
                disabled={!client.email}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  channel === 'email'
                    ? 'border-[#6c63ff] bg-[#6c63ff]/10 text-[#a78bfa]'
                    : 'border-[#252836] text-[#8b92a5] hover:border-[#6c63ff]/50'
                }`}
              >
                <Mail size={16} />
                Email
              </button>
            </div>
          </div>

          {channel === 'whatsapp' && routing?.kind === 'needs_review' && (
            <div className="flex items-start gap-2 text-xs text-orange-400 bg-orange-400/10 rounded-lg px-3 py-2">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>
                No pudimos determinar automáticamente qué plantilla enviar ({routing.reason}). Revisa el
                documento pendiente antes de enviar por WhatsApp, o usa email.
              </span>
            </div>
          )}

          {/* Language note */}
          <p className="text-xs text-[#8b92a5]">
            Message will be sent in{' '}
            <span className="text-white">
              {client.msg_language === 'ES' || client.msg_language === 'ES-EU'
                ? 'Spanish'
                : client.msg_language === 'PT'
                ? 'Portuguese'
                : 'English'}
            </span>
          </p>

          {error && (
            <p className="text-red-400 text-sm bg-red-400/10 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-5 border-t border-[#252836] flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-[#252836] text-[#8b92a5] hover:text-white text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={loading || whatsappBlocked}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#6c63ff] hover:bg-[#7c74ff] text-white text-sm font-medium transition-colors disabled:opacity-60"
          >
            <Send size={15} />
            {loading ? 'Sending…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  )
}
