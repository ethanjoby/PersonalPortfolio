import { ExternalLink } from '@/components/ui/ExternalLink'
import { Label } from '@/components/ui/Label'
import { about, nav, profile } from '@/content/content'
import './Footer.css'

/** Large wordmark and two mono-headed link columns. */
export function Footer() {
  const sectionLinks = [...nav, about.secondaryCta]

  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer-top">
          <a className="footer-wordmark" href="#top">
            <span>{profile.name}</span>
          </a>

          <nav className="footer-col footer-col-sections" aria-labelledby="footer-sections">
            <Label as="h2" id="footer-sections">
              Sections
            </Label>
            <ul className="footer-list" role="list">
              {sectionLinks.map((link) => (
                <li key={link.href}>
                  <a className="footer-link" href={link.href}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <nav className="footer-col footer-col-elsewhere" aria-labelledby="footer-elsewhere">
            <Label as="h2" id="footer-elsewhere">
              Elsewhere
            </Label>
            <ul className="footer-list" role="list">
              <li>
                <ExternalLink className="footer-link" href={profile.github}>
                  GitHub
                </ExternalLink>
              </li>
              <li>
                <ExternalLink className="footer-link" href={profile.linkedin}>
                  LinkedIn
                </ExternalLink>
              </li>
              <li>
                <a className="footer-link" href={`mailto:${profile.email}`}>
                  {profile.email}
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  )
}
