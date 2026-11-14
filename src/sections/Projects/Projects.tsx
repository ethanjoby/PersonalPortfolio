import { ExternalLink } from '@/components/ui/ExternalLink'
import { projects, sections } from '@/content/content'
import './Projects.css'

/** Every project. Plain first version. */
export function Projects() {
  return (
    <section id="projects" className="projects section" aria-labelledby="projects-title" data-stub="true">
      <div className="wrap">
        <h2 id="projects-title">{sections.projects.title}</h2>
        <ul className="projects-list" role="list">
          {projects.map((project) => (
            <li key={project.id} className="projects-item">
              <p className="mono-label">{project.status}</p>
              <h3 className="t-h4">{project.name}</h3>
              <p className="t-body tone-2">{project.pitch}</p>
              <p className="t-small tone-3">{project.description}</p>
              <p className="projects-links">
                {project.links.map((link) => (
                  <ExternalLink key={link.href} className="link" href={link.href}>
                    {link.label}
                  </ExternalLink>
                ))}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
