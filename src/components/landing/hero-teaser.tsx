"use client"

import { useEffect, useRef, useState } from "react"
import s from "./landing.module.css"

/**
 * The hero's app window playing the Nexora teaser (marketing/video,
 * 1920×1080). Plays muted and looping (what browsers allow for autoplay), only
 * while on screen; the address bar follows the scene shown in the video. With
 * reduced motion it shows the first frame and a play control instead.
 */

const SRC = "/landing/teaser/nexora-teaser.mp4"
const POSTER = "/landing/teaser/nexora-teaser-poster.webp"

// When each scene starts in the teaser (seconds), for the address bar
const CHAPTERS: { at: number; path: string }[] = [
  { at: 0, path: "client-invoices" },
  { at: 18, path: "timeline" },
  { at: 26, path: "overview" },
]

const pathAt = (t: number) => {
  let path = CHAPTERS[0]!.path
  for (const c of CHAPTERS) if (t >= c.at) path = c.path
  return path
}

export function HeroTeaser({ label }: { label: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [path, setPath] = useState(CHAPTERS[0]!.path)
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    // React doesn't write `muted` into the HTML; browsers need it set to autoplay
    video.muted = true
    let visible = false
    const play = () => {
      if (still) return
      video.play().catch(() => undefined)
    }
    const io = new IntersectionObserver(
      ([e]) => {
        visible = !!e?.isIntersecting
        if (visible) play()
        else video.pause()
      },
      { threshold: 0.15 }
    )
    io.observe(video)
    const onTime = () => setPath(pathAt(video.currentTime))
    video.addEventListener("timeupdate", onTime)
    const onVisibility = () => {
      if (document.hidden) video.pause()
      else if (visible) play()
    }
    document.addEventListener("visibilitychange", onVisibility)
    if (still) queueMicrotask(() => setReduced(true))
    return () => {
      io.disconnect()
      video.removeEventListener("timeupdate", onTime)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [])

  return (
    <>
      <div className={s.windowBar}>
        <span className={s.dot} />
        <span className={s.dot} />
        <span className={s.dot} />
        <span className={s.windowUrl} dir="ltr">app.nexora.ma/dashboard/{path}</span>
      </div>
      <video
        ref={videoRef}
        className={s.teaserVideo}
        src={SRC}
        poster={POSTER}
        width={1920}
        height={1080}
        muted
        loop
        playsInline
        preload="auto"
        controls={reduced}
        aria-label={label}
      />
    </>
  )
}
