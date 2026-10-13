import Image from "next/image"
import { Link } from "@/i18n/navigation"
import { NEXORA_PLANS, NEXORA_VAT_RATE } from "@/lib/platform/nexora-catalog"
import { CodeTabs } from "./code-tabs"
import {
  CHAIN,
  COMPLIANCE,
  FAQ,
  FEATURES,
  FOOTER_COLUMNS,
  LOGOS,
  MODULES,
  NAV_LINKS,
  REPLACES,
  ROLES,
  STATS,
  TESTIMONIALS,
} from "./content"
import { geist, geistMono } from "./fonts"
import { ProductTabs } from "./product-tabs"
import s from "./landing.module.css"

const SIGN_UP = "/auth?section=register"
const SIGN_IN = "/auth"

const GALLERY = [
  { src: "/landing/deals.webp", caption: "Deals pipeline" },
  { src: "/landing/team.webp", caption: "Team dashboard" },
  { src: "/landing/kpis.webp", caption: "KPIs per person" },
]

const formatMad = (n: number) => n.toLocaleString("en-US").replace(/,/g, " ")
const initials = (name: string) =>
  name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")

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

export function LandingPage() {
  return (
    <div className={`${s.page} ${geist.variable} ${geistMono.variable}`}>
      <div className={s.announce}>
        <span className={s.tag}>NEW</span>
        <span className={s.hideSm}>DGI e-invoices, VAT return and the CGNC journal are live in Nexora.</span>
        <a href="#compliance">Read more →</a>
      </div>

      <header className={s.nav}>
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
            <Eyebrow>Nexora® · The ERP for service companies</Eyebrow>
            <div className={s.heroTop}>
              <h1 className={s.h1}>
                Humans use spreadsheets.
                <span>Companies use Nexora.</span>
              </h1>
              <div className={s.heroAside}>
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
            <div className={s.heroMeta}>
              <span>14-day free trial</span>
              <span>No card required</span>
              <span>9 languages incl. Arabic</span>
              <span>DGI e-invoicing ready</span>
            </div>

            <div className={s.heroStage}>
              <div className={s.heroArt} aria-hidden>
                <Image src="/landing/hero-dither.webp" alt="" width={1920} height={560} loading="eager" unoptimized />
              </div>
              <div className={s.window}>
                <div className={s.windowBar}>
                  <span className={s.dot} />
                  <span className={s.dot} />
                  <span className={s.dot} />
                  <span className={s.windowUrl}>app.nexora.ma/dashboard/overview</span>
                </div>
                <Image
                  src="/landing/overview.webp"
                  alt="Nexora business analytics dashboard with revenue, margin, utilization and cash collected"
                  width={2400}
                  height={1500}
                  sizes="(max-width: 1200px) 100vw, 1120px"
                  className={s.shot}
                  loading="eager"
                  fetchPriority="high"
                />
              </div>
            </div>
          </section>

          {/* Logos */}
          <section className={s.section}>
            <div className={s.logosHead}>
              <Eyebrow>Trusted by service companies across Morocco and beyond</Eyebrow>
            </div>
            <div className={s.logos}>
              {LOGOS.map((name) => (
                <div key={name} className={s.logo}>
                  {name}
                </div>
              ))}
            </div>
          </section>

          {/* Product screens */}
          <section className={s.section}>
            <div className={s.padHead}>
              <div className={s.headRow}>
                <div>
                  <Eyebrow index="01">Product</Eyebrow>
                  <h2 className={s.h2}>
                    Run the whole company. <span>From one screen.</span>
                  </h2>
                </div>
                <Link href={SIGN_UP} className={s.btnGhost}>
                  Try the demo <span className={s.arrow}>→</span>
                </Link>
              </div>
            </div>
            <ProductTabs />
          </section>

          {/* Features */}
          <section className={s.section}>
            <div className={s.padHead}>
              <Eyebrow index="02">Features</Eyebrow>
              <h2 className={s.h2}>
                Everything a service company runs on. <span>Nothing it doesn&apos;t.</span>
              </h2>
            </div>
            <div className={s.features}>
              {FEATURES.map((f, i) => (
                <article key={f.tag} className={s.feature}>
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

          {/* Chain */}
          <section className={s.section}>
            <div className={s.padHead}>
              <Eyebrow index="03">One chain, one app</Eyebrow>
              <h2 className={s.h2}>
                From the first hour logged <span>to the profit it made.</span>
              </h2>
              <p className={s.lead}>Every step is connected, so the numbers at the end agree with the work at the start. Nexora replaces:</p>
              <div className={s.replaces}>
                {REPLACES.map((r) => (
                  <span key={r}>{r}</span>
                ))}
              </div>
            </div>
            <div className={s.chain}>
              {CHAIN.map((c) => (
                <div key={c.step} className={s.chainCell}>
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
                <Eyebrow index="04">Built for Morocco</Eyebrow>
                <h2 className={s.h2}>
                  Compliance, <span>by default.</span>
                </h2>
                <p className={s.lead}>
                  Invoices can&apos;t be issued without the right identifiers, and every figure lands in the right
                  account. Your accountant gets exports, not a shoebox.
                </p>
                <ul className={s.checks}>
                  {COMPLIANCE.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </div>
              <div className={s.splitCode}>
                <CodeTabs />
              </div>
            </div>
          </section>

          {/* Stats */}
          <section className={s.section}>
            <div className={s.stats}>
              {STATS.map((st) => (
                <div key={st.label} className={s.stat}>
                  <strong>{st.value}</strong>
                  <span>{st.label}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Modules */}
          <section className={s.section} id="modules">
            <div className={s.padHead}>
              <Eyebrow index="05">Modules</Eyebrow>
              <h2 className={s.h2}>
                Forty modules. <span>One login, one source of truth.</span>
              </h2>
            </div>
            <div className={s.modules}>
              {MODULES.map((m, i) => (
                <div key={m} className={s.module}>
                  <small>{String(i + 1).padStart(2, "0")}</small>
                  {m}
                </div>
              ))}
            </div>
            <div className={s.gallery}>
              {GALLERY.map((g) => (
                <figure key={g.src} className={s.galleryItem}>
                  <div className={s.galleryShot}>
                    <Image
                      src={g.src}
                      alt={`Nexora ${g.caption} screen`}
                      width={2400}
                      height={1500}
                      sizes="(max-width: 768px) 100vw, 400px"
                      className={s.shot}
                    />
                  </div>
                  <figcaption>{g.caption}</figcaption>
                </figure>
              ))}
            </div>
          </section>

          {/* Roles */}
          <section className={s.section}>
            <div className={s.padHead}>
              <Eyebrow index="06">Roles &amp; permissions</Eyebrow>
              <h2 className={s.h2}>
                Everyone sees their part. <span>Costs stay with the people allowed to see them.</span>
              </h2>
            </div>
            <div className={s.roles}>
              {ROLES.map((r) => (
                <div key={r.role} className={s.roleCard}>
                  <h3>{r.role}</h3>
                  <p>{r.body}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Testimonials */}
          <section className={s.section}>
            <div className={s.padHead}>
              <Eyebrow index="07">Customers</Eyebrow>
              <h2 className={s.h2}>
                Fewer tools. <span>Clearer margins.</span>
              </h2>
            </div>
            <div className={s.quotes}>
              {TESTIMONIALS.map((t) => (
                <figure key={t.name} className={s.quote}>
                  <blockquote>“{t.quote}”</blockquote>
                  <figcaption>
                    <span className={s.avatar}>{initials(t.name)}</span>
                    <span>
                      {t.name}
                      <small>{t.role}</small>
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>

          {/* Pricing */}
          <section className={s.section} id="pricing">
            <div className={s.padHead}>
              <Eyebrow index="08">Pricing</Eyebrow>
              <h2 className={s.h2}>
                Simple plans. <span>Start free for 14 days.</span>
              </h2>
            </div>
            <div className={s.plans}>
              {NEXORA_PLANS.filter((p) => !p.retired).map((p) => (
                <div key={p.id} className={`${s.plan} ${p.featured ? s.planFeatured : ""}`}>
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
                <Eyebrow index="09">FAQ</Eyebrow>
                <h2 className={s.h2}>
                  Questions, <span>answered.</span>
                </h2>
                <p className={s.lead}>
                  Something else? Write to <a href="mailto:hello@nexora.ma">hello@nexora.ma</a>.
                </p>
              </div>
              <div className={s.faqList}>
                {FAQ.map((f) => (
                  <details key={f.q}>
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
              <div className={s.ctaArt} aria-hidden>
                <Image src="/landing/cta-dither.webp" alt="" width={1920} height={640} unoptimized />
              </div>
              <div className={s.ctaCard}>
                <Eyebrow index="10">Get started</Eyebrow>
                <h2 className={s.h2}>
                  Give your company <span>one place to run.</span>
                </h2>
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
                <p className={s.footerTag}>The ERP for service companies. People → clients → projects → hours → invoices → cash → profit.</p>
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
              <span>nexora</span>
            </div>
            <div className={s.legal}>
              <span>© {new Date().getFullYear()} Nexora. All rights reserved.</span>
              <span className={s.status}>All systems normal</span>
            </div>
          </footer>
        </div>
      </main>
    </div>
  )
}
