export { auth as proxy } from '@/lib/auth'

export const config = {
  matcher: ['/((?!api/auth|api/webhooks|api/cron|api/send|api/clients|api/settings|api/contacts|api/cron-runs|api/webhook-events|_next/static|_next/image|favicon.ico|login).*)'],
}
