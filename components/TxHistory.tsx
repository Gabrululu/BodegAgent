'use client'

const EXPLORER_BASE =
  process.env.NEXT_PUBLIC_NETWORK === 'mainnet'
    ? 'https://celoscan.io'
    : 'https://celo-sepolia.blockscout.com'

type Tx = {
  txHash: string
  blockNumber: string
  from: string
  to: string
  amountCUSD: string
  amountPEN: string
  direction: 'in' | 'out'
}

export default function TxHistory({ transactions }: { transactions: Tx[] }) {
  if (transactions.length === 0) {
    return (
      <div className="border border-line rounded px-6 py-12 text-center">
        <p className="font-mono text-xs text-muted uppercase tracking-widest">
          Sin transacciones recientes
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto border border-line rounded">
      <table className="w-full text-xs font-mono">
        <thead>
          <tr className="border-b border-line bg-raised text-[10px] uppercase tracking-widest text-muted">
            <th className="px-4 py-3 text-left">Bloque</th>
            <th className="px-4 py-3 text-left">Dirección</th>
            <th className="px-4 py-3 text-right">USDm</th>
            <th className="px-4 py-3 text-right">PEN</th>
            <th className="px-4 py-3 text-center">Tipo</th>
            <th className="px-4 py-3 text-left">Tx</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {transactions.map((tx, i) => {
            const addr = tx.direction === 'in' ? tx.from : tx.to
            return (
              <tr key={i} className="transition-colors hover:bg-raised">
                <td className="px-4 py-3 text-muted">{tx.blockNumber.slice(-6)}</td>
                <td className="px-4 py-3">
                  <div className="text-[9px] uppercase tracking-widest text-muted mb-0.5">
                    {tx.direction === 'in' ? 'de' : 'para'}
                  </div>
                  <div className="text-sub">
                    {addr.slice(0, 8)}…{addr.slice(-6)}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className={tx.direction === 'in' ? 'text-green' : 'text-orange'}>
                    {tx.direction === 'in' ? '+' : '−'}{tx.amountCUSD}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-muted">S/{tx.amountPEN}</td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      tx.direction === 'in'
                        ? 'bg-green/10 text-green'
                        : 'bg-orange/10 text-orange'
                    }`}
                  >
                    {tx.direction === 'in' ? 'Cobro' : 'Pago'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {tx.txHash ? (
                    <a
                      href={`${EXPLORER_BASE}/tx/${tx.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted transition-colors hover:text-yellow"
                    >
                      {tx.txHash.slice(0, 8)}… ↗
                    </a>
                  ) : (
                    <span className="text-line">—</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
