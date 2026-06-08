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
  color,
}: {
  label: string
  value: string
  sub?: string
  color: string
}) {
  return (
    <div className={`rounded-xl p-5 border ${color}`}>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function exportCSV(transactions: Tx[]) {
  const headers = ['Bloque', 'De', 'Para', 'cUSD', 'PEN', 'Tipo', 'TxHash']
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#FCFF52] px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-2xl">🏪</Link>
          <div>
            <h1 className="font-bold text-gray-900 text-lg leading-tight">BodegAgent</h1>
            <p className="text-xs text-gray-600">Dashboard</p>
          </div>
        </div>
        <Link
          href="/"
          className="rounded-full border border-gray-700/20 px-4 py-1.5 text-sm font-medium text-gray-800 hover:bg-yellow-300 transition-colors"
        >
          ← Chat
        </Link>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {loading && (
          <div className="flex items-center justify-center py-16">
            <p className="text-gray-400 animate-pulse">Cargando datos de la blockchain...</p>
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
            Error: {error}
          </div>
        )}

        {data && (
          <>
            {/* Metrics */}
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <MetricCard
                label="Balance cUSD"
                value={`${data.balance.cusd} cUSD`}
                sub={`${data.balance.celo} CELO`}
                color="border-yellow-200 bg-yellow-50"
              />
              <MetricCard
                label="Txns recientes"
                value={data.txsToday.toString()}
                sub="Últimos ~3 días"
                color="border-blue-200 bg-blue-50"
              />
              <MetricCard
                label="Clientes activos"
                value={data.debtors.length.toString()}
                sub="Con pagos recientes"
                color="border-green-200 bg-green-50"
              />
            </section>

            {/* Address */}
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 flex items-center justify-between text-sm">
              <span className="text-gray-500">Wallet del agente</span>
              <span className="font-mono text-gray-700 text-xs">{data.balance.address}</span>
            </div>

            {/* Historial */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-gray-800">Historial de transacciones</h2>
                <button
                  onClick={() => exportCSV(data.transactions)}
                  className="rounded-full border border-gray-300 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Exportar CSV ↓
                </button>
              </div>
              <TxHistory transactions={data.transactions} />
            </section>

            {/* Deudores */}
            {data.debtors.length > 0 && (
              <section>
                <h2 className="font-semibold text-gray-800 mb-3">Clientes con pagos recientes</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
