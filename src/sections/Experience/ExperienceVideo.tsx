'use client'

import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { RoleVideo } from '@/content/content'

export interface ExperienceVideoProps {
  video: RoleVideo
  /** Accessible name of the play button. */
  playLabel: string
}

/**
 * A video from a role. It never plays on its own: the poster shows with a play button, and the browser's controls
 * take over once the visitor starts it. Without JavaScript the browser's controls are there from the start.
 * While the play button is showing, the button is what assistive technology meets (its name carries the caption);
 * the video itself is hidden from it until it has controls.
 */
export function ExperienceVideo({ video, playLabel }: ExperienceVideoProps) {
  const ref = useRef<HTMLVideoElement>(null)
  const [mode, setMode] = useState<'native' | 'poster' | 'playing'>('native')

  useEffect(() => {
    setMode((current) => (current === 'native' ? 'poster' : current))
  }, [])

  // The play button is gone once the video starts: hand the keyboard focus to the video and its controls.
  useEffect(() => {
    if (mode === 'playing') ref.current?.focus({ preventScroll: true })
  }, [mode])

  // One video at a time, however this one was started (the play button, or the browser's own controls later).
  const pauseOthers = () => {
    for (const other of document.querySelectorAll<HTMLVideoElement>('.experience video')) {
      if (other !== ref.current) other.pause()
    }
  }

  const start = () => {
    const element = ref.current
    if (!element) return
    setMode('playing')
    void element.play().catch(() => {
      /* The controls are showing: the visitor can start it from there. */
    })
  }

  return (
    <figure className="experience-figure" style={{ '--experience-ar': (video.width / video.height).toFixed(4) } as CSSProperties}>
      <div className="experience-frame">
        <video
          ref={ref}
          src={video.src}
          poster={video.poster}
          width={video.width}
          height={video.height}
          controls={mode !== 'poster'}
          tabIndex={mode === 'poster' ? -1 : 0}
          preload="none"
          playsInline
          aria-label={video.caption}
          aria-hidden={mode === 'poster' ? true : undefined}
          onPlay={pauseOthers}
        />
        {mode === 'poster' ? (
          <button type="button" className="experience-play" onClick={start}>
            <span className="experience-play-disc" aria-hidden="true">
              <svg viewBox="0 0 16 16" width="16" height="16">
                <path d="M4.75 2.4v11.2L13.5 8z" fill="currentColor" />
              </svg>
            </span>
            <span className="visually-hidden">{playLabel}</span>
          </button>
        ) : null}
      </div>
    </figure>
  )
}
