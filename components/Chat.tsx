'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from 'ai'
import { useEffect, useRef, useState } from 'react'

const NETWORK = process.env.NEXT_PUBLIC_NETWORK ?? 'alfajores'
const AGENT_ADDRESS = process.env.NEXT_PUBLIC_AGENT_ADDRESS ?? ''
const EXPLORER_BASE =
  NETWORK === 'mainnet' ? 'https://celoscan.io' : 'https://alfajores.celoscan.io'

const QUICK_REPLIES = ['Ver mi saldo', 'Registrar fiado', 'Ver deudas pendientes']

function TxCard({
  txHash,
  amountCUSD,
  amountPEN,
  to,
  memo,
}: {
  txHash: string
  amountCUSD: string
  amountPEN: string
  to: string
  memo: string
}) {
  return (
    <div className="rounded-xl border border-green-200 bg-green-50 p-4 my-2 text-sm">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-green-600 text-lg">✓</span>
        <span className="font-semibold text-green-700">Pago enviado exitosamente</span>
      </div>
      <div className="space-y-1 text-gray-700">
        <p>
          <span className="font-medium">Monto:</span> {amountCUSD} cUSD (S/{amountPEN})
        </p>
        <p>
          <span className="font-medium">Para:</span>{' '}
          <span className="font-mono text-xs">{to.slice(0, 8)}...{to.slice(-6)}</span>
        </p>
        {memo && (
          <p>
            <span className="font-medium">Concepto:</span> {memo}
          </p>
        )}
        <a
          href={`${EXPLORER_BASE}/tx/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-1 text-blue-600 hover:underline font-mono text-xs break-all"
        >
          {txHash.slice(0, 16)}...{txHash.slice(-8)} ↗
        </a>
      </div>
    </div>
  )
}

function InvoiceCard({ output }: { output: Record<string, unknown> }) {
  return (
    <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 my-2 text-sm">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">🧾</span>
        <span className="font-semibold text-yellow-800">Factura #{(output.id as string)?.slice(-6)}</span>
      </div>
      <div className="space-y-1 text-gray-700">
        <p><span className="font-medium">Cliente:</span> {output.customerName as string}</p>
        <p><span className="font-medium">Total:</span> S/{output.totalPEN as string} ({output.totalCUSD as string} cUSD)</p>
        <p><span className="font-medium">Vence:</span> {output.dueDate as string}</p>
        <a
          href={output.deeplink as string}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-1 text-blue-600 hover:underline text-xs"
        >
          Link de pago ↗
        </a>
      </div>
    </div>
  )
}

function MessageBubble({ message }: { message: Parameters<typeof useChat>[0] extends { messages?: infer M } ? (M extends (infer I)[] ? I : never) : never }) {
  const isUser = (message as { role: string }).role === 'user'
  const parts = (message as { parts?: { type: string; text?: string; state?: string; output?: Record<string, unknown>; input?: Record<string, unknown> }[] }).parts ?? []

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? 'bg-[#FCFF52] text-gray-900 rounded-br-sm'
            : 'bg-gray-100 text-gray-800 rounded-bl-sm'
        }`}
      >
        {parts.map((part, i) => {
          if (part.type === 'text') {
            return <p key={i} className="whitespace-pre-wrap">{part.text}</p>
          }

          if (part.type === 'tool-send_cusd' && part.state === 'output-available') {
            const out = part.output as Record<string, unknown>
            if (out?.success) {
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

          if (part.type === 'tool-create_invoice' && part.state === 'output-available') {
            return <InvoiceCard key={i} output={part.output as Record<string, unknown>} />
          }

          if (
            (part.type === 'tool-check_balance' ||
              part.type === 'tool-check_pending_debts' ||
              part.type === 'tool-remind_debtor') &&
            (part.state === 'input-streaming' || part.state === 'input-available')
          ) {
            return (
              <p key={i} className="text-xs text-gray-400 italic animate-pulse">
                Consultando blockchain...
              </p>
            )
          }

          return null
        })}
      </div>
    </div>
  )
}

export default function Chat() {
  const messagesEndRef = useRef<HTMLDivElement>(null)
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
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-[#FCFF52] shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🏪</span>
          <span className="font-bold text-gray-900 text-lg">BodegAgent</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-700">
          {AGENT_ADDRESS && (
            <span className="font-mono">
              {AGENT_ADDRESS.slice(0, 6)}...{AGENT_ADDRESS.slice(-4)}
            </span>
          )}
          <span
            className={`px-2 py-0.5 rounded-full font-medium ${
              NETWORK === 'mainnet'
                ? 'bg-green-200 text-green-800'
                : 'bg-orange-200 text-orange-800'
            }`}
          >
            {NETWORK === 'mainnet' ? 'Mainnet' : 'Alfajores'}
          </span>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
            <div>
              <p className="text-4xl mb-2">🏪</p>
              <p className="text-gray-600 text-sm max-w-xs">
                Hola! Soy tu asistente de pagos. Puedo ayudarte a cobrar en cUSD, registrar
                deudas y generar facturas.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {QUICK_REPLIES.map(reply => (
                <button
                  key={reply}
                  onClick={() => handleSend(reply)}
                  className="px-3 py-1.5 rounded-full border border-gray-300 text-sm text-gray-700 hover:bg-[#FCFF52] hover:border-yellow-400 transition-colors"
                >
                  {reply}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg as Parameters<typeof MessageBubble>[0]['message']} />
        ))}

        {isLoading && (
          <div className="flex justify-start mb-3">
            <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* Input */}
      <footer className="px-4 py-3 border-t border-gray-200 bg-white">
        {messages.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {QUICK_REPLIES.map(reply => (
              <button
                key={reply}
                onClick={() => handleSend(reply)}
                className="px-2.5 py-1 rounded-full border border-gray-200 text-xs text-gray-600 hover:bg-[#FCFF52] hover:border-yellow-400 transition-colors"
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
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder='Ej: cobra S/15 al Chino por 2 kilos de arroz'
            className="flex-1 rounded-full border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="rounded-full bg-[#FCFF52] px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Enviar
          </button>
        </form>
      </footer>
    </div>
  )
}
