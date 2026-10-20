import Image from "next/image"
import { Link } from "@/i18n/navigation"
import { NEXORA_PLANS, NEXORA_VAT_RATE } from "@/lib/platform/nexora-catalog"
import { Carousel } from "./carousel"
import { CodeTabs } from "./code-tabs"
import { FOOTER_HREFS, GALLERY, LANDING_LOCALES, LOGOS, NAV_HREFS, STAT_VALUES, TESTIMONIAL_PHOTOS } from "./content"
import { fill, getLandingCopy } from "./copy"
import { DitherCanvas } from "./dither-canvas"
import { arabic, geist, geistMono } from "./fonts"
import { HeroTeaser } from "./hero-teaser"
import { LanguageMenu } from "./language-menu"
import { CountUp, RevealObserver, ScrollFX } from "./motion"
import { PixelGlobe } from "./pixel-globe"
import { ProductTabs } from "./product-tabs"
import { ScrollShot } from "./scroll-shot"
import s from "./landing.module.css"

const SIGN_UP = "/auth?section=register"
const SIGN_IN = "/auth"

const formatMad = (n: number) => n.toLocaleString("en-US").replace(/,/g, " ")
/** Stagger delay for the n-th item of a revealed group */
const delay = (i: number, step = 70) => ({ "--d": `${i * step}ms` }) as React.CSSProperties

function Eyebrow({ index, children }: { index?: string; children: React.ReactNode }) {
  return (
    <p className={s.eyebrow}>
      {index && <b>[{index}]</b>}
      {children}
    </p>
  )
}

function Mark({ size = 28 }: { size?: number }) {
  return <Image src="/landing/nexora-mark.webp" alt="" width={size} height={size} loading="eager" />
}

/** Splits a heading into words that rise one after another when revealed */
function Words({ text, from = 0 }: { text: string; from?: number }) {
  return text.split(" ").map((w, i) => (
    <span key={i}>
      {i > 0 && " "}
      <span className={s.word}>
        <span style={{ "--i": from + i } as React.CSSProperties}>{w}</span>
      </span>
    </span>
  ))
}

function Heading({ title, muted }: { title: string; muted: string }) {
  return (
    <h2 className={s.h2}>
      <Words text={title} />{" "}
      <span className={s.muted}>
        <Words text={muted} from={title.split(" ").length} />
      </span>
    </h2>
  )
}

function SectionHead({ index, label, title, muted }: { index: string; label: string; title: string; muted: string }) {
  return (
    <div data-reveal>
      <Eyebrow index={index}>{label}</Eyebrow>
      <Heading title={title} muted={muted} />
    </div>
  )
}

