import Link from 'next/link'

const FEATURES = [
  {
    n: '01',
    title: 'Cobros en USDm',
    body: 'Envía y recibe pagos en dólares digitales. El agente convierte soles a USDm y firma la transacción por ti, sin que necesites entender crypto.',
  },
  {
    n: '02',
    title: 'Fiado digital',
    body: 'Registra quién debe qué. Genera recordatorios en español y verifica pagos on-chain. Todo queda grabado en Celo para siempre.',
  },
  {
    n: '03',
    title: 'Facturas con deeplink',
    body: 'Genera facturas con totales en PEN y USDm, con link de pago incluido. Compártelo por WhatsApp o Telegram.',
  },
]

const STEPS = [
  {
    n: '01',
    title: 'Escríbele en español',
    example: '"Cobra S/15 al Chino por dos kilos de arroz"',
  },
  {
    n: '02',
    title: 'El agente convierte y confirma',
    example: '"Enviaré 4.05 USDm a 0x4f3e… ¿Confirmas?"',
  },
  {
    n: '03',
    title: 'Queda grabado en Celo',
    example: 'Hash inmutable · Gas en USDm (CIP-64) · Visible en Blockscout',
  },
]

const TICKER_ITEMS = [
  'CELO SEPOLIA',
  'USDm STABLECOIN',
  'PAGOS ON-CHAIN',
  'ERC-8004 AGENT IDENTITY',
  'CIP-64 FEE ABSTRACTION',
  'VERCEL AI SDK v6',
  'VIEM v2',
]

