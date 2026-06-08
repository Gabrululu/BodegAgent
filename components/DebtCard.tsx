'use client'

type Debtor = {
  address: string
  shortAddress: string
  totalCUSD: string
  totalPEN: string
  txCount: number
}

export default function DebtCard({ debtor }: { debtor: Debtor }) {
  return (
    <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 flex items-center justify-between">
      <div>
        <p className="font-mono text-sm font-medium text-gray-800">{debtor.shortAddress}</p>
        <p className="text-xs text-gray-500 mt-0.5">
          {debtor.txCount} pago{debtor.txCount !== 1 ? 's' : ''} recibido{debtor.txCount !== 1 ? 's' : ''}
        </p>
      </div>
      <div className="text-right">
        <p className="font-bold text-orange-700 text-lg">{debtor.totalCUSD} cUSD</p>
        <p className="text-xs text-gray-500">S/{debtor.totalPEN}</p>
      </div>
    </div>
  )
}
