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
    example: 'Calcula el equivalente en USDm y te pide confirmación antes de firmar.',
  },
  {
    n: '03',
    title: 'La tx queda en Celo',
    example: 'Hash inmutable. Visible en Blockscout. Gas pagado en USDm (CIP-64).',
  },
]

export default function Home() {
  return (
    <div className="min-h-screen bg-ink text-text">

      {/* ── Ticker ── */}
      <div className="bg-yellow overflow-hidden py-1.5">
        <p className="text-center font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-ink">
          CELO SEPOLIA · USDm · PAGOS ON-CHAIN · ERC-8004 · CIP-64 FEE ABSTRACTION
        </p>
      </div>

      {/* ── Nav ── */}
      <header className="sticky top-0 z-50 border-b border-line bg-ink/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <rect width="32" height="32" rx="6" fill="#FCFF52"/>
              <path d="M6 22 L6 14 L9 11 L23 11 L26 14 L26 22 Z" fill="#1C1C1C"/>
              <rect x="13" y="16" width="6" height="6" fill="#FCFF52"/>
              <rect x="8" y="14" width="4" height="4" fill="#FCFF52"/>
              <rect x="20" y="14" width="4" height="4" fill="#FCFF52"/>
              <circle cx="25" cy="9" r="3" fill="#35D07F"/>
            </svg>
            <span className="text-sm font-bold tracking-tight text-text">BODEGAGENT</span>
          </div>
          <nav className="flex items-center gap-6 text-xs font-medium uppercase tracking-widest text-muted">
            <Link href="/chat" className="transition-colors hover:text-text">Agente</Link>
            <Link href="/dashboard" className="transition-colors hover:text-text">Dashboard</Link>
          </nav>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="dot-grid relative overflow-hidden border-b border-line">
        <div className="mx-auto max-w-6xl px-6 py-24 md:py-36">
          <p className="animate-fade-up mb-6 font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
            Para bodegueros · Hackathon Onchain Agents · Celo
          </p>
          <h1 className="animate-fade-up-2 max-w-3xl font-bold leading-[0.95] tracking-tight text-text" style={{ fontSize: 'clamp(3rem,9vw,6rem)' }}>
            Cobra,<br />
            registra,<br />
            <span className="text-yellow">recuerda.</span>
          </h1>
          <p className="animate-fade-up-3 mt-8 max-w-md text-base leading-relaxed text-sub">
            El agente de pagos que habla como tú, registra el fiado
            y firma cada cobro en la blockchain de Celo.
          </p>
          <div className="animate-fade-up-4 mt-10 flex flex-wrap gap-3">
            <Link
              href="/chat"
              className="bg-yellow px-7 py-3 text-sm font-bold text-ink transition-opacity hover:opacity-85"
            >
              Abrir el agente →
            </Link>
            <Link
              href="/dashboard"
              className="border border-line px-7 py-3 text-sm font-medium text-sub transition-colors hover:border-sub hover:text-text"
            >
              Ver dashboard
            </Link>
          </div>
        </div>

        {/* Decorative chat preview */}
        <div
          aria-hidden
          className="pointer-events-none absolute right-8 top-1/2 hidden -translate-y-1/2 flex-col gap-3 opacity-30 lg:flex"
        >
          <div className="w-72 rounded-2xl rounded-br-sm bg-yellow px-4 py-3 text-sm font-medium text-ink">
            Cobra S/15 al Chino por dos kilos de arroz
          </div>
          <div className="w-80 self-start rounded-2xl rounded-bl-sm bg-raised px-4 py-3 text-sm text-sub">
            Voy a enviar 4.05 USDm a 0x4f3e... ¿Confirmas?
          </div>
          <div className="w-52 self-end rounded-2xl rounded-br-sm bg-yellow px-4 py-3 text-sm font-medium text-ink">
            Sí, confirmar ✓
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
                <p className="mb-6 font-mono text-4xl font-bold text-line">{f.n}</p>
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
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-yellow text-[11px] font-bold text-ink">
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

      {/* ── CTA final ── */}
      <section className="dot-grid border-b border-line">
        <div className="mx-auto max-w-6xl px-6 py-24 text-center">
          <h2 className="mb-4 font-bold text-text" style={{ fontSize: 'clamp(2rem,6vw,3.5rem)' }}>
            Listo para cobrar<br />
            <span className="text-yellow">on-chain.</span>
          </h2>
          <p className="mb-10 text-sub">
            Sin intermediarios. Sin comisiones extra. Con tu bodega siempre abierta.
          </p>
          <Link
            href="/chat"
            className="inline-block bg-yellow px-10 py-4 text-base font-bold text-ink transition-opacity hover:opacity-85"
          >
            Abrir BodegAgent →
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 md:flex-row">
          <span className="font-mono text-xs text-muted">
            BODEGAGENT · Onchain Agents Hackathon · Celo 2025
          </span>
          <div className="flex gap-6 text-xs text-muted">
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
          </div>
        </div>
      </footer>

    </div>
  )
}
