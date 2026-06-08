'use client'

const EXPLORER_BASE =
  process.env.NEXT_PUBLIC_NETWORK === 'mainnet'
    ? 'https://celoscan.io'
    : 'https://alfajores.celoscan.io'

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
      <p className="text-center text-gray-400 py-8 text-sm">
        No hay transacciones recientes en los últimos 3 días.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
            <th className="px-4 py-3 text-left">Bloque</th>
            <th className="px-4 py-3 text-left">De / Para</th>
            <th className="px-4 py-3 text-right">cUSD</th>
            <th className="px-4 py-3 text-right">PEN</th>
            <th className="px-4 py-3 text-center">Tipo</th>
            <th className="px-4 py-3 text-left">Tx</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {transactions.map((tx, i) => (
            <tr key={i} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 font-mono text-xs text-gray-500">
                {tx.blockNumber.slice(-6)}
              </td>
              <td className="px-4 py-3 font-mono text-xs">
                <div className="text-gray-400 text-[10px]">{tx.direction === 'in' ? 'DE' : 'PARA'}</div>
                <div>{(tx.direction === 'in' ? tx.from : tx.to).slice(0, 8)}...{(tx.direction === 'in' ? tx.from : tx.to).slice(-6)}</div>
              </td>
              <td className="px-4 py-3 text-right font-medium">
                <span className={tx.direction === 'in' ? 'text-green-600' : 'text-red-500'}>
                  {tx.direction === 'in' ? '+' : '-'}{tx.amountCUSD}
                </span>
              </td>
              <td className="px-4 py-3 text-right text-gray-500">
                S/{tx.amountPEN}
              </td>
              <td className="px-4 py-3 text-center">
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    tx.direction === 'in'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
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
                    className="font-mono text-xs text-blue-500 hover:underline"
                  >
                    {tx.txHash.slice(0, 8)}... ↗
                  </a>
                ) : (
                  <span className="text-gray-300 text-xs">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
