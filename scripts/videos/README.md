# Module videos

One video of about 30 seconds per module, recorded from the demo app with a spoken narration and captions. The scripts are in [`docs/videos/`](../../docs/videos/); the 40 modules and their scenes are in [`modules.mjs`](modules.mjs).

| # | Module | Status |
| :--- | :--- | :--- |
| 01 | My work | ✅ [script](../../docs/videos/01-my-work.md) |
| 02 | Team | ✅ [script](../../docs/videos/02-team.md) |
| 03–40 | Workspace settings, Employees … Console health & incidents | Listed in `modules.mjs`, scenes to write |

## What a video contains

- A title card (module number, name, one-line tagline), then the real page in 1920×1080.
- A spotlight that follows what the narrator names, and a cursor for clicks.
- A narration spoken offline by [Kokoro](https://github.com/thewh1teagle/kokoro-onnx) (Apache-2.0), captions burned in and also written to an `.srt` file.
- An end card that announces the next module.

## Setup (once)

```bash
mkdir -p ~/kokoro && cd ~/kokoro
python3 -m venv venv && venv/bin/pip install kokoro-onnx soundfile
curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
```

You also need `ffmpeg` (with libx264 and libass) and Playwright's Chromium (`npx playwright install chromium`, or `CHROMIUM_PATH=/path/to/chromium`).

## Render a video

```bash
NEXT_PUBLIC_DEMO_MODE=true npm run dev                # terminal 1
VIDEO_VOICES=~/kokoro VIDEO_PYTHON=~/kokoro/venv/bin/python \
  node scripts/videos/make-video.mjs 1                # terminal 2: number or slug
```

The result is `videos/01-my-work.mp4` and `videos/01-my-work.srt` (the folder is not committed). `BASE_URL` changes the app address, `VIDEO_OUT` the output folder, and `VIDEO_KEEP_WORK=1` keeps the frames and audio for checking.

## Add the next module

1. Write the script in `docs/videos/NN-slug.md`: about 70 words, one line per scene.
2. Add `login`, `path` and `scenes` to the module in `modules.mjs`. Each scene is one narration line (`say`) and what happens on screen while it is spoken (`run`):
   - `v.spot("box:Vacation left")` puts the spotlight on the card or panel around that text; `v.spot("text:Overdue")` on the text itself; `v.clearSpot()` removes it.
   - `v.until("vacation")` waits until the narrator reaches that word.
   - `v.scrollTo(target)`, `v.click(target)`, `v.waitForHeading("Timesheets")`, `v.hideCursor()`, `v.wait(ms)`.
3. `login` is an employee email (e.g. `lina@atlas.example`), nothing for the company admin demo, or `"console"` for the Nexora team console. Put the other pages the video opens in `warm`, so they are compiled before recording.
4. Render, then watch it: a scene lasts as long as its line, so a long line or a slow action makes the video longer than 30 seconds.
