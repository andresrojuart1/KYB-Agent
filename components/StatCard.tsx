import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: number | string
  icon: LucideIcon
  accent?: string
  sub?: string
}

export default function StatCard({ label, value, icon: Icon, accent = 'text-[#6c63ff]', sub }: StatCardProps) {
  return (
    <div className="bg-[#13161e] border border-[#252836] rounded-2xl p-6">
      <div className="flex items-start justify-between mb-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#8b92a5]">{label}</p>
        <div className="w-8 h-8 rounded-lg bg-[#1a1e28] flex items-center justify-center">
          <Icon size={16} className={accent} />
        </div>
      </div>
      <p className={cn('text-3xl font-bold', accent)}>{value}</p>
      {sub && <p className="text-xs text-[#8b92a5] mt-1">{sub}</p>}
    </div>
  )
}
