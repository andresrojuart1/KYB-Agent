'use client'

import { useEffect, useState, useCallback } from 'react'
import type { KybClient } from '@/lib/types'
import ClientsTable from '@/components/ClientsTable'
import { RefreshCw } from 'lucide-react'

export default function SegmentAPage() {
  const [clients, setClients] = useState<KybClient[]>([])
  const [loading, setLoading] = useState(true)
  const [lastFetched, setLastFetched] = useState<Date | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/clients?segment=A')
      const data = await res.json()
      setClients(data.clients ?? [])
      setLastFetched(new Date())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#6c63ff]/15 text-[#a78bfa]">Segment A</span>
          </div>
          <h1 className="text-2xl font-bold text-white">No KYB Submitted</h1>
          <p className="text-[#8b92a5] mt-1">
            Clients who registered in the last 30 days but have never started the KYB process.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#252836] text-[#8b92a5] hover:text-white hover:border-[#6c63ff]/50 text-sm transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="bg-[#13161e] border border-[#252836] rounded-2xl p-12 text-center text-[#8b92a5]">
          Loading clients from Redshift…
        </div>
      ) : (
        <>
          {lastFetched && (
            <p className="text-xs text-[#8b92a5] mb-3">
              Last updated: {lastFetched.toLocaleTimeString()}
            </p>
          )}
          <ClientsTable clients={clients} segment="A" onRefresh={load} />
        </>
      )}
    </div>
  )
}
