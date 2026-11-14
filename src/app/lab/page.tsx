import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { profile, roles } from '@/content/content'
import '@/styles/tokens.css'
import { Lab } from './Lab'

export const metadata: Metadata = {
  title: 'Wire engine lab',
  robots: { index: false, follow: false },
}

/** Development-only workbench for the 3D engine. It does not exist in a production build. */
export default function LabPage() {
  if (process.env.NODE_ENV === 'production') notFound()
  const satellites = roles.map(({ id, short, year, status }) => ({ id, short, year, status }))
  return <Lab satellites={satellites} location={profile.location} />
}
