# Third-party notices

Nexora is built on an open-source starter and on open-source libraries. Their
licenses stay in force for the parts they cover and are reproduced here as those
licenses require. The Nexora License (see `LICENSE`) covers everything else.

## Original starter (MIT)

Parts of the platform layer (authentication, users, roles, plans, subscriptions,
files, developer keys, audit logs, sessions and parts of the UI kit) come from an
MIT-licensed SaaS starter.

```
MIT License

Copyright (c) 2026 Mohamed Elsayed

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Inter font (SIL Open Font License 1.1)

`public/fonts/inter-400.ttf` and `public/fonts/inter-700.ttf` (Latin subset, embedded in generated PDFs) are from Inter, Copyright 2016 The Inter Project Authors (https://github.com/rsms/inter), licensed under the SIL Open Font License, Version 1.1 (https://openfontlicense.org).

## Geist and Geist Mono fonts (SIL Open Font License 1.1)

`src/fonts/geist-var.woff2` and `src/fonts/geist-mono-var.woff2` (used on the public landing page) are from Geist, Copyright (c) 2023 Vercel, in collaboration with basement.studio (https://github.com/vercel/geist-font), licensed under the SIL Open Font License, Version 1.1. The full license is in `src/fonts/LICENSE-geist.txt`.

## npm dependencies

Every package in `package.json` keeps its own license (mostly MIT, Apache-2.0,
ISC and BSD). Run `npx license-checker --production --summary` to list them.
