import { supabaseAdmin } from '@/lib/supabase'
import StatCard from '@/components/StatCard'
import { Users, FileWarning, MessageCircle, CheckCircle, Clock, TrendingUp } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import type { ContactLog } from '@/lib/types'

async function getDashboardData() {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [totalRes, todayRes, pendingRes, respondedRes, recentRes] = await Promise.all([
    supabaseAdmin.from('contacts_log').select('segment', { count: 'exact', head: true }),
    supabaseAdmin.from('contacts_log').select('*', { count: 'exact', head: true }).gte('sent_at', todayStart),
    supabaseAdmin.from('contacts_log').select('*', { count: 'exact', head: true }).eq('status', 'sent'),
    supabaseAdmin.from('contacts_log').select('*', { count: 'exact', head: true }).eq('status', 'responded').gte('sent_at', weekStart),
    supabaseAdmin.from('contacts_log').select('*').order('sent_at', { ascending: false }).limit(10),
  ])

  const segARes = await supabaseAdmin.from('contacts_log').select('*', { count: 'exact', head: true }).eq('segment', 'A')
  const segBRes = await supabaseAdmin.from('contacts_log').select('*', { count: 'exact', head: true }).eq('segment', 'B')

  return {
    total: totalRes.count ?? 0,
    segA: segARes.count ?? 0,
    segB: segBRes.count ?? 0,
    today: todayRes.count ?? 0,
    pending: pendingRes.count ?? 0,
    responded: respondedRes.count ?? 0,
    recent: (recentRes.data ?? []) as ContactLog[],
  }
}

export default async function DashboardPage() {
  const data = await getDashboardData()

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-[#8b92a5] mt-1">Overview of KYB re-engagement activity</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
        <StatCard label="Segment A – No KYB" value={data.segA} icon={Users} accent="text-[#6c63ff]" sub="Never submitted KYB" />
        <StatCard label="Segment B – Pending Docs" value={data.segB} icon={FileWarning} accent="text-orange-400" sub="Waiting for documents" />
        <StatCard label="Total Contacted" value={data.total} icon={MessageCircle} accent="text-cyan-400" sub="All time" />
        <StatCard label="Contacted Today" value={data.today} icon={TrendingUp} accent="text-blue-400" />
        <StatCard label="Awaiting Response" value={data.pending} icon={Clock} accent="text-yellow-400" sub="Sent, no response yet" />
        <StatCard label="Responded This Week" value={data.responded} icon={CheckCircle} accent="text-green-400" />
      </div>

      {/* Recent contacts */}
      <div className="bg-[#13161e] border border-[#252836] rounded-2xl">
        <div className="px-6 py-4 border-b border-[#252836]">
          <h2 className="text-white font-semibold">Recent Contacts</h2>
        </div>
        {data.recent.length === 0 ? (
          <div className="px-6 py-12 text-center text-[#8b92a5]">No contacts sent yet.</div>
        ) : (
          <div className="divide-y divide-[#252836]">
            {data.recent.map((c) => (
              <div key={c.id} className="px-6 py-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium text-sm truncate">{c.company ?? c.cod_client}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${c.segment === 'A' ? 'bg-[#6c63ff]/15 text-[#a78bfa]' : 'bg-orange-400/15 text-orange-400'}`}>
                      Seg {c.segment}
                    </span>
                  </div>
                  <p className="text-[#8b92a5] text-xs mt-0.5">{c.contact_name ?? '—'} · {c.contact_email ?? '—'}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    c.status === 'responded' ? 'bg-green-400/10 text-green-400' :
                    c.status === 'failed' ? 'bg-red-400/10 text-red-400' :
                    c.status === 'sent' ? 'bg-blue-400/10 text-blue-400' :
                    'bg-gray-400/10 text-gray-400'
                  }`}>
                    {c.status}
                  </span>
                  <p className="text-[#8b92a5] text-xs mt-1">{formatDateTime(c.sent_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
