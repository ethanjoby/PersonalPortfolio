import type { CSSProperties } from 'react'
import { Chip } from '@/components/ui/Chip'
import { ArrowIcon } from '@/components/ui/ArrowIcon'
import { roles, sections } from '@/content/content'
import { logoAspect } from '@/lib/logoAspect'
import { logoOn } from '@/lib/logos'
import { ExperienceVideo } from './ExperienceVideo'
import './Experience.css'

const STATUS_TAGS = { incoming: 'Incoming', current: 'Now' } as const
const PLAY_LABEL = 'Play video'

/** Logo height in rem: every logo gets about the same area, so a long wordmark and a square mark weigh the same. */
function logoHeight(aspect: number): number {
  return Math.min(3.25, Math.max(1.625, 3.8 / Math.sqrt(aspect)))
}

/** A bullet with its **marked** figures brought forward: every second piece between the marks is one. */
function withFigures(line: string) {
  return line.split('**').map((piece, index) => (index % 2 === 1 ? <strong key={index}>{piece}</strong> : piece))
}

/**
 * Experience: one row per role, across the whole frame. On the left the company's logo in its own colors (no company
 * name in text), the role and the dates. On the right the photos and videos from that role, in color, with what he did
 * there under the role; a role with no media has what he did there on the right instead.
 */
export function Experience() {
  return (
    <section id="experience" className="experience section" aria-labelledby="experience-title">
      <div className="wrap">
        <h2 id="experience-title">{sections.experience.title}</h2>
        <ul className="experience-list" role="list">
          {roles.map((role) => {
            const logo = logoOn('dark', role.logo)
            const aspect = logoAspect(logo)
            const photos = role.photos ?? []
            const videos = [...(role.video ? [role.video] : []), ...(role.videos ?? [])]
            const count = photos.length + videos.length
            const sum = [...videos, ...photos].reduce((total, item) => total + item.width / item.height, 0)
            return (
              <li
                key={role.id}
                id={`role-${role.id}`}
                className="experience-item"
                data-media={count > 0 ? 'true' : 'false'}
                data-media-height={count > 0 ? role.mediaHeight : undefined}
              >
                <div className="experience-head">
                  <h3 className="experience-company">
                    <img
                      className="experience-logo"
                      src={logo}
                      alt={role.company}
                      decoding="async"
                      style={
                        {
                          '--experience-logo-h': `${logoHeight(aspect).toFixed(3)}rem`,
                          '--experience-logo-ar': aspect.toFixed(4),
                        } as CSSProperties
                      }
                    />
                  </h3>
                  <p className="experience-role">
                    {role.role}
                    {role.team ? <span className="experience-team">{`, ${role.team}`}</span> : null}
                  </p>
                  <p className="experience-meta">
                    <span className="mono-label">{role.period}</span>
                    {role.status === 'incoming' ? <Chip variant="dashed">{STATUS_TAGS.incoming}</Chip> : null}
                    {role.status === 'current' ? (
                      <Chip variant="fill" className="experience-now">
                        {STATUS_TAGS.current}
                      </Chip>
                    ) : null}
                  </p>
                </div>

                {role.description.length > 0 ? (
                  <ul className="experience-description" role="list">
                    {role.description.map((line) => (
                      <li key={line}>{withFigures(line)}</li>
                    ))}
                  </ul>
                ) : null}

                {count > 0 ? (
                  <div className="experience-media">
                    <div
                      className="experience-media-row"
                      style={{ '--experience-count': String(count), '--experience-sum': sum.toFixed(4) } as CSSProperties}
                    >
                      {videos.map((video) => (
                        <ExperienceVideo key={video.src} video={video} playLabel={`${PLAY_LABEL}: ${video.caption}`} />
                      ))}
                      {photos.map((photo) => (
                        <figure
                          key={photo.src}
                          className="experience-figure"
                          style={{ '--experience-ar': (photo.width / photo.height).toFixed(4) } as CSSProperties}
                        >
                          <div className="experience-frame">
                            <img
                              src={photo.src}
                              alt={photo.alt}
                              width={photo.width}
                              height={photo.height}
                              style={photo.focus ? { objectPosition: photo.focus } : undefined}
                              loading="lazy"
                              decoding="async"
                            />
                            {photo.link ? (
                              <a className="experience-open" href={photo.link.href} target="_blank" rel="noopener noreferrer">
                                <span className="experience-open-label">
                                  {photo.link.label}
                                  <ArrowIcon direction="up-right" />
                                </span>
                                <span className="visually-hidden"> (opens in a new tab)</span>
                              </a>
                            ) : null}
                          </div>
                        </figure>
                      ))}
                    </div>
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
