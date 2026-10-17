# Nexora: teaser video

[`nexora-teaser.mp4`](nexora-teaser.mp4) is a 39.5-second, 1920×1080, 30 fps teaser, in Arabic, built like the reference teaser ([`reference-teaser.mp4`](reference-teaser.mp4)). The app floats tilted on a deep-blue starfield, the camera pushes in, screens fill in piece by piece, a cursor clicks, and title cards sit between the scenes. Like the reference, it has no sound; add a track in Instagram, TikTok or your editor.

Every screen is a real capture of Nexora (demo company, Arabic, light theme). The motion is added on top.

| Time | Scene | What happens |
| :-- | :-- | :-- |
| 0–2 s | Opening | Client invoices, tilted in 3D with its cards lifted off the page, flattens |
| 2–8 s | Command | The cursor clicks **إنشاء فاتورة** on Helio Energy, ticks the approved hours and expenses one by one, clicks **إنشاء مسودة** |
| 8–11 s | Title card | `INV-2026-025 · INVOICE`, **فاتورة Helio Energy**, 48 hours, 74,520 MAD with tax |
| 11–18 s | Invoice | The draft fills in, **إصدار** issues it (number, "تم إصدار الفاتورة" toast), the payment and DGI e-invoice panels appear |
| 18–26 s | Timeline | Every project on one schedule: rows appear, bars grow, milestones pop, the today line draws |
| 26–34 s | Analytics | KPI tiles appear, the revenue chart draws, the other cards follow as the camera pans down |
| 34–36 s | Closing | Analytics tilted, the KPI tiles and chart floating above the page |
| 36–39.5 s | End card | Nexora ERP, «من الساعة… إلى الفاتورة… إلى الربح», «قريبًا» |

## Files

- `capture.mjs`: drives the demo app and saves each screen at 1600 px wide (×2), filled and with its content hidden, plus the boxes the teaser reveals and clicks (`assets/*.webp`, `assets/shots.json`).
- `nexora-teaser.html`: the animation. `window.render(t)` draws the frame at `t` seconds. To watch it live, serve the `marketing/` folder (e.g. `npx serve marketing`) and open `video/nexora-teaser.html?play`.
- `render.mjs`: renders every frame and encodes the MP4 with ffmpeg (H.264).
- `reference-teaser.mp4`: the reference video.

## Render again

```bash
NEXT_PUBLIC_DEMO_MODE=true npm run dev        # terminal 1, only to capture the screens again
node marketing/video/capture.mjs               # terminal 2: refreshes assets/
node marketing/video/render.mjs                # writes nexora-teaser.mp4 (about 4 minutes)
node marketing/video/render.mjs --fps 60       # smoother camera moves, like the reference
node marketing/video/render.mjs --from 8 --to 12 --out clip.mp4   # one part
```

Rendering needs ffmpeg with libx264 and network access for the Google Fonts (IBM Plex Sans Arabic, Geist, Geist Mono). The texts of the title and end cards are in `nexora-teaser.html`; the camera moves are the `CAMS` keys and the cursor path is `CURSOR`.
