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
import s from "./landing.module.css"

const SIGN_UP = "/auth?section=register"
const SIGN_IN = "/auth"

const formatMad = (n: number) => n.toLocaleString("en-US").replace(/,/g, " ")
const initials = (name: string) =>
  name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")

function SectionLabel({ index, children }: { index: string; children: React.ReactNode }) {
  return (
    <p className={s.label}>
      <b>[{index}]</b> {children}
    </p>
  )
}

export function LandingPage() {
  return (
    <div className={s.page}>
      <div className={s.announce}>
        <span className={s.pill}>NEW</span>
        <span className={s.hideSm}>DGI e-invoices, VAT return and CGNC journal are live.</span>
        <a href="#compliance">See what&apos;s new →</a>
      </div>

      <header className={s.nav}>
        <div className={s.navInner}>
          <Link href="/" className={s.brand} aria-label="Nexora home">
            <Image src="/app-logo.png" alt="" width={26} height={26} priority />
            Nexora
          </Link>
          <nav className={s.navLinks} aria-label="Main">
            {NAV_LINKS.map((l) => (
              <a key={l.label} href={l.href}>
                {l.label}
              </a>
            ))}
          </nav>
          <div className={s.navActions}>
            <Link href={SIGN_IN} className={`${s.btnGhost} ${s.btnSm} ${s.hideSm}`}>
              Sign in
            </Link>
            <Link href={SIGN_UP} className={`${s.btn} ${s.btnSm}`}>
              Start free
            </Link>
          </div>
        </div>
      </header>

      <main id="main">
        <div className={s.frame}>
          {/* Hero */}
          <section className={s.hero} id="product">
            <div className={s.heroGrid} aria-hidden />
            <div className={s.heroInner}>
              <SectionLabel index="00">The ERP for service companies</SectionLabel>
              <h1 className={s.h1}>
                Humans use spreadsheets. <em>Service companies use Nexora.</em>
              </h1>
              <p className={s.heroSub}>
                One place for the whole chain of your business: people, clients, projects, hours, invoices, cash
                and profit. Built for agencies, consultancies, studios, IT services and engineering offices.
              </p>
              <div className={s.heroCtas}>
                <Link href={SIGN_UP} className={s.btn}>
                  Start 14-day free trial
                </Link>
                <a href="/documentation/doc.html" className={s.btnGhost}>
                  Read the docs
                </a>
              </div>
              <p className={s.heroNote}>No card required · 9 languages · Prices in MAD</p>
            </div>

            <div className={s.window} aria-hidden>
              <div className={s.windowBar}>
                <span className={s.dot} />
                <span className={s.dot} />
                <span className={s.dot} />
                <span className={s.windowUrl}>app.nexora.ma/dashboard/overview</span>
              </div>
              <div className={s.windowBody}>
                <div className={s.sidebar}>
                  {["Overview", "My work", "Projects", "Timesheets", "Invoices", "Receivables", "Reports"].map(
                    (item, i) => (
                      <span key={item} className={i === 0 ? s.active : undefined}>
                        {item}
                      </span>
                    ),
                  )}
                </div>
                <div className={s.dash}>
                  <div className={s.kpis}>
                    {[
                      ["Revenue earned", "412 300", "+12.4%"],
                      ["Gross margin", "38.6%", "+2.1 pts"],
                      ["Utilization", "81%", "+4 pts"],
                      ["Cash collected", "356 900", "+9.8%"],
                    ].map(([label, value, delta]) => (
                      <div key={label} className={s.kpi}>
                        <small>{label}</small>
                        <strong>{value}</strong>
                        <i>{delta}</i>
                      </div>
                    ))}
                  </div>
                  <div className={s.chart}>
                    {[34, 48, 41, 56, 52, 63, 58, 70, 66, 78, 84, 92].map((h, i) => (
                      <span key={i} className={s.bar} style={{ height: `${h}%` }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Logos */}
          <section className={s.section}>
            <p className={`${s.label} ${s.logosLabel}`} style={{ display: "block" }}>
              Trusted by service companies across Morocco and beyond
            </p>
            <div className={s.logos}>
              <div className={s.marquee}>
                {[...LOGOS, ...LOGOS].map((name, i) => (
                  <span key={i} aria-hidden={i >= LOGOS.length}>
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* Chain */}
          <section className={s.section}>
            <div className={s.pad}>
              <SectionLabel index="01">One chain, one app</SectionLabel>
              <h2 className={s.h2}>
                From the first hour logged <span>to the profit it made.</span>
              </h2>
              <p className={s.lead}>Nexora follows every step, so the numbers at the end agree with the work at the start. It replaces:</p>
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

          {/* Features */}
          <section className={s.section}>
            <div className={s.pad}>
              <SectionLabel index="02">Features</SectionLabel>
              <h2 className={s.h2}>
                Everything a service company runs on. <span>Nothing it doesn&apos;t.</span>
              </h2>
            </div>
            <div className={s.features}>
              {FEATURES.map((f) => (
                <article key={f.tag} className={s.feature}>
                  <span className={s.featureTag}>{f.tag}</span>
                  <h3>{f.title}</h3>
                  <p>{f.body}</p>
                </article>
              ))}
            </div>
          </section>

          {/* Compliance */}
          <section className={s.section} id="compliance">
            <div className={s.split}>
              <div className={s.splitCopy}>
                <SectionLabel index="03">Built for Morocco</SectionLabel>
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

          {/* Modules */}
          <section className={s.section} id="modules">
            <div className={s.pad}>
              <SectionLabel index="04">Modules</SectionLabel>
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
          </section>

          {/* Roles */}
          <section className={s.section}>
            <div className={s.pad}>
              <SectionLabel index="05">Roles & permissions</SectionLabel>
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

          {/* Testimonials */}
          <section className={s.section}>
            <div className={s.pad}>
              <SectionLabel index="06">Customers</SectionLabel>
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
            <div className={s.pad}>
              <SectionLabel index="07">Pricing</SectionLabel>
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
                <SectionLabel index="08">FAQ</SectionLabel>
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
              <div className={s.ctaDither} aria-hidden />
              <SectionLabel index="09">Get started</SectionLabel>
              <h2 className={s.h2}>
                Run your whole company <span>from one place.</span>
              </h2>
              <div className={s.heroCtas}>
                <Link href={SIGN_UP} className={s.btn}>
                  Start 14-day free trial
                </Link>
                <a href="mailto:sales@nexora.ma" className={s.btnGhost}>
                  Book a demo
                </a>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className={s.section}>
            <div className={s.footer}>
              <div>
                <Link href="/" className={s.brand}>
                  <Image src="/app-logo.png" alt="" width={24} height={24} />
                  Nexora
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
              NEXORA
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
