import { handlers } from '@/lib/auth'
import type { NextRequest } from 'next/server'

// Type cast needed for Next.js 16 route handler compatibility
export const GET = (req: NextRequest) => handlers.GET(req)
export const POST = (req: NextRequest) => handlers.POST(req)
