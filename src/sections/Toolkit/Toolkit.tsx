import { sections, tools } from '@/content/content'
import { logoOn } from '@/lib/logos'
import './Toolkit.css'

/** The tools he works with, each with its logo in its own colors. */
export function Toolkit() {
  return (
    <section id="toolkit" className="toolkit section" aria-labelledby="toolkit-title" data-stub="true">
      <div className="wrap">
        <h2 id="toolkit-title">{sections.toolkit.title}</h2>
        <ul className="toolkit-list" role="list">
          {tools.map((tool) => (
            <li key={tool.name} className="toolkit-item">
              <img className="toolkit-logo" src={logoOn('dark', tool.logo)} alt="" />
              <span className="t-small tone-2">{tool.name}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
