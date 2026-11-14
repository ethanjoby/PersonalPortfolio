import { about, nav, profile } from '@/content/content'
import { NavBar } from './NavBar'

/** The fixed site header. A server component: it only hands content to the interactive bar. */
export function Nav() {
  return <NavBar name={profile.name} links={nav} github={profile.github} cta={about.secondaryCta} />
}
