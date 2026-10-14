# Nexora: Arabic social carousel

Ten 1080×1350 slides (4:5, for Instagram and LinkedIn carousels), in Arabic, right to left, drawn with the app's own design: the colors from `globals.css`, the logo pill of the sign-in page, the KPI tile, summary cards, pill buttons, Lucide icons and the blue skyline.

| # | Slide | Shows |
| :-- | :-- | :-- |
| 01 | شركتك تبيع الوقت… | Cover: logo, floating app cards, skyline |
| 02 | القصة أكبر من برنامج فواتير! | Record → invoice → profit |
| 03 | خمس أدوات متفرقة… في مكان واحد! | What Nexora replaces, the full chain |
| 04 | سجّل وقتك بضغطة… | Weekly timesheet, timer, approval |
| 05 | من الساعات المعتمدة… إلى فاتورة جاهزة! | Invoice from approved hours, ICE / IF, UBL 2.1 |
| 06 | اعرف من لم يدفع… | Receivables by age, 3 reminder levels, bank import |
| 07 | أرقامك المهمة… في نظرة واحدة! | Analytics tiles, revenue trend, Victor |
| 08 | كل شخص يرى… ما يحتاجه فقط! | Roles and what each one sees |
| 09 | في جيبك… وبلغتك! | Phone app, 9 languages |
| 10 | جرّبه الآن… | The two demo companies, call to action |

The PNG files ready to post are in [`png/`](png).

## Changing a slide

1. Edit `nexora-carousel-ar.html` (one `<section class="slide">` per slide). Open it in a browser to preview; it reads the logo, skyline and avatars from `public/`.
2. Render: `node marketing/social/render.mjs` (add `--scale 2` for 2160×2700). It needs the dev dependencies (`npm ci`) and network access for the Google Fonts.

The account shown at the bottom right of every slide is `Nexora ERP`; replace it with your handle (search for `class="handle"`).

## Caption

> شركتك تبيع وقت فريقها… فلماذا يضيع بين جدول الساعات وأداة الفوترة وملفات الموارد البشرية؟
>
> ‏Nexora ERP يجمع السلسلة كاملة في نظام واحد: الأشخاص ← العملاء ← المشاريع ← الساعات ← الفواتير ← النقد ← الربح.
>
> اسحب لترى كيف ←
>
> ‏#Nexora #ERP #شركات_الخدمات #الفوترة_الإلكترونية #إدارة_المشاريع #المغرب
