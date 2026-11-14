import { awards, sections } from '@/content/content'
import './Awards.css'

/** Every award: its name, then one sentence on what it is. */
export function Awards() {
  return (
    <section id="awards" className="awards section" aria-labelledby="awards-title" data-stub="true">
      <div className="wrap">
        <h2 id="awards-title">{sections.awards.title}</h2>
        <ul className="awards-list" role="list">
          {awards.map((award) => (
            <li key={award.title} className="awards-row">
              <span className="t-body tone-1">{award.title}</span>
              <span className="t-body tone-3">{award.description}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
