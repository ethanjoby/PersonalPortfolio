import { Button } from '@/components/ui/Button'
import { about, profile } from '@/content/content'
import './Hero.css'

/** Top of the page: who he is, in two short paragraphs, with his photo beside them. */
export function Hero() {
  return (
    <section id="top" className="hero section" aria-labelledby="hero-title" data-stub="true">
      <div className="wrap hero-grid">
        <div className="hero-copy">
          <h1 id="hero-title" className="t-hero">
            {profile.name}
          </h1>
          <div className="hero-intro">
            {about.intro.map((paragraph, i) => (
              <p key={i} className="t-lead tone-2">
                {paragraph.map((run, j) =>
                  typeof run === 'string' ? (
                    run
                  ) : 'strong' in run ? (
                    <strong key={j}>{run.strong}</strong>
                  ) : (
                    <a key={j} className="link" href={run.href}>
                      {run.link}
                    </a>
                  ),
                )}
              </p>
            ))}
          </div>
          <div className="hero-actions">
            <Button variant="primary" href={about.primaryCta.href} arrow>
              {about.primaryCta.label}
            </Button>
            <Button href={about.secondaryCta.href}>{about.secondaryCta.label}</Button>
          </div>
        </div>
        <img
          className="hero-portrait"
          src={profile.portrait.src}
          alt={profile.portrait.alt}
          width={profile.portrait.width}
          height={profile.portrait.height}
        />
      </div>
    </section>
  )
}