/* ── Chat preview component (decorative) ── */
function ChatPreview() {
  return (
    <div className="w-72 rounded-xl border border-line bg-surface shadow-2xl shadow-black/60 select-none">
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-yellow text-[10px] font-bold text-ink">
          B
        </div>
        <div>
          <p className="text-xs font-semibold text-text leading-none">BodegAgent</p>
          <p className="mt-0.5 font-mono text-[9px] text-muted">Celo Sepolia</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green" />
          <span className="font-mono text-[9px] text-green">online</span>
        </div>
      </div>

      {/* Messages */}
      <div className="space-y-2.5 px-4 py-4">
        {/* User */}
        <div className="flex justify-end">
          <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-yellow px-3 py-2 text-xs font-medium text-ink">
            Cobra S/15 al Chino
          </div>
        </div>
        {/* Agent */}
        <div className="flex justify-start">
          <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-raised px-3 py-2 text-xs text-sub">
            Enviaré 4.05 USDm a 0x4f3e… ¿Confirmas?
          </div>
        </div>
        {/* User */}
        <div className="flex justify-end">
          <div className="rounded-2xl rounded-br-sm bg-yellow px-3 py-2 text-xs font-medium text-ink">
            Sí ✓
          </div>
        </div>

        {/* TxCard preview */}
        <div className="rounded border border-green/25 bg-ink px-3 py-2.5 font-mono">
          <div className="mb-2 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-green" />
            <span className="text-[9px] uppercase tracking-wider text-green">Pago confirmado</span>
          </div>
          <div className="space-y-1 text-[10px]">
            <div className="flex justify-between">
              <span className="text-muted">monto</span>
              <span className="text-text">4.05 USDm</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">en soles</span>
              <span className="text-text">S/15.00</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">hash</span>
              <span className="text-sub">0x7f8c…b3a1 ↗</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const tickerStr = TICKER_ITEMS.join(' · ') + ' · '

  return (
    <div className="min-h-screen bg-ink text-text">

      {/* ── Ticker ── */}
      <div className="overflow-hidden border-b border-line bg-yellow py-1.5">
        <div className="flex animate-marquee whitespace-nowrap">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ink pr-8">
            {tickerStr}
          </span>
          <span aria-hidden className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ink pr-8">
            {tickerStr}
          </span>
        </div>
      </div>

      {/* ── Nav ── */}
      <header className="sticky top-0 z-50 border-b border-line bg-ink/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <svg width="26" height="26" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <rect width="32" height="32" rx="6" fill="#FCFF52"/>
              <path d="M6 22 L6 14 L9 11 L23 11 L26 14 L26 22 Z" fill="#1C1C1C"/>
              <rect x="13" y="16" width="6" height="6" fill="#FCFF52"/>
              <rect x="8" y="14" width="4" height="4" fill="#FCFF52"/>
              <rect x="20" y="14" width="4" height="4" fill="#FCFF52"/>
              <circle cx="25" cy="9" r="3" fill="#35D07F"/>
            </svg>
            <span className="text-sm font-bold tracking-tight text-text">BODEGAGENT</span>
          </Link>

          {/* Right: nav + CTA */}
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="hidden text-xs font-medium uppercase tracking-widest text-muted transition-colors hover:text-text sm:block"
            >
              Dashboard
            </Link>
            <Link
              href="/chat"
              className="bg-yellow px-4 py-1.5 text-xs font-bold text-ink transition-opacity hover:opacity-80"
            >
              Abrir →
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="dot-grid relative border-b border-line">
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-32">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1fr_auto]">

            {/* Left column */}
            <div>
              {/* Badges */}
              <div className="animate-fade-up mb-8 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-yellow/30 bg-yellow/8 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-yellow">
                  Onchain Agents Hackathon
                </span>
                <span className="rounded-full border border-green/30 bg-green/8 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-green">
                  Celo Sepolia
                </span>
              </div>

              {/* Headline */}
              <h1 className="animate-fade-up-2 text-display font-bold leading-[0.92] tracking-tight text-text">
                Cobra,<br />
                registra,<br />
                <span className="text-yellow">recuerda.</span>
              </h1>

              {/* Subtitle */}
              <p className="animate-fade-up-3 mt-8 max-w-sm text-base leading-relaxed text-sub">
                El agente de pagos que habla como tú, registra el fiado
                y firma cada cobro en la blockchain de Celo.
              </p>

              {/* CTAs */}
              <div className="animate-fade-up-4 mt-10 flex flex-wrap gap-3">
                <Link
                  href="/chat"
                  className="bg-yellow px-8 py-3.5 text-sm font-bold text-ink transition-opacity hover:opacity-85"
                >
                  Abrir el agente →
                </Link>
                <Link
                  href="/dashboard"
                  className="border border-line px-8 py-3.5 text-sm font-medium text-sub transition-colors hover:border-sub hover:text-text"
                >
                  Ver dashboard
                </Link>
              </div>
            </div>

            {/* Right column: chat preview */}
            <div className="hidden lg:block">
              <ChatPreview />
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-6xl px-6">
          <div className="border-b border-line py-8">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
              Características
            </p>
          </div>
          <div className="grid grid-cols-1 divide-y divide-line md:grid-cols-3 md:divide-x md:divide-y-0">
            {FEATURES.map(f => (
              <div key={f.n} className="py-10 first:pl-0 last:pr-0 md:px-8">
                <p className="mb-6 font-mono text-4xl font-bold text-overlay">{f.n}</p>
                <h3 className="mb-3 text-base font-semibold text-text">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="border-b border-line bg-surface">
        <div className="mx-auto max-w-6xl px-6">
          <div className="border-b border-line py-8">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
              Cómo funciona
            </p>
          </div>
          <div className="grid grid-cols-1 divide-y divide-line md:grid-cols-3 md:divide-x md:divide-y-0">
            {STEPS.map(s => (
              <div key={s.n} className="py-10 first:pl-0 last:pr-0 md:px-8">
                <div className="mb-5 flex items-center gap-3">
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-yellow font-mono text-[11px] font-bold text-ink">
                    {s.n}
                  </span>
                  <h3 className="text-sm font-semibold text-text">{s.title}</h3>
                </div>
                <p className="font-mono text-xs italic leading-relaxed text-muted">{s.example}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Network strip ── */}
      <section className="border-b border-line bg-raised">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
            Infraestructura
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: 'Red activa', value: 'Celo Sepolia' },
              { label: 'Chain ID', value: '11142220' },
              { label: 'USDm', value: '0xEF4d55D6…45bC80' },
              { label: 'ERC-8004', value: '0x8004A818…4BD9e' },
            ].map(item => (
              <div key={item.label} className="border border-line px-4 py-3">
                <p className="mb-1 text-[10px] uppercase tracking-widest text-muted">{item.label}</p>
                <p className="font-mono text-sm text-sub">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="dot-grid border-b border-line">
        <div className="mx-auto max-w-6xl px-6 py-28 text-center">
          <h2 className="text-display-sm mx-auto mb-5 max-w-xl font-bold leading-tight text-text">
            Tu bodega,<br />
            <span className="text-yellow">en la blockchain.</span>
          </h2>
          <p className="mx-auto mb-10 max-w-xs text-sm leading-relaxed text-muted">
            Cero intermediarios. Gas en USDm. Todo en español, todo on-chain.
          </p>
          <Link
            href="/chat"
            className="inline-block bg-yellow px-10 py-4 text-sm font-bold text-ink transition-opacity hover:opacity-85"
          >
            Abrir BodegAgent →
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-line bg-surface">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            {/* Logo + tagline */}
            <div className="flex items-center gap-3">
              <svg width="22" height="22" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <rect width="32" height="32" rx="6" fill="#FCFF52"/>
                <path d="M6 22 L6 14 L9 11 L23 11 L26 14 L26 22 Z" fill="#1C1C1C"/>
                <rect x="13" y="16" width="6" height="6" fill="#FCFF52"/>
                <rect x="8" y="14" width="4" height="4" fill="#FCFF52"/>
                <rect x="20" y="14" width="4" height="4" fill="#FCFF52"/>
                <circle cx="25" cy="9" r="3" fill="#35D07F"/>
              </svg>
              <div>
                <p className="font-mono text-xs font-bold text-text">BODEGAGENT</p>
                <p className="font-mono text-[10px] text-muted">Onchain Agents Hackathon · Celo 2026</p>
              </div>
            </div>

            {/* Links */}
            <nav className="flex gap-6 font-mono text-xs text-muted">
              <Link href="/chat" className="transition-colors hover:text-text">Agente</Link>
              <Link href="/dashboard" className="transition-colors hover:text-text">Dashboard</Link>
              <a
                href="https://celo-sepolia.blockscout.com"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-text"
              >
                Blockscout ↗
              </a>
              <a
                href="https://faucet.celo.org/celo-sepolia"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-text"
              >
                Faucet ↗
              </a>
            </nav>
          </div>
        </div>
      </footer>

    </div>
  )
}
