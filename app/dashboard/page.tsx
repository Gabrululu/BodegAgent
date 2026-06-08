'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import TxHistory from '@/components/TxHistory'
import DebtCard from '@/components/DebtCard'

type Tx = {
  txHash: string
  blockNumber: string
  from: string
  to: string
  amountCUSD: string
  amountPEN: string
  direction: 'in' | 'out'
}

type Debtor = {
  address: string
  shortAddress: string
  totalCUSD: string
  totalPEN: string
  txCount: number
}

type DashboardData = {
  balance: { cusd: string; celo: string; address: string }
  txsToday: number
  transactions: Tx[]
  debtors: Debtor[]
}

function MetricCard({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string
  value: string
  sub?: string
  accent?: boolean
}) {
  return (
    <div className={`border rounded p-5 ${accent ? 'border-yellow/30 bg-yellow/5' : 'border-line bg-raised'}`}>
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">{label}</p>
      <p className={`mt-2 font-mono text-2xl font-bold ${accent ? 'text-yellow' : 'text-text'}`}>
        {value}
      </p>
      {sub && <p className="mt-0.5 font-mono text-[11px] text-muted">{sub}</p>}
    </div>
  )
}

function exportCSV(transactions: Tx[]) {
  const headers = ['Bloque', 'De', 'Para', 'USDm', 'PEN', 'Tipo', 'TxHash']
  const rows = transactions.map(tx => [
    tx.blockNumber,
    tx.from,
    tx.to,
    tx.amountCUSD,
    tx.amountPEN,
    tx.direction === 'in' ? 'Cobro' : 'Pago',
    tx.txHash,
  ])
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `bodegagent-txns-${Date.now()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/transactions')
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error)
        setData(d)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-ink text-text">

      {/* ── Header ── */}
      <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-3">
            <Link href="/" aria-label="Inicio">
              <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="32" height="32" rx="6" fill="#FCFF52"/>
                <path d="M6 22 L6 14 L9 11 L23 11 L26 14 L26 22 Z" fill="#1C1C1C"/>
                <rect x="13" y="16" width="6" height="6" fill="#FCFF52"/>
                <rect x="8" y="14" width="4" height="4" fill="#FCFF52"/>
                <rect x="20" y="14" width="4" height="4" fill="#FCFF52"/>
                <circle cx="25" cy="9" r="3" fill="#35D07F"/>
              </svg>
            </Link>
            <div>
              <span className="text-sm font-bold tracking-tight text-text">BODEGAGENT</span>
              <span className="ml-2 font-mono text-xs text-muted">/ dashboard</span>
            </div>
          </div>
          <Link
            href="/chat"
            className="border border-line px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider text-muted transition-colors hover:border-sub hover:text-text"
          >
            ← Agente
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-6 py-8">

        {loading && (
          <div className="flex items-center justify-center py-20">
            <p className="font-mono text-xs uppercase tracking-widest text-muted animate-pulse">
              Consultando blockchain…
            </p>
          </div>
        )}

        {error && (
          <div className="rounded border border-orange/30 bg-orange/5 p-4">
            <p className="font-mono text-xs text-orange">Error: {error}</p>
          </div>
        )}

        {data && (
          <>
            {/* Metrics */}
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <MetricCard
                label="Balance USDm"
                value={`${data.balance.cusd}`}
                sub={`${data.balance.celo} CELO`}
                accent
              />
              <MetricCard
                label="Txns recientes"
                value={data.txsToday.toString()}
                sub="Últimas ~12 horas"
              />
              <MetricCard
                label="Clientes activos"
                value={data.debtors.length.toString()}
                sub="Con pagos recibidos"
              />
            </section>

            {/* Wallet address */}
            <div className="border border-line rounded px-4 py-3 flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-widest text-muted font-mono">
                Wallet del agente
              </span>
              <span className="font-mono text-xs text-sub">{data.balance.address}</span>
            </div>

            {/* Historial */}
            <section>
              <div className="mb-4 flex items-center justify-between border-b border-line pb-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
                  Historial de transacciones
                </p>
                <button
                  onClick={() => exportCSV(data.transactions)}
                  className="rounded border border-line px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-muted transition-colors hover:border-sub hover:text-text"
                >
                  Exportar CSV ↓
                </button>
              </div>
              <TxHistory transactions={data.transactions} />
            </section>

            {/* Deudores */}
            {data.debtors.length > 0 && (
              <section>
                <p className="mb-4 border-b border-line pb-4 font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
                  Clientes con pagos recientes
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {data.debtors.map((debtor, i) => (
                    <DebtCard key={i} debtor={debtor} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

    </div>
  )
}
