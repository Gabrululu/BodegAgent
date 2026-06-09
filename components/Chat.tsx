'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from 'ai'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useWallet } from '@/lib/wallet-context'

const NETWORK = process.env.NEXT_PUBLIC_NETWORK ?? 'sepolia'
const AGENT_ADDRESS = process.env.NEXT_PUBLIC_AGENT_ADDRESS ?? ''
const EXPLORER_BASE =
  NETWORK === 'mainnet' ? 'https://celoscan.io' : 'https://celo-sepolia.blockscout.com'

const QUICK_REPLIES = [
  'Ver mi saldo',
  'Registrar fiado',
  'Ver deudas pendientes',
  'Crear factura',
]

const REMITTANCE_REPLIES = [
  'Recibir pago del extranjero',
  'Comparar tasas DEX',
  '¿Cuánto es S/200 en USDm?',
]

type ToolPart = {
  type: string
  state?: string
  output?: Record<string, unknown>
  input?: Record<string, unknown>
}
type TextPart = { type: 'text'; text: string }
type Part = TextPart | ToolPart
type Message = { id: string; role: string; parts?: Part[] }

/* ── Wallet option button ── */
function WalletOption({
  icon,
  title,
  description,
  badge,
  badgeColor,
  onClick,
  disabled,
}: {
  icon: React.ReactNode
  title: string
  description: string
  badge?: string
  badgeColor?: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-start gap-3 border border-line bg-raised px-4 py-3.5 text-left transition-colors hover:border-yellow/50 hover:bg-overlay disabled:cursor-not-allowed disabled:opacity-40"
    >
      <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-overlay text-base">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-text">{title}</span>
          {badge && (
            <span
              className={`rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest ${badgeColor}`}
            >
              {badge}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs leading-relaxed text-muted">{description}</p>
      </div>
      <span className="mt-1 text-muted">→</span>
    </button>
  )
}

/* ── Wallet selector panel ── */
function WalletSelector() {
  const { isMiniPay, hasInjected, connecting, connect } = useWallet()

  return (
    <div className="w-full max-w-sm">
      {/* Logo mark */}
      <div className="mb-6 flex items-center gap-2.5">
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect width="32" height="32" rx="6" fill="#FCFF52"/>
          <path d="M6 22 L6 14 L9 11 L23 11 L26 14 L26 22 Z" fill="#1C1C1C"/>
          <rect x="13" y="16" width="6" height="6" fill="#FCFF52"/>
          <rect x="8" y="14" width="4" height="4" fill="#FCFF52"/>
          <rect x="20" y="14" width="4" height="4" fill="#FCFF52"/>
          <circle cx="25" cy="9" r="3" fill="#35D07F"/>
        </svg>
        <span className="font-mono text-xs font-bold tracking-tight text-text">BODEGAGENT</span>
      </div>

      <h2 className="mb-1 text-xl font-bold text-text">Hola, bodeguero.</h2>
      <p className="mb-6 text-sm leading-relaxed text-muted">
        Conecta tu wallet para cobrar, registrar fiado y
        recibir remesas desde el exterior en USDm.
      </p>

      <div className="flex flex-col gap-2">
        {/* MiniPay — primary option */}
        <WalletOption
          icon="🟢"
          title="MiniPay"
          description={
            isMiniPay
              ? 'Detectado en este navegador — conecta con un tap.'
              : 'La wallet oficial de Celo para mercados emergentes. Gratis en Opera.'
          }
          badge={isMiniPay ? 'Detectado' : 'Recomendado'}
          badgeColor={isMiniPay ? 'bg-green/15 text-green' : 'bg-yellow/15 text-yellow'}
          onClick={() => {
            if (isMiniPay) {
              connect('minipay')
            } else {
              window.open('https://minipay.opera.com', '_blank', 'noopener')
            }
          }}
          disabled={connecting}
        />

        {/* Injected wallet — only if present */}
        {hasInjected && (
          <WalletOption
            icon="🦊"
            title="MetaMask / Wallet del navegador"
            description="Conecta la wallet que ya tienes instalada."
            onClick={() => connect('injected')}
            disabled={connecting}
          />
        )}

        {/* Embedded — always available as fallback */}
        <WalletOption
          icon="🔑"
          title="Wallet temporal"
          description="Se genera en este navegador, sin descargas. Solo para demo — no deposites fondos reales."
          badge="Demo"
          badgeColor="bg-orange/15 text-orange"
          onClick={() => connect('embedded')}
          disabled={connecting}
        />
      </div>

      <div className="mt-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-line" />
        <button
          className="font-mono text-[10px] uppercase tracking-widest text-muted transition-colors hover:text-sub"
          onClick={() => {
            const event = new CustomEvent('bodeg:skip-wallet')
            window.dispatchEvent(event)
          }}
        >
          Solo chatear, sin wallet
        </button>
        <div className="h-px flex-1 bg-line" />
      </div>
    </div>
  )
}

/* ── Wallet badge in header ── */
function WalletBadge() {
  const { address, walletType, isMiniPay, disconnect, clearEmbeddedKey, embeddedPkWarning } = useWallet()
  const [showMenu, setShowMenu] = useState(false)

  if (!address) return null

  const label =
    walletType === 'minipay'
      ? '🟢 MiniPay'
      : walletType === 'embedded'
      ? '🔑 Temporal'
      : '🦊 Wallet'

  const colorClass =
    walletType === 'minipay'
      ? 'bg-green/15 text-green border-green/20'
      : walletType === 'embedded'
      ? 'bg-orange/15 text-orange border-orange/20'
      : 'bg-yellow/15 text-yellow border-yellow/20'

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(v => !v)}
        className={`flex items-center gap-1.5 border px-2.5 py-1 font-mono text-[10px] font-medium transition-opacity hover:opacity-75 ${colorClass}`}
      >
        <span>{label}</span>
        <span className="text-[9px] opacity-60">
          {address.slice(0, 5)}…{address.slice(-3)}
        </span>
        <span className="opacity-50">▾</span>
      </button>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 top-full z-20 mt-1 w-52 border border-line bg-surface shadow-xl shadow-black/40">
            <div className="border-b border-line px-3 py-2.5">
              <p className="font-mono text-[9px] uppercase tracking-widest text-muted">
                {walletType === 'minipay' ? 'MiniPay' : walletType === 'embedded' ? 'Wallet temporal' : 'Wallet externa'}
              </p>
              <p className="mt-0.5 font-mono text-[11px] text-sub break-all">{address}</p>
            </div>
            {isMiniPay && (
              <a
                href="https://link.minipay.xyz/balance"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 text-xs text-sub transition-colors hover:bg-raised hover:text-text"
                onClick={() => setShowMenu(false)}
              >
                Ver saldo en MiniPay ↗
              </a>
            )}
            <a
              href={`${EXPLORER_BASE}/address/${address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 text-xs text-sub transition-colors hover:bg-raised hover:text-text"
              onClick={() => setShowMenu(false)}
            >
              Ver en Blockscout ↗
            </a>
            {embeddedPkWarning && (
              <div className="border-t border-line px-3 py-2">
                <p className="text-[10px] text-orange leading-snug">
                  Clave guardada en este navegador. No deposites fondos reales.
                </p>
                <button
                  onClick={() => { clearEmbeddedKey(); setShowMenu(false) }}
                  className="mt-1 text-[10px] text-orange/70 underline underline-offset-2 hover:text-orange"
                >
                  Eliminar clave permanentemente
                </button>
              </div>
            )}
            <button
              onClick={() => { disconnect(); setShowMenu(false) }}
              className="flex w-full items-center gap-2 px-3 py-2 text-xs text-muted transition-colors hover:bg-raised hover:text-text"
            >
              Desconectar
            </button>
          </div>
        </>
      )}
    </div>
  )
}

/* ── TxCard ── */
function TxCard({
  txHash, amountCUSD, amountPEN, to, memo,
}: {
  txHash: string; amountCUSD: string; amountPEN: string; to: string; memo: string
}) {
  return (
    <div className="mt-3 border border-green/30 bg-ink rounded p-3 font-mono text-xs">
      <div className="flex items-center gap-2 mb-3">
        <span className="h-1.5 w-1.5 rounded-full bg-green" />
        <span className="text-green font-semibold tracking-wide uppercase text-[10px]">
          Pago confirmado
        </span>
      </div>
      <div className="space-y-1 text-sub">
        <div className="flex justify-between">
          <span className="text-muted">monto</span>
          <span className="text-text">{amountCUSD} USDm</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">en soles</span>
          <span className="text-text">S/{amountPEN}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">para</span>
          <span className="text-text">{to.slice(0, 8)}…{to.slice(-6)}</span>
        </div>
        {memo && (
          <div className="flex justify-between">
            <span className="text-muted">concepto</span>
            <span className="text-text truncate max-w-[160px]">{memo}</span>
          </div>
        )}
      </div>
      <a
        href={`${EXPLORER_BASE}/tx/${txHash}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 flex items-center gap-1.5 text-[10px] text-muted hover:text-green transition-colors"
      >
        <span>{txHash.slice(0, 18)}…{txHash.slice(-6)}</span>
        <span>↗</span>
      </a>
    </div>
  )
}

/* ── InvoiceCard ── */
function InvoiceCard({ output }: { output: Record<string, unknown> }) {
  return (
    <div className="mt-3 border border-orange/30 bg-ink rounded p-3 font-mono text-xs">
      <div className="flex items-center gap-2 mb-3">
        <span className="h-1.5 w-1.5 rounded-full bg-orange" />
        <span className="text-orange font-semibold tracking-wide uppercase text-[10px]">
          Factura #{(output.id as string)?.slice(-6)}
        </span>
      </div>
      <div className="space-y-1 text-sub">
        <div className="flex justify-between">
          <span className="text-muted">cliente</span>
          <span className="text-text">{output.customerName as string}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">total PEN</span>
          <span className="text-text">S/{output.totalPEN as string}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">total USDm</span>
          <span className="text-text">{output.totalCUSD as string}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">vence</span>
          <span className="text-text">{output.dueDate as string}</span>
        </div>
      </div>
      <a
        href={output.deeplink as string}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex items-center gap-1 text-[10px] text-orange hover:opacity-75 transition-opacity"
      >
        Link de pago ↗
      </a>
    </div>
  )
}

/* ── FxRateCard ── */
function FxRateCard({ output }: { output: Record<string, unknown> }) {
  return (
    <div className="mt-3 border border-yellow/20 bg-ink rounded p-3 font-mono text-xs">
      <div className="flex items-center gap-2 mb-3">
        <span className="h-1.5 w-1.5 rounded-full bg-yellow" />
        <span className="text-yellow font-semibold tracking-wide uppercase text-[10px]">
          Tasa de cambio {output.live ? '(en vivo)' : '(fallback)'}
        </span>
      </div>
      <div className="space-y-1 text-sub">
        <div className="flex justify-between">
          <span className="text-muted">1 USDm</span>
          <span className="text-text">S/ {output.usdToPen as string}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">ejemplo</span>
          <span className="text-text">{output.exampleConversion as string}</span>
        </div>
      </div>
      {output.updatedAt ? (
        <p className="mt-2 text-[10px] text-muted">
          Fuente: {output.source as string} · {output.updatedAt as string}
        </p>
      ) : null}
    </div>
  )
}

/* ── RateComparisonCard ── */
function RateComparisonCard({ output }: { output: Record<string, unknown> }) {
  type RateEntry = { protocol: string; amountOut: string | null; rate: string | null; available: boolean; description?: string; note?: string | null }
  const defillama = output.defillama as RateEntry | undefined
  const uniswap = output.uniswap as RateEntry | undefined
  const best = output.best as string | undefined

  return (
    <div className="mt-3 border border-yellow/20 bg-ink rounded p-3 font-mono text-xs">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-yellow" />
          <span className="text-yellow font-semibold tracking-wide uppercase text-[10px]">
            Comparación de tasas · {output.amountIn as string}
          </span>
        </div>
        <span className="font-mono text-[9px] text-muted">{output.network as string}</span>
      </div>

      <div className="space-y-2">
        {[defillama, uniswap].map((entry, i) => {
          if (!entry) return null
          const isBest = best === entry.protocol
          return (
            <div
              key={i}
              className={`flex items-start justify-between rounded px-2.5 py-2 ${
                isBest ? 'border border-green/30 bg-green/5' : 'border border-line'
              }`}
            >
              <div>
                <p className={`text-[11px] font-semibold ${isBest ? 'text-green' : 'text-sub'}`}>
                  {entry.protocol}
                  {isBest && <span className="ml-1.5 text-[9px] text-green/70">← mejor</span>}
                </p>
                <p className="mt-0.5 text-[10px] text-muted">{entry.description}</p>
                {entry.note && (
                  <p className="mt-0.5 text-[10px] text-orange">{entry.note}</p>
                )}
              </div>
              <div className="text-right ml-3 flex-shrink-0">
                {entry.available && entry.amountOut ? (
                  <>
                    <p className={`text-sm font-bold ${isBest ? 'text-green' : 'text-text'}`}>
                      {entry.amountOut} USDm
                    </p>
                    <p className="text-[10px] text-muted">rate: {entry.rate}</p>
                  </>
                ) : (
                  <p className="text-[11px] text-muted italic">No disponible</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {output.tip ? (
        <p className="mt-3 text-[10px] text-muted border-t border-line pt-2">
          {output.tip as string}
        </p>
      ) : null}
    </div>
  )
}

/* ── Message bubble ── */
function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'
  const parts = message.parts ?? []

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      {!isUser && (
        <div className="mr-2 mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-yellow text-[10px] font-bold text-ink">
          B
        </div>
      )}
      <div
        className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? 'rounded-br-sm bg-yellow text-ink font-medium'
            : 'rounded-bl-sm bg-raised text-text'
        }`}
      >
        {parts.map((part, i) => {
          if (part.type === 'text') {
            return (
              <p key={i} className="whitespace-pre-wrap">
                {(part as TextPart).text}
              </p>
            )
          }

          const tp = part as ToolPart

          if (tp.type === 'tool-send_cusd' && tp.state === 'output-available') {
            const out = tp.output ?? {}
            if (out.success) {
              return (
                <TxCard
                  key={i}
                  txHash={out.txHash as string}
                  amountCUSD={out.amountCUSD as string}
                  amountPEN={out.amountPEN as string}
                  to={out.to as string}
                  memo={out.memo as string}
                />
              )
            }
          }

          if (tp.type === 'tool-create_invoice' && tp.state === 'output-available') {
            return <InvoiceCard key={i} output={tp.output ?? {}} />
          }

          if (tp.type === 'tool-get_fx_rate' && tp.state === 'output-available') {
            return <FxRateCard key={i} output={tp.output ?? {}} />
          }

          if (tp.type === 'tool-compare_rates' && tp.state === 'output-available') {
            return <RateComparisonCard key={i} output={tp.output ?? {}} />
          }

          if (
            (tp.type === 'tool-check_balance' ||
              tp.type === 'tool-check_pending_debts' ||
              tp.type === 'tool-remind_debtor' ||
              tp.type === 'tool-get_fx_rate' ||
              tp.type === 'tool-compare_rates') &&
            (tp.state === 'input-streaming' || tp.state === 'input-available')
          ) {
            return (
              <p key={i} className="text-xs text-muted italic">
                {tp.type === 'tool-compare_rates'
                  ? 'Consultando DEXs…'
                  : tp.type === 'tool-get_fx_rate'
                  ? 'Consultando tasa…'
                  : 'Consultando blockchain…'}
              </p>
            )
          }

          return null
        })}
      </div>
    </div>
  )
}

/* ── Low-balance MiniPay banner ── */
function MiniPayAddCashBanner() {
  const { isMiniPay } = useWallet()
  if (!isMiniPay) return null
  return (
    <a
      href="https://link.minipay.xyz/add_cash?tokens=USDm"
      target="_blank"
      rel="noopener noreferrer"
      className="mx-4 mb-3 flex items-center justify-between border border-green/25 bg-green/8 px-3 py-2 text-xs text-green transition-opacity hover:opacity-75"
    >
      <span>Recarga USDm en MiniPay</span>
      <span>↗</span>
    </a>
  )
}

/* ── Main Chat ── */
export default function Chat() {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [input, setInput] = useState('')
  const [walletSkipped, setWalletSkipped] = useState(false)

  const { address, walletType, isMiniPay } = useWallet()
  const walletReady = !!address || walletSkipped

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  })

  const isLoading = status === 'submitted' || status === 'streaming'

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Listen for "skip wallet" event from WalletSelector
  useEffect(() => {
    const handler = () => setWalletSkipped(true)
    window.addEventListener('bodeg:skip-wallet', handler)
    return () => window.removeEventListener('bodeg:skip-wallet', handler)
  }, [])

  function handleSend(text: string) {
    if (!text.trim() || isLoading) return
    // Prepend wallet address context on first message
    const isFirst = messages.length === 0
    const prefix =
      isFirst && address
        ? `[Mi dirección Celo: ${address}${walletType === 'minipay' ? ' (MiniPay)' : walletType === 'embedded' ? ' (wallet temporal)' : ''}] `
        : ''
    sendMessage({ text: prefix + text.trim() })
    setInput('')
    inputRef.current?.focus()
  }

  // Quick action: share own address with agent
  function handleShareAddress() {
    if (!address) return
    handleSend(`Mi dirección Celo es ${address}`)
  }

  // MiniPay live rate via custom method
  async function fetchMiniPayRate() {
    if (!isMiniPay) return
    try {
      const ethereum = (window as Window & { ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum
      const result = await ethereum?.request({
        method: 'miniPay_getExchangeRate',
        params: [{ currencyCode: 'USD' }],
      })
      if (result) {
        handleSend(`¿Cuánto es S/100 en USDm? (tasa MiniPay: ${JSON.stringify(result)})`)
      }
    } catch {
      handleSend('¿Cuál es la tasa de cambio de soles a USDm?')
    }
  }

  return (
    <div className="flex h-screen flex-col bg-ink">

      {/* ── Header ── */}
      <header className="flex-shrink-0 border-b border-line bg-surface">
        <div className="flex items-center justify-between px-4 py-3.5">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 group" aria-label="Volver al inicio">
              <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <rect width="32" height="32" rx="6" fill="#FCFF52"/>
                <path d="M6 22 L6 14 L9 11 L23 11 L26 14 L26 22 Z" fill="#1C1C1C"/>
                <rect x="13" y="16" width="6" height="6" fill="#FCFF52"/>
                <rect x="8" y="14" width="4" height="4" fill="#FCFF52"/>
                <rect x="20" y="14" width="4" height="4" fill="#FCFF52"/>
                <circle cx="25" cy="9" r="3" fill="#35D07F"/>
              </svg>
              <span className="text-xs font-bold tracking-tight text-text group-hover:text-yellow transition-colors">
                BODEGAGENT
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {/* Agent address (subtle) */}
            {AGENT_ADDRESS && !address && (
              <span className="hidden font-mono text-[10px] text-muted sm:inline">
                {AGENT_ADDRESS.slice(0, 6)}…{AGENT_ADDRESS.slice(-4)}
              </span>
            )}

            {/* Wallet badge */}
            <WalletBadge />

            <span
              className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] font-medium ${
                NETWORK === 'mainnet'
                  ? 'bg-green/15 text-green'
                  : 'bg-yellow/15 text-yellow'
              }`}
            >
              {NETWORK === 'mainnet' ? 'Mainnet' : 'Celo Sepolia'}
            </span>
            <Link
              href="/dashboard"
              className="border border-line px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-muted transition-colors hover:border-sub hover:text-text"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* ── Wallet selection overlay ── */}
      {!walletReady && (
        <div className="flex flex-1 items-center justify-center bg-ink px-6">
          <WalletSelector />
        </div>
      )}

      {/* ── Chat (only shown when wallet ready) ── */}
      {walletReady && (
        <>
          {/* MiniPay add-cash banner */}
          <MiniPayAddCashBanner />

          {/* Messages */}
          <main className="flex-1 overflow-y-auto px-4 py-6">
            {messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center gap-7 text-center">

                {/* Identity */}
                <div>
                  <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                    BodegAgent · Celo Sepolia
                  </p>
                  <h2 className="text-2xl font-bold text-text">Listo para tu bodega.</h2>
                  <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted">
                    Cobra en USDm, registra fiado y recibe remesas desde el exterior.
                    Dime qué necesitas.
                  </p>
                  {address && (
                    <p className="mt-2 inline-block border border-line bg-raised px-3 py-1 font-mono text-[10px] text-muted">
                      {address.slice(0, 10)}…{address.slice(-8)}
                    </p>
                  )}
                </div>

                {/* Quick replies — two rows */}
                <div className="w-full max-w-sm space-y-2">
                  {/* Row 1: core actions */}
                  <div className="flex flex-wrap justify-center gap-2">
                    {QUICK_REPLIES.map(reply => (
                      <button
                        key={reply}
                        onClick={() => handleSend(reply)}
                        className="rounded-full border border-line px-3.5 py-1.5 text-xs text-sub transition-colors hover:border-yellow hover:text-yellow"
                      >
                        {reply}
                      </button>
                    ))}
                    {address && (
                      <button
                        onClick={handleShareAddress}
                        className="rounded-full border border-line px-3.5 py-1.5 text-xs text-sub transition-colors hover:border-yellow hover:text-yellow"
                      >
                        Mi dirección
                      </button>
                    )}
                  </div>

                  {/* Row 2: remittance & FX actions */}
                  <div className="flex flex-wrap justify-center gap-2">
                    {REMITTANCE_REPLIES.map(reply => (
                      <button
                        key={reply}
                        onClick={() => handleSend(reply)}
                        className="rounded-full border border-yellow/20 bg-yellow/5 px-3.5 py-1.5 text-xs text-yellow/80 transition-colors hover:border-yellow/50 hover:text-yellow"
                      >
                        {reply}
                      </button>
                    ))}
                    {isMiniPay && (
                      <button
                        onClick={fetchMiniPayRate}
                        className="rounded-full border border-green/30 bg-green/8 px-3.5 py-1.5 text-xs text-green transition-colors hover:border-green/60"
                      >
                        Tasa MiniPay
                      </button>
                    )}
                  </div>
                </div>

              </div>
            )}

            {messages.map(msg => (
              <MessageBubble key={msg.id} message={msg as Message} />
            ))}

            {isLoading && (
              <div className="mb-4 flex items-start gap-2">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-yellow text-[10px] font-bold text-ink">
                  B
                </div>
                <div className="rounded-2xl rounded-bl-sm bg-raised px-4 py-3">
                  <div className="flex gap-1.5 items-center h-4">
                    <span className="h-1.5 w-1.5 rounded-full bg-muted animate-pulse [animation-delay:0ms]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-muted animate-pulse [animation-delay:200ms]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-muted animate-pulse [animation-delay:400ms]" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </main>

          {/* Input */}
          <footer className="flex-shrink-0 border-t border-line bg-surface px-4 pb-4 pt-3">
            {messages.length > 0 && (
              <div className="mb-2.5 flex flex-wrap gap-1.5">
                {QUICK_REPLIES.map(reply => (
                  <button
                    key={reply}
                    onClick={() => handleSend(reply)}
                    className="rounded-full border border-line px-2.5 py-1 text-[11px] text-muted transition-colors hover:border-yellow hover:text-yellow"
                  >
                    {reply}
                  </button>
                ))}
              </div>
            )}
            <form
              onSubmit={e => {
                e.preventDefault()
                handleSend(input)
              }}
              className="flex gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ej: cobra S/15 al Chino por 2 kilos de arroz"
                className="flex-1 rounded-full border border-line bg-raised px-4 py-2.5 text-sm text-text placeholder:text-muted focus:border-yellow/50 focus:outline-none transition-colors"
                disabled={isLoading}
                autoComplete="off"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="rounded-full bg-yellow px-5 py-2.5 text-sm font-bold text-ink transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-30"
              >
                →
              </button>
            </form>
          </footer>
        </>
      )}
    </div>
  )
}
