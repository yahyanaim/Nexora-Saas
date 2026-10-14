import Image from "next/image"
import s from "./landing.module.css"

interface Props {
  src: string
  alt: string
  width: number
  height: number
  /** Visible frame as width / height */
  frame?: number
  /** "loop": down and back up forever; "once": down one time (product tabs) */
  mode?: "loop" | "once"
  /** Seconds for one cycle */
  duration?: number
  sizes: string
  eager?: boolean
}

/**
 * A full-length app screenshot in a fixed frame that slowly scrolls through
 * the whole page, with a thin scrollbar that follows. Pauses on hover; with
 * reduced motion it does not move and the frame scrolls by hand instead.
 */
export function ScrollShot({ src, alt, width, height, frame = 16 / 10, mode = "loop", duration = 16, sizes, eager }: Props) {
  const vars = {
    "--r": height / width,
    "--fr": 1 / frame,
    "--frame": frame,
    "--dur": `${duration}s`,
  } as React.CSSProperties

  return (
    <div className={`${s.scrollShot} ${mode === "once" ? s.scrollOnce : ""}`} style={vars}>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes}
        className={s.scrollImg}
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : undefined}
      />
      <span className={s.scrollTrack} aria-hidden>
        <span className={s.scrollThumb} />
      </span>
    </div>
  )
}
