'use client'

import { useState } from 'react'
import type { FiadoEntry } from '@/lib/use-fiado'

type Contact = { name: string; address: string }

interface QuickActionsProps {
  contacts: Contact[]
  pendingFiado: FiadoEntry[]
  onSend: (text: string) => void
  isLoading: boolean
  onSettleFiado: (id: string) => void
}

/* ── Bottom sheet ── */
function Sheet({
  open, onClose, title, children,
}: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 max-h-[88vh] overflow-y-auto rounded-t-2xl border-t border-line bg-surface">
        <div className="sticky top-0 flex items-center justify-between border-b border-line bg-surface px-5 py-4">
          <h3 className="text-sm font-semibold text-text">{title}</h3>
          <button onClick={onClose} className="flex h-6 w-6 items-center justify-center rounded-full bg-overlay text-muted hover:text-text">
            ×
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
      </div>
    </>
  )
}

/* ── Numeric keypad ── */
function Numpad({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫']
  function press(k: string) {
    if (k === '⌫') { onChange(value.slice(0, -1)); return }
    if (k === '.' && value.includes('.')) return
    if (k === '.' && value === '') { onChange('0.'); return }
    if (value.split('.')[1]?.length >= 2) return
    if (value === '0' && k !== '.') { onChange(k); return }
    onChange(value + k)
  }
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {keys.map(k => (
        <button
          key={k}
          onClick={() => press(k)}
          className={`rounded-lg py-3.5 text-sm font-medium transition-colors active:scale-95 ${
            k === '⌫' ? 'bg-overlay text-muted hover:text-text' : 'bg-raised text-text hover:bg-overlay'
          }`}
        >
          {k}
        </button>
      ))}
    </div>
  )
}

