# Nexora: Arabic social carousel

Ten 1080×1350 slides (4:5, for Instagram and LinkedIn carousels), in Arabic, right to left. They follow the reference carousel's template: the counter at the top left, the logo at the top right, one title and subtitle, one visual, a "جرّب هذا" box, a caption, and `اسحب ←` with the account at the bottom. The colors are Nexora's, and the dark windows show real screenshots of the app.

| # | Slide | Template |
| :-- | :-- | :-- |
| 01 | نظام واحد يدير شركتك… من الساعة حتى الربح! | Cover: glass Nexora "N" on a misty platform |
| 02 | القصة أكبر من برنامج فواتير! | Sphere and three-step line (يسجّل · يفوتر · يحسب) |
| 03 | سجّل ساعاتك… ودَعه يجهّز الفاتورة! | App window, code card, "try this" box |
| 04 | حتى أرقامك صارت واضحة! | Dark window: Analytics screenshot |
| 05 | من الساعات المعتمدة… إلى فاتورة جاهزة! | App window, code card, "try this" box |
| 06 | اعرف من تأخّر في الدفع! | Dark window: Receivables screenshot |
| 07 | كل شخص يرى ما يخصّه فقط! | Sphere and three-step line (الموظف · المدير · المحاسب) |
| 08 | في جيبك… وبلغتك! | Dark window: three phone screenshots |
| 09 | اعرف ربح كل مشروع… قبل نهاية الشهر! | App window, code card, "try this" box |
| 10 | جرّبه الآن بنفسك! | Window: the sign-in (landing) page |

The PNG files ready to post are in [`png/`](png).

## Files

- `nexora-carousel-ar.html`: the ten slides (one `<section class="slide">` each). Open it in a browser to preview.
- `assets/`: the logo mark without its white background, and the app screenshots used in the windows (Arabic, demo data; dark theme for Analytics, Receivables and the phones).
- `render.mjs`: writes `png/nexora-ar-01.png` … `10.png`.

## Changing a slide

1. Edit the slide in `nexora-carousel-ar.html`.
2. Render: `node marketing/social/render.mjs` (add `--scale 2` for 2160×2700). It needs the dev dependencies (`npm ci`) and network access for the Google Fonts.

The account shown at the bottom right of every slide is `Nexora ERP`; replace it with your handle (search for `class="handle"`).

To refresh a screenshot, run the app in demo mode (`NEXT_PUBLIC_DEMO_MODE=true`), open `/ar`, choose **Instant Demo Preview**, close the notices at the top, and capture the page at 1180×600 (phones: 390×780).

## Caption

> شركتك تبيع وقت فريقها… فلماذا يضيع بين جدول الساعات وأداة الفوترة وملفات الموارد البشرية؟
>
> ‏Nexora ERP يجمع السلسلة كاملة في نظام واحد: الأشخاص ← العملاء ← المشاريع ← الساعات ← الفواتير ← النقد ← الربح.
>
> اسحب لترى كيف ←
>
> ‏#Nexora #ERP #شركات_الخدمات #الفوترة_الإلكترونية #إدارة_المشاريع #المغرب
