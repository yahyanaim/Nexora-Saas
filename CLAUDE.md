@AGENTS.md

## Reports and screenshots

- There is **one** audit file: `docs/AUDIT.md`. A new audit, code review or report replaces its content; do not add new dated audit or report files.
- There is **one** screenshots folder: `docs/screenshots/` (flat, JPEG quality 80). A new step or audit replaces the images in it; do not add sub-folders per step.
- The user manual (`documentation/doc.html`, `doc-ar.html`) has its own images: `documentation/screenshots/` (real screenshots of the demo company, flat, WebP quality 80: images under public/ must be WebP or AVIF) and `documentation/diagrams/` (Archify diagrams; sources in `documentation/diagrams/source/`). Refresh them when the manual is updated; `node scripts/sync-docs.mjs` copies them to `public/documentation`.
- The API contract is `docs/API_CONTRACT.md`. The backend lives in `yahyanaim/Nexora-Backend`.
