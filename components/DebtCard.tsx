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
    <div className="border border-line rounded p-4 flex items-center justify-between hover:border-sub transition-colors">
      <div>
        <p className="font-mono text-sm text-sub">{debtor.shortAddress}</p>
        <p className="mt-0.5 text-[11px] text-muted">
          {debtor.txCount} pago{debtor.txCount !== 1 ? 's' : ''} recibido{debtor.txCount !== 1 ? 's' : ''}
        </p>
      </div>
      <div className="text-right">
        <p className="font-mono text-lg font-bold text-yellow">{debtor.totalCUSD} USDm</p>
        <p className="font-mono text-xs text-muted">S/{debtor.totalPEN}</p>
      </div>
    </div>
  )
}
