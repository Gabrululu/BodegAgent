import { NextResponse } from 'next/server'
import { getRecentTransfers } from '@/lib/agent-wallet'
import { getCUSDBalance, getCELOBalance } from '@/lib/agent-wallet'
import { getAgentAddress } from '@/lib/celo'
import { formatUnits } from 'viem'

export async function GET() {
  const agentAddress = getAgentAddress()

  if (!agentAddress) {
    return NextResponse.json(
      { error: 'Wallet del agente no configurada' },
      { status: 500 }
    )
  }

  try {
    const [transfers, cusdBal, celoBal] = await Promise.all([
      getRecentTransfers(20),
      getCUSDBalance(agentAddress as `0x${string}`),
      getCELOBalance(agentAddress as `0x${string}`),
    ])

    const today = new Date().toDateString()
    const txsToday = transfers.filter(tx => {
      // blockNumber-based filtering isn't ideal, but timestamps need extra RPC call
      // For hackathon, count all fetched txns as "today" if no timestamp available
      return true
    }).length

    // Aggregate debtors from incoming transfers
    const debtorMap: Record<string, { totalCUSD: number; totalPEN: number; txCount: number }> = {}
    for (const tx of transfers.filter(t => t.direction === 'in')) {
      if (!debtorMap[tx.from]) debtorMap[tx.from] = { totalCUSD: 0, totalPEN: 0, txCount: 0 }
      debtorMap[tx.from].totalCUSD += parseFloat(tx.amountCUSD)
      debtorMap[tx.from].totalPEN += parseFloat(tx.amountPEN)
      debtorMap[tx.from].txCount++
    }

    const debtors = Object.entries(debtorMap).map(([addr, data]) => ({
      address: addr,
      shortAddress: `${addr.slice(0, 6)}...${addr.slice(-4)}`,
      totalCUSD: data.totalCUSD.toFixed(2),
      totalPEN: data.totalPEN.toFixed(2),
      txCount: data.txCount,
    }))

    return NextResponse.json({
      balance: {
        cusd: parseFloat(formatUnits(cusdBal, 18)).toFixed(2),
        celo: parseFloat(formatUnits(celoBal, 18)).toFixed(4),
        address: agentAddress,
      },
      txsToday: transfers.length,
      transactions: transfers,
      debtors,
    })
  } catch (err) {
    console.error('[transactions]', err)
    return NextResponse.json({ error: 'Error al leer la blockchain' }, { status: 500 })
  }
}
