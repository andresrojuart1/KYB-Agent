import { Skeleton } from './Skeleton'

export default function ClientsTableSkeleton() {
  return (
    <div>
      <Skeleton className="h-10 max-w-md mb-4" />
      <div className="bg-[#13161e] border border-[#252836] rounded-2xl overflow-hidden">
        <div className="divide-y divide-[#252836]">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="px-4 py-3.5 flex items-center gap-4">
              <Skeleton className="w-4 h-4 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-4 w-20 hidden md:block" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-7 w-16 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
