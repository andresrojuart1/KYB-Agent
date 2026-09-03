export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-[#1a1e28] rounded-lg ${className}`} />
}
