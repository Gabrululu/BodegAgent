'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from 'ai'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

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

type ToolPart = {
  type: string
  state?: string
  output?: Record<string, unknown>
  input?: Record<string, unknown>
}

type TextPart = { type: 'text'; text: string }
type Part = TextPart | ToolPart

type Message = {
  id: string
  role: string
  parts?: Part[]
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

          if (
            (tp.type === 'tool-check_balance' ||
              tp.type === 'tool-check_pending_debts' ||
              tp.type === 'tool-remind_debtor') &&
            (tp.state === 'input-streaming' || tp.state === 'input-available')
          ) {
            return (
              <p key={i} className="text-xs text-muted italic">
                Consultando blockchain…
              </p>
            )
          }

          return null
        })}
      </div>
    </div>
  )
}

/* ── Main Chat ── */
export default function Chat() {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [input, setInput] = useState('')

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  })

  const isLoading = status === 'submitted' || status === 'streaming'

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleSend(text: string) {
    if (!text.trim() || isLoading) return
    sendMessage({ text: text.trim() })
    setInput('')
    inputRef.current?.focus()
  }

  return (
    <div className="flex h-screen flex-col bg-ink">

      {/* ── Header ── */}
      <header className="flex-shrink-0 border-b border-line bg-surface">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 group" aria-label="Volver al inicio">
              <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
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
            {AGENT_ADDRESS && (
              <span className="hidden font-mono text-[10px] text-muted sm:inline">
                {AGENT_ADDRESS.slice(0, 6)}…{AGENT_ADDRESS.slice(-4)}
              </span>
            )}
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
              className="rounded border border-line px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-muted transition-colors hover:border-sub hover:text-text"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* ── Messages ── */}
      <main className="flex-1 overflow-y-auto px-4 py-6">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-8 text-center">
            <div>
              <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
                BodegAgent · Celo Sepolia
              </p>
              <h2 className="text-2xl font-bold text-text">Hola, bodeguero.</h2>
              <p className="mt-2 max-w-xs text-sm text-muted">
                Puedo cobrar en USDm, registrar fiado y generar facturas. Cuéntame qué necesitas.
              </p>
            </div>
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
            </div>
          </div>
        )}

        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg as Message} />
        ))}

        {/* Loading indicator */}
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

      {/* ── Footer / Input ── */}
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
    </div>
  )
}