/* ── Main component ── */
export default function QuickActions({
  contacts, pendingFiado, onSend, isLoading, onSettleFiado,
}: QuickActionsProps) {
  const [sheet, setSheet] = useState<'cobrar' | 'fiado' | null>(null)
  const [amount, setAmount] = useState('')
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [memo, setMemo] = useState('')

  function close() {
    setSheet(null)
    setAmount('')
    setSelectedContact(null)
    setMemo('')
  }

  function submitCobrar() {
    const n = parseFloat(amount)
    if (!n || n <= 0) return
    const to = selectedContact ? ` a ${selectedContact.name} (${selectedContact.address})` : ''
    const concepto = memo ? ` por ${memo}` : ''
    onSend(`cobra S/${amount}${to}${concepto}`)
    close()
  }

  const fee = amount ? (parseFloat(amount) * 0.005).toFixed(2) : '0.00'
  const usdm = amount ? (parseFloat(amount) / 3.43).toFixed(2) : '0.00'

  return (
    <>
      {/* ── Quick action bar ── */}
      <div className="flex gap-2 px-4 pb-2 pt-1">
        <button
          onClick={() => setSheet('cobrar')}
          disabled={isLoading}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-yellow/30 bg-yellow/8 py-2 text-xs font-semibold text-yellow transition-colors hover:bg-yellow/15 disabled:opacity-40"
        >
          💸 Cobrar
        </button>
        <button
          onClick={() => { onSend('Ver mi saldo') }}
          disabled={isLoading}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-line py-2 text-xs font-medium text-sub transition-colors hover:border-sub hover:text-text disabled:opacity-40"
        >
          💰 Saldo
        </button>
        <button
          onClick={() => setSheet('fiado')}
          disabled={isLoading}
          className="relative flex flex-1 items-center justify-center gap-1.5 rounded-full border border-line py-2 text-xs font-medium text-sub transition-colors hover:border-sub hover:text-text disabled:opacity-40"
        >
          📒 Fiado
          {pendingFiado.length > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange text-[9px] font-bold text-ink">
              {pendingFiado.length > 9 ? '9+' : pendingFiado.length}
            </span>
          )}
        </button>
      </div>

      {/* ── Cobrar sheet ── */}
      <Sheet open={sheet === 'cobrar'} onClose={close} title="Cobrar">
        <div className="space-y-4">
          {/* Amount display */}
          <div className="rounded-xl border border-line bg-raised px-4 py-4 text-center">
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted">Monto en soles</p>
            <p className={`mt-1 font-mono text-4xl font-bold transition-colors ${amount ? 'text-yellow' : 'text-overlay'}`}>
              S/ {amount || '0'}
            </p>
            {amount && parseFloat(amount) > 0 && (
              <div className="mt-2 space-y-0.5">
                <p className="font-mono text-[10px] text-muted">≈ {usdm} USDm</p>
                <p className="font-mono text-[10px] text-orange/80">fee servicio 0.5%: S/{fee}</p>
              </div>
            )}
          </div>

          {/* Numpad */}
          <Numpad value={amount} onChange={setAmount} />

          {/* Contact picker */}
          {contacts.length > 0 && (
            <div>
              <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.18em] text-muted">
                Cobrarle a
              </p>
              <div className="flex flex-wrap gap-1.5">
                {contacts.map(c => (
                  <button
                    key={c.name}
                    onClick={() => setSelectedContact(selectedContact?.name === c.name ? null : c)}
                    className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                      selectedContact?.name === c.name
                        ? 'border-yellow/50 bg-yellow/10 text-yellow'
                        : 'border-line text-sub hover:border-yellow/30 hover:text-yellow'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Concepto */}
          <input
            type="text"
            value={memo}
            onChange={e => setMemo(e.target.value)}
            placeholder="Concepto: arroz, gaseosa, jabón…"
            className="w-full rounded-lg border border-line bg-raised px-3 py-2.5 text-sm text-text placeholder:text-muted focus:border-yellow/50 focus:outline-none"
          />

          <button
            onClick={submitCobrar}
            disabled={!amount || parseFloat(amount) <= 0}
            className="w-full rounded-full bg-yellow py-3.5 text-sm font-bold text-ink transition-opacity hover:opacity-85 disabled:opacity-30"
          >
            Cobrar S/{amount || '0'} →
          </button>
        </div>
      </Sheet>

      {/* ── Fiado sheet ── */}
      <Sheet
        open={sheet === 'fiado'}
        onClose={close}
        title={`Fiado · ${pendingFiado.length} pendiente${pendingFiado.length !== 1 ? 's' : ''}`}
      >
        {pendingFiado.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-3xl mb-3">📒</p>
            <p className="text-sm font-medium text-text">Sin fiados pendientes</p>
            <p className="mt-1 text-xs text-muted">Todo el mundo está al día</p>
            <button
              onClick={() => { close(); onSend('Anotar fiado nuevo') }}
              className="mt-4 rounded-full border border-line px-4 py-2 text-xs text-sub transition-colors hover:border-yellow hover:text-yellow"
            >
              Anotar un fiado →
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingFiado
              .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
              .map(f => {
                const daysAgo = Math.floor(
                  (Date.now() - new Date(f.createdAt).getTime()) / 86400000
                )
                return (
                  <div key={f.id} className={`rounded-xl border p-4 ${daysAgo > 7 ? 'border-orange/30 bg-orange/5' : 'border-line bg-raised'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-text">{f.customerName}</p>
                        <p className="mt-0.5 truncate text-xs text-muted">{f.description}</p>
                        <p className={`mt-1 font-mono text-[10px] ${daysAgo > 7 ? 'text-orange' : 'text-muted'}`}>
                          hace {daysAgo === 0 ? 'hoy' : `${daysAgo} día${daysAgo !== 1 ? 's' : ''}`}
                          {daysAgo > 14 && ' ⚠️'}
                        </p>
                      </div>
                      <p className="flex-shrink-0 font-mono text-lg font-bold text-yellow">
                        S/{f.amountPEN.toFixed(2)}
                      </p>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          onSend(`Recuérdale a ${f.customerName} que debe S/${f.amountPEN.toFixed(2)} por ${f.description}`)
                          close()
                        }}
                        className="rounded-lg border border-line py-2 text-xs text-muted transition-colors hover:border-sub hover:text-text"
                      >
                        Recordar
                      </button>
                      <button
                        onClick={() => {
                          onSettleFiado(f.id)
                          if (pendingFiado.length === 1) close()
                        }}
                        className="rounded-lg border border-green/30 bg-green/8 py-2 text-xs text-green transition-colors hover:bg-green/15"
                      >
                        Saldado ✓
                      </button>
                    </div>
                  </div>
                )
              })}
          </div>
        )}
      </Sheet>
    </>
  )
}
