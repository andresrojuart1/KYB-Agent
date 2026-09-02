import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { ContactStatus } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

export function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export function getStatusColor(status: ContactStatus): string {
  const map: Record<ContactStatus, string> = {
    sent: 'text-blue-400 bg-blue-400/10',
    delivered: 'text-cyan-400 bg-cyan-400/10',
    responded: 'text-green-400 bg-green-400/10',
    failed: 'text-red-400 bg-red-400/10',
    opted_out: 'text-orange-400 bg-orange-400/10',
    no_response: 'text-gray-400 bg-gray-400/10',
  }
  return map[status] ?? 'text-gray-400 bg-gray-400/10'
}

export function getStatusLabel(status: ContactStatus): string {
  const map: Record<ContactStatus, string> = {
    sent: 'Sent',
    delivered: 'Delivered',
    responded: 'Responded',
    failed: 'Failed',
    opted_out: 'Opted Out',
    no_response: 'No Response',
  }
  return map[status] ?? status
}

export function getUrgencyColor(days: number | null): string {
  if (days === null) return 'text-gray-400'
  if (days > 14) return 'text-red-400'
  if (days > 7) return 'text-orange-400'
  return 'text-yellow-400'
}
