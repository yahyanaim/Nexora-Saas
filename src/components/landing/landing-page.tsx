import Image from "next/image"
import { Link } from "@/i18n/navigation"
import { NEXORA_PLANS, NEXORA_VAT_RATE } from "@/lib/platform/nexora-catalog"
import { Carousel } from "./carousel"
import { CodeTabs } from "./code-tabs"
import {
  CHAIN,
  COMPLIANCE,
  FAQ,
  FEATURES,
  FOOTER_COLUMNS,
  FOOTER_TAGLINE,
  GALLERY,
  LOGOS,
  MODULES,
  NAV_LINKS,
  REPLACES,
  ROLES,
  STATS,
  TESTIMONIALS,
} from "./content"
import { DitherCanvas } from "./dither-canvas"
import { geist, geistMono } from "./fonts"
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

export function LandingPage() {
  return (
    <div className={`${s.page} ${geist.variable} ${geistMono.variable}`} data-landing>
      <div className={s.announce}>
        <span className={s.tag}>NEW</span>
        <span className={s.hideSm}>DGI e-invoices, VAT return and the CGNC journal are live in Nexora.</span>
        <a href="#compliance">Read more →</a>
      </div>

      <header className={s.nav}>
        <span className={s.scrollBar} aria-hidden />
        <div className={s.navInner}>
          <Link href="/" className={s.brand} aria-label="Nexora home">
            <Mark />
            nexora
          </Link>
          <nav className={s.navLinks} aria-label="Main">
            {NAV_LINKS.map((l) => (
              <a key={l.label} href={l.href}>
                {l.label}
              </a>
            ))}
          </nav>
          <div className={s.navActions}>
            <Link href={SIGN_IN} className={`${s.signIn} ${s.hideSm}`}>
              Sign in
            </Link>
            <Link href={SIGN_UP} className={`${s.btn} ${s.btnSm}`}>
              Start for free
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
                    Nexora® · The ERP for service companies
                    <span className={s.cursor} aria-hidden />
                  </Eyebrow>
                </div>
                <h1 className={s.h1}>
                  <span className={s.line}>
                    <span style={{ "--d": "0.05s" } as React.CSSProperties}>Humans use</span>
                  </span>
                  <span className={s.line}>
                    <span style={{ "--d": "0.15s" } as React.CSSProperties}>spreadsheets.</span>
                  </span>
                  <span className={`${s.line} ${s.h1Accent}`}>
                    <span style={{ "--d": "0.3s" } as React.CSSProperties}>Companies use</span>
                  </span>
                  <span className={`${s.line} ${s.h1Accent}`}>
                    <span style={{ "--d": "0.4s" } as React.CSSProperties}>Nexora.</span>
                  </span>
                </h1>
                <div className={s.fadeIn} style={{ "--d": "0.55s" } as React.CSSProperties}>
                  <p className={s.heroSub}>
                    People, clients, projects, hours, invoices, cash and profit in one app. Built for agencies,
                    consultancies, studios, IT services and engineering offices.
                  </p>
                  <div className={s.heroCtas}>
                    <Link href={SIGN_UP} className={s.btn}>
                      Start for free <span className={s.arrow}>→</span>
                    </Link>
                    <a href="/documentation/doc.html" className={s.btnGhost}>
                      Read the docs
                    </a>
                  </div>
                </div>
              </div>
              <div className={`${s.heroGlobe} ${s.fadeIn}`} style={{ "--d": "0.35s" } as React.CSSProperties}>
                <PixelGlobe />
                <span className={s.globeTag}>
                  <i aria-hidden /> Casablanca → the world
                </span>
              </div>
            </div>
            <div className={`${s.heroMeta} ${s.fadeIn}`} style={{ "--d": "0.7s" } as React.CSSProperties}>
              <span>14-day free trial</span>
              <span>No card required</span>
              <span>9 languages incl. Arabic</span>
              <span>DGI e-invoicing ready</span>
            </div>

            <div className={`${s.heroStage} ${s.fadeIn}`} style={{ "--d": "0.8s" } as React.CSSProperties}>
              <div className={s.heroArt} aria-hidden data-scroll>
                <Image src="/landing/hero-dither.webp" alt="" width={1920} height={560} loading="eager" unoptimized />
                <DitherCanvas variant="skyline" cell={6} className={s.ditherFill} />
              </div>
              <div className={s.window} data-scroll>
                <div className={s.windowBar}>
                  <span className={s.dot} />
                  <span className={s.dot} />
                  <span className={s.dot} />
                  <span className={s.windowUrl}>app.nexora.ma/dashboard/overview</span>
                </div>
                <ScrollShot
                  src="/landing/screens/overview.webp"
                  alt="Nexora business analytics dashboard, full page: revenue, margin, utilization, cash, revenue over time, by client, bridge and top projects"
                  width={2000}
                  height={2724}
                  duration={22}
                  sizes="(max-width: 1200px) 100vw, 1120px"
                  eager
                />
              </div>
            </div>
          </section>

          {/* Logos */}
          <section className={s.section}>
            <div className={s.logosHead}>
              <Eyebrow>Trusted by service companies across Morocco and beyond</Eyebrow>
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
                <SectionHead index="01" label="Product" title="Run the whole company." muted="From one screen." />
                <Link href={SIGN_UP} className={s.btnGhost} data-reveal>
                  Try the demo <span className={s.arrow}>→</span>
                </Link>
              </div>
            </div>
            <ProductTabs />
          </section>

          {/* Features */}
          <section className={s.section}>
            <div className={s.padHead}>
              <SectionHead index="02" label="Features" title="Everything a service company runs on." muted="Nothing it doesn't." />
            </div>
            <div className={s.features}>
              {FEATURES.map((f, i) => (
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
                ["People", "Clients", "Projects", "Hours"].flatMap((w) => [<span key={`${k}${w}`}>{w}</span>, <i key={`${k}${w}i`}>■</i>]),
              )}
            </div>
            <div className={s.bandRow}>
              {[0, 1, 2].flatMap((k) =>
                ["Invoices", "Cash", "Profit", "Nexora"].flatMap((w) => [<span key={`${k}${w}`}>{w}</span>, <i key={`${k}${w}i`}>■</i>]),
              )}
            </div>
          </section>

          {/* Chain */}
          <section className={s.section}>
            <div className={s.padHead}>
              <SectionHead index="03" label="One chain, one app" title="From the first hour logged" muted="to the profit it made." />
              <p className={s.lead} data-reveal>
                Every step is connected, so the numbers at the end agree with the work at the start. Nexora replaces:
              </p>
              <div className={s.replaces} data-reveal>
                {REPLACES.map((r) => (
                  <span key={r}>{r}</span>
                ))}
              </div>
            </div>
            <div className={s.chain}>
              {CHAIN.map((c, i) => (
                <div key={c.step} className={s.chainCell} data-reveal style={delay(i, 60)}>
                  <span className={s.chainStep}>{c.step} →</span>
                  <h3>{c.title}</h3>
                  <p>{c.body}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Compliance */}
          <section className={s.section} id="compliance">
            <div className={s.split}>
              <div className={s.splitCopy}>
                <SectionHead index="04" label="Built for Morocco" title="Compliance," muted="by default." />
                <p className={s.lead} data-reveal>
                  Invoices can&apos;t be issued without the right identifiers, and every figure lands in the right
                  account. Your accountant gets exports, not a shoebox.
                </p>
                <ul className={s.checks}>
                  {COMPLIANCE.map((c, i) => (
                    <li key={c} data-reveal style={delay(i, 50)}>
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
              <div className={s.splitCode}>
                <div className={s.splitCodeInner} data-reveal>
                  <CodeTabs />
                </div>
              </div>
            </div>
          </section>

          {/* Stats */}
          <section className={s.section}>
            <div className={s.stats}>
              {STATS.map((st, i) => (
                <div key={st.label} className={s.stat} data-reveal style={delay(i, 110)}>
                  <CountUp value={st.value} />
                  <i className={s.statBar} aria-hidden />
                  <span>{st.label}</span>
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
              <SectionHead index="05" label="Modules" title="Forty modules." muted="One login, one source of truth." />
            </div>
            <div className={s.modules}>
              {MODULES.map((m, i) => (
                <div key={m} className={s.module} data-reveal style={delay(i % 6, 40)}>
                  <small>{String(i + 1).padStart(2, "0")}</small>
                  {m}
                </div>
              ))}
            </div>
            <Carousel label="Nexora screens" speed={42} slideClass={s.slideScreen}>
              {GALLERY.map((g, i) => (
                <figure key={g.src}>
                  <div className={s.shotCard}>
                    <ScrollShot
                      src={g.src}
                      alt={`Nexora ${g.caption} screen, full page`}
                      width={g.width}
                      height={g.height}
                      duration={16 + (i % 3) * 2}
                      sizes="(max-width: 768px) 88vw, 520px"
                    />
                  </div>
                  <figcaption className={s.shotCaption}>
                    <span>{g.caption}</span>
                    <span>Full page</span>
                  </figcaption>
                </figure>
              ))}
            </Carousel>
          </section>

          {/* Roles */}
          <section className={s.section}>
            <div className={s.padHead}>
              <SectionHead
                index="06"
                label="Roles & permissions"
                title="Everyone sees their part."
                muted="Costs stay with the people allowed to see them."
              />
            </div>
            <div className={s.roles}>
              {ROLES.map((r, i) => (
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
              <SectionHead index="07" label="Customers" title="Fewer tools." muted="Clearer margins." />
            </div>
            <Carousel label="What customers say" speed={36} slideClass={s.slideQuote}>
              {TESTIMONIALS.map((t) => (
                <figure key={t.name} className={s.quote}>
                  <blockquote>“{t.quote}”</blockquote>
                  <figcaption>
                    <Image src={t.photo} alt={t.name} width={88} height={88} className={s.avatarImg} />
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
              <SectionHead index="08" label="Pricing" title="Simple plans." muted="Start free for 14 days." />
            </div>
            <div className={s.plans}>
              {NEXORA_PLANS.filter((p) => !p.retired).map((p, i) => (
                <div key={p.id} className={`${s.plan} ${p.featured ? s.planFeatured : ""}`} data-reveal style={delay(i, 90)}>
                  <div className={s.planHead}>
                    {p.name}
                    {p.featured && <span className={s.planBadge}>Most popular</span>}
                  </div>
                  <div className={s.price}>
                    <strong>{formatMad(p.monthly)}</strong>
                    <span>MAD / month</span>
                  </div>
                  <p className={s.planDesc}>{p.description}</p>
                  <ul className={s.planList}>
                    {p.features.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                  {p.id === "enterprise" ? (
                    <a href="mailto:sales@nexora.ma" className={s.btnGhost}>
                      Talk to sales
                    </a>
                  ) : (
                    <Link href={SIGN_UP} className={p.featured ? s.btn : s.btnGhost}>
                      Start free trial
                    </Link>
                  )}
                </div>
              ))}
            </div>
            <p className={s.priceNote}>
              Prices before {NEXORA_VAT_RATE}% VAT · Pay by bank transfer or card · Yearly billing available
            </p>
          </section>

          {/* FAQ */}
          <section className={s.section}>
            <div className={s.faq}>
              <div className={s.faqIntro}>
                <SectionHead index="09" label="FAQ" title="Questions," muted="answered." />
                <p className={s.lead} data-reveal>
                  Something else? Write to <a href="mailto:hello@nexora.ma">hello@nexora.ma</a>.
                </p>
              </div>
              <div className={s.faqList}>
                {FAQ.map((f, i) => (
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
                <Eyebrow index="10">Get started</Eyebrow>
                <Heading title="Give your company" muted="one place to run." />
                <div className={s.heroCtas}>
                  <Link href={SIGN_UP} className={s.btn}>
                    Start for free <span className={s.arrow}>→</span>
                  </Link>
                  <a href="mailto:sales@nexora.ma" className={s.btnGhost}>
                    Book a demo
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
                <p className={s.footerTag}>{FOOTER_TAGLINE}</p>
              </div>
              {FOOTER_COLUMNS.map((col) => (
                <div key={col.title}>
                  <h4>{col.title}</h4>
                  <ul>
                    {col.links.map((l) => (
                      <li key={l.label}>
                        <a href={l.href}>{l.label}</a>
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
              <span>© {new Date().getFullYear()} Nexora. All rights reserved.</span>
              <span className={s.status}>All systems normal</span>
            </div>
          </footer>
        </div>
      </main>
      <RevealObserver />
      <ScrollFX />
    </div>
  )
}