export function LandingPage({ locale }: { locale: string }) {
  const c = getLandingCopy(locale)
  // "docs" and "docsAlt" in the link lists open the documentation in this page's language, or the other one
  const href = (h: string) => (h === "docs" ? c.docsHref : h === "docsAlt" ? c.docsAltHref : h)
  return (
    <div
      className={`${s.page} ${geist.variable} ${geistMono.variable} ${arabic.variable}`}
      data-landing
      dir={c.dir}
      lang={LANDING_LOCALES.some((l) => l.code === locale) ? locale : "en"}
    >
      <div className={s.announce}>
        <span className={s.tag}>{c.announce.tag}</span>
        <span className={s.hideSm}>{c.announce.text}</span>
        <a href="#compliance">{c.announce.link}</a>
      </div>

      <header className={s.nav}>
        <span className={s.scrollBar} aria-hidden />
        <div className={s.navInner}>
          <Link href="/" className={s.brand} aria-label={c.nav.home}>
            <Mark />
            nexora
          </Link>
          <nav className={s.navLinks} aria-label={c.nav.main}>
            {NAV_HREFS.map((h, i) => (
              <a key={h} href={href(h)}>
                {c.nav.links[i]}
              </a>
            ))}
          </nav>
          <div className={s.navActions}>
            <LanguageMenu current={locale} label={c.nav.language} />
            <Link href={SIGN_IN} className={`${s.signIn} ${s.hideSm}`}>
              {c.nav.signIn}
            </Link>
            <Link href={SIGN_UP} className={`${s.btn} ${s.btnSm}`}>
              {c.nav.start}
            </Link>
          </div>
        </div>
      </header>

      <main id="main">
        <div className={s.frame}>
          {/* Hero */}
          <section className={s.hero} id="product">
            <div className={s.heroTop}>
              <div className={s.heroCopy}>
                <div className={s.fadeIn} style={{ "--d": "0s" } as React.CSSProperties}>
                  <Eyebrow>
                    {c.hero.eyebrow}
                    <span className={s.cursor} aria-hidden />
                  </Eyebrow>
                </div>
                <h1 className={s.h1}>
                  {c.hero.lines.map((line, i) => (
                    <span key={i} className={`${s.line} ${i > 1 ? s.h1Accent : ""}`}>
                      <span style={{ "--d": `${[0.05, 0.15, 0.3, 0.4][i]}s` } as React.CSSProperties}>{line}</span>
                    </span>
                  ))}
                </h1>
                <div className={s.fadeIn} style={{ "--d": "0.55s" } as React.CSSProperties}>
                  <p className={s.heroSub}>{c.hero.sub}</p>
                  <div className={s.heroCtas}>
                    <Link href={SIGN_UP} className={s.btn}>
                      {c.hero.start} <span className={s.arrow}>{c.arrow}</span>
                    </Link>
                    <a href={c.docsHref} className={s.btnGhost}>
                      {c.hero.docs}
                    </a>
                  </div>
                </div>
              </div>
              <div className={`${s.heroGlobe} ${s.fadeIn}`} style={{ "--d": "0.35s" } as React.CSSProperties}>
                <PixelGlobe />
                <span className={s.globeTag}>
                  <i aria-hidden /> {c.hero.globeTag}
                </span>
              </div>
            </div>
            <div className={`${s.heroMeta} ${s.fadeIn}`} style={{ "--d": "0.7s" } as React.CSSProperties}>
              {c.hero.meta.map((m) => (
                <span key={m}>{m}</span>
              ))}
            </div>

            <div className={`${s.heroStage} ${s.fadeIn}`} style={{ "--d": "0.8s" } as React.CSSProperties}>
              <div className={s.heroArt} aria-hidden data-scroll>
                <Image src="/landing/hero-dither.webp" alt="" width={1920} height={560} loading="eager" unoptimized />
                <DitherCanvas variant="skyline" cell={6} className={s.ditherFill} />
              </div>
              <div className={s.window} data-scroll>
                <HeroTeaser label={c.hero.teaser} />
              </div>
            </div>
          </section>

          {/* Logos */}
          <section className={s.section}>
            <div className={s.logosHead}>
              <Eyebrow>{c.logos}</Eyebrow>
            </div>
            <div className={s.marquee}>
              <div className={s.marqueeTrack}>
                {[...LOGOS, ...LOGOS].map((name, i) => (
                  <div key={i} className={s.logo} aria-hidden={i >= LOGOS.length}>
                    {name}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Product screens */}
          <section className={s.section}>
            <div className={s.padHead}>
              <div className={s.headRow}>
                <SectionHead index="01" label={c.product.label} title={c.product.title} muted={c.product.muted} />
                <Link href={SIGN_UP} className={s.btnGhost} data-reveal>
                  {c.product.demo} <span className={s.arrow}>{c.arrow}</span>
                </Link>
              </div>
            </div>
            <ProductTabs copy={c.product} />
          </section>

          {/* Features */}
          <section className={s.section}>
            <div className={s.padHead}>
              <SectionHead index="02" label={c.features.label} title={c.features.title} muted={c.features.muted} />
            </div>
            <div className={s.features}>
              {c.features.items.map((f, i) => (
                <article key={f.tag} className={s.feature} data-reveal style={delay(i % 3)}>
                  <div className={s.featureTop}>
                    <b>{f.tag}</b>
                    <span>{String(i + 1).padStart(2, "0")}</span>
                  </div>
                  <h3>{f.title}</h3>
                  <p>{f.body}</p>
                </article>
              ))}
            </div>
          </section>

          {/* Text band that slides with the scroll */}
          <section className={`${s.section} ${s.band}`} aria-hidden data-scroll>
            <div className={s.bandRow}>
              {[0, 1, 2].flatMap((k) =>
                c.band[0]!.flatMap((w) => [<span key={`${k}${w}`}>{w}</span>, <i key={`${k}${w}i`}>■</i>]),
              )}
            </div>
            <div className={s.bandRow}>
              {[0, 1, 2].flatMap((k) =>
                c.band[1]!.flatMap((w) => [<span key={`${k}${w}`}>{w}</span>, <i key={`${k}${w}i`}>■</i>]),
              )}
            </div>
          </section>

          {/* Chain */}
          <section className={s.section}>
            <div className={s.padHead}>
              <SectionHead index="03" label={c.chain.label} title={c.chain.title} muted={c.chain.muted} />
              <p className={s.lead} data-reveal>
                {c.chain.lead}
              </p>
              <div className={s.replaces} data-reveal>
                {c.chain.replaces.map((r) => (
                  <span key={r}>{r}</span>
                ))}
              </div>
            </div>
            <div className={s.chain}>
              {c.chain.steps.map((step, i) => (
                <div key={i} className={s.chainCell} data-reveal style={delay(i, 60)}>
                  <span className={s.chainStep}>
                    {String(i + 1).padStart(2, "0")} {c.arrow}
                  </span>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Compliance */}
          <section className={s.section} id="compliance">
            <div className={s.split}>
              <div className={s.splitCopy}>
                <SectionHead index="04" label={c.compliance.label} title={c.compliance.title} muted={c.compliance.muted} />
                <p className={s.lead} data-reveal>
                  {c.compliance.lead}
                </p>
                <ul className={s.checks}>
                  {c.compliance.items.map((item, i) => (
                    <li key={item} data-reveal style={delay(i, 50)}>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className={s.splitCode}>
                <div className={s.splitCodeInner} data-reveal>
                  <CodeTabs copy={c.compliance} />
                </div>
              </div>
            </div>
          </section>

          {/* Stats */}
          <section className={s.section}>
            <div className={s.stats}>
              {STAT_VALUES.map((value, i) => (
                <div key={value} className={s.stat} data-reveal style={delay(i, 110)}>
                  <CountUp value={value} />
                  <i className={s.statBar} aria-hidden />
                  <span>{c.stats[i]}</span>
                </div>
              ))}
            </div>
            <div className={s.statsStrip} aria-hidden>
              <DitherCanvas variant="field" cell={6} className={s.ditherFill} />
            </div>
          </section>

          {/* Modules */}
          <section className={s.section} id="modules">
            <div className={s.padHead}>
              <SectionHead index="05" label={c.modules.label} title={c.modules.title} muted={c.modules.muted} />
            </div>
            <div className={s.modules}>
              {c.modules.items.map((m, i) => (
                <div key={m} className={s.module} data-reveal style={delay(i % 6, 40)}>
                  <small>{String(i + 1).padStart(2, "0")}</small>
                  {m}
                </div>
              ))}
            </div>
            <Carousel label={c.modules.carousel} speed={42} slideClass={s.slideScreen} words={c.carousel}>
              {GALLERY.map((g, i) => (
                <figure key={g.src}>
                  <div className={s.shotCard}>
                    <ScrollShot
                      src={g.src}
                      alt={fill(c.product.alt, { name: c.modules.gallery[i] ?? "" })}
                      width={g.width}
                      height={g.height}
                      duration={16 + (i % 3) * 2}
                      sizes="(max-width: 768px) 88vw, 520px"
                    />
                  </div>
                  <figcaption className={s.shotCaption}>
                    <span>{c.modules.gallery[i]}</span>
                    <span>{c.modules.fullPage}</span>
                  </figcaption>
                </figure>
              ))}
            </Carousel>
          </section>

          {/* Roles */}
          <section className={s.section}>
            <div className={s.padHead}>
              <SectionHead index="06" label={c.roles.label} title={c.roles.title} muted={c.roles.muted} />
            </div>
            <div className={s.roles}>
              {c.roles.items.map((r, i) => (
                <div key={r.role} className={s.roleCard} data-reveal style={delay(i)}>
                  <h3>{r.role}</h3>
                  <p>{r.body}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Testimonials */}
          <section className={s.section}>
            <div className={s.padHead}>
              <SectionHead index="07" label={c.customers.label} title={c.customers.title} muted={c.customers.muted} />
            </div>
            <Carousel label={c.customers.carousel} speed={36} slideClass={s.slideQuote} words={c.carousel}>
              {c.customers.quotes.map((t, i) => (
                <figure key={t.name} className={s.quote}>
                  <blockquote>
                    {c.quoteMarks[0]}
                    {t.quote}
                    {c.quoteMarks[1]}
                  </blockquote>
                  <figcaption>
                    <Image src={TESTIMONIAL_PHOTOS[i] ?? TESTIMONIAL_PHOTOS[0]!} alt={t.name} width={88} height={88} className={s.avatarImg} />
                    <span>
                      {t.name}
                      <small>{t.role}</small>
                    </span>
                  </figcaption>
                </figure>
              ))}
            </Carousel>
          </section>

          {/* Pricing */}
          <section className={s.section} id="pricing">
            <div className={s.padHead}>
              <SectionHead index="08" label={c.pricing.label} title={c.pricing.title} muted={c.pricing.muted} />
            </div>
            <div className={s.plans}>
              {NEXORA_PLANS.filter((p) => !p.retired).map((p, i) => {
                const words = c.pricing.plans?.[p.id] ?? p
                return (
                <div key={p.id} className={`${s.plan} ${p.featured ? s.planFeatured : ""}`} data-reveal style={delay(i, 90)}>
                  <div className={s.planHead}>
                    {p.name}
                    {p.featured && <span className={s.planBadge}>{c.pricing.popular}</span>}
                  </div>
                  <div className={s.price}>
                    <strong>{formatMad(p.monthly)}</strong>
                    <span>{c.pricing.perMonth}</span>
                  </div>
                  <p className={s.planDesc}>{words.description}</p>
                  <ul className={s.planList}>
                    {words.features.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                  {p.id === "enterprise" ? (
                    <a href="mailto:sales@nexora.ma" className={s.btnGhost}>
                      {c.pricing.sales}
                    </a>
                  ) : (
                    <Link href={SIGN_UP} className={p.featured ? s.btn : s.btnGhost}>
                      {c.pricing.trial}
                    </Link>
                  )}
                </div>
                )
              })}
            </div>
            <p className={s.priceNote}>
              {fill(c.pricing.note, { vat: NEXORA_VAT_RATE })}
            </p>
          </section>

          {/* FAQ */}
          <section className={s.section}>
            <div className={s.faq}>
              <div className={s.faqIntro}>
                <SectionHead index="09" label={c.faq.label} title={c.faq.title} muted={c.faq.muted} />
                <p className={s.lead} data-reveal>
                  {c.faq.lead} <a href="mailto:hello@nexora.ma">hello@nexora.ma</a>.
                </p>
              </div>
              <div className={s.faqList}>
                {c.faq.items.map((f, i) => (
                  <details key={f.q} data-reveal style={delay(i, 50)}>
                    <summary>{f.q}</summary>
                    <p>{f.a}</p>
                  </details>
                ))}
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className={s.section}>
            <div className={s.cta}>
              <div className={s.ctaArt} aria-hidden data-scroll>
                <Image src="/landing/cta-dither.webp" alt="" width={1920} height={640} unoptimized />
                <DitherCanvas variant="field" cell={8} className={s.ditherFill} />
              </div>
              <div className={s.ctaCard} data-reveal>
                <Eyebrow index="10">{c.cta.label}</Eyebrow>
                <Heading title={c.cta.title} muted={c.cta.muted} />
                <div className={s.heroCtas}>
                  <Link href={SIGN_UP} className={s.btn}>
                    {c.cta.start} <span className={s.arrow}>{c.arrow}</span>
                  </Link>
                  <a href="mailto:sales@nexora.ma" className={s.btnGhost}>
                    {c.cta.demo}
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className={s.section}>
            <div className={s.footer}>
              <div>
                <Link href="/" className={s.brand}>
                  <Mark size={26} />
                  nexora
                </Link>
                <p className={s.footerTag}>{c.footer.tagline}</p>
              </div>
              {c.footer.columns.map((col, ci) => (
                <div key={col.title}>
                  <h4>{col.title}</h4>
                  <ul>
                    {col.links.map((label, li) => (
                      <li key={label}>
                        <a href={href(FOOTER_HREFS[ci]?.[li] ?? "#")}>{label}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className={s.wordmark} aria-hidden>
              <span className={s.wordmarkFallback}>nexora</span>
              <DitherCanvas variant="wordmark" cell={5} className={s.wordmarkCanvas} />
            </div>
            <div className={s.legal}>
              <span>
                © {new Date().getFullYear()} {c.footer.rights}
              </span>
              <span className={s.status}>{c.footer.status}</span>
            </div>
          </footer>
        </div>
      </main>
      <RevealObserver />
      <ScrollFX />
    </div>
  )
}
