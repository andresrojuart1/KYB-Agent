import { Skeleton } from '@/components/Skeleton'

export default function DashboardLoading() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <Skeleton className="h-7 w-40 mb-2" />
        <Skeleton className="h-4 w-72" />
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-[#13161e] border border-[#252836] rounded-2xl p-6">
            <div className="flex items-start justify-between mb-4">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="w-8 h-8 rounded-lg" />
            </div>
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>

      <div className="bg-[#13161e] border border-[#252836] rounded-2xl">
        <div className="px-6 py-4 border-b border-[#252836]">
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="divide-y divide-[#252836]">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="px-6 py-4 flex items-center gap-4">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-56" />
              </div>
              <div className="space-y-2 text-right">
                <Skeleton className="h-5 w-16 ml-auto" />
                <Skeleton className="h-3 w-20 ml-auto" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
