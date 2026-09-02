import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { SessionProvider } from 'next-auth/react'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'KYB Agent – Ontop',
  description: 'KYB re-engagement agent for Ontop clients',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full bg-[#0d0f14] text-[#f0f2f7] antialiased`}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
