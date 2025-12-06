import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'V-FSB',
  description: 'Viscan Feedback & Suggestion Box',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}