import { Button } from '@/components/ui/Button'
import { profile, sections } from '@/content/content'
import './Contact.css'

/** How to reach him. Plain first version. */
export function Contact() {
  return (
    <section id="contact" className="contact section" aria-labelledby="contact-title" data-stub="true">
      <div className="wrap contact-inner">
        <h2 id="contact-title">{sections.contact.title}</h2>
        <p className="t-lead tone-3">{sections.contact.body}</p>
        <div className="contact-actions">
          <Button variant="primary" href={`mailto:${profile.email}`}>
            {profile.email}
          </Button>
          <Button href={profile.linkedin} external>
            LinkedIn
          </Button>
          <Button href={profile.github} external>
            GitHub
          </Button>
        </div>
      </div>
    </section>
  )
}
