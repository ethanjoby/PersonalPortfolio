import { Awards } from '@/sections/Awards/Awards'
import { Contact } from '@/sections/Contact/Contact'
import { Experience } from '@/sections/Experience/Experience'
import { Footer } from '@/sections/Footer/Footer'
import { Hero } from '@/sections/Hero/Hero'
import { Nav } from '@/sections/Nav/Nav'
import { Projects } from '@/sections/Projects/Projects'
import { Toolkit } from '@/sections/Toolkit/Toolkit'

/*
 * The whole site is this one statically prerendered page. The top section is the About (photo, name, a short intro),
 * then experience, projects, awards, toolkit and contact.
 * The header and the footer stay outside <main> so they keep their landmark roles.
 */
export default function Page() {
  return (
    <>
      <Nav />
      <main id="main">
        <Hero />
        <Experience />
        <Projects />
        <Awards />
        <Toolkit />
        <Contact />
      </main>
      <Footer />
    </>
  )
}
