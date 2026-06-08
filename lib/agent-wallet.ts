import { formatUnits, parseUnits } from 'viem'
import { publicClient, walletClient, cusdAddress, ERC20_ABI, getAgentAddress, isAddress } from './celo'

// In-memory rate limiter — resets if process restarts, OK for hackathon
const txTimestamps: number[] = []
const MAX_TX_PER_HOUR = 10

function checkRateLimit(): boolean {
  const now = Date.now()
  const windowStart = now - 3_600_000
  const recent = txTimestamps.filter(t => t > windowStart)
  txTimestamps.length = 0
  txTimestamps.push(...recent)
  return txTimestamps.length < MAX_TX_PER_HOUR
}

function recordTx(): void {
  txTimestamps.push(Date.now())
}

export async function getCUSDBalance(address: `0x${string}`): Promise<bigint> {
  return publicClient.readContract({
    address: cusdAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address],
  }) as Promise<bigint>
}

export async function getCELOBalance(address: `0x${string}`): Promise<bigint> {
  return publicClient.getBalance({ address })
}

export async function sendCUSD(to: string, amountCUSD: number): Promise<string> {
  if (!walletClient) {
    throw new Error('Wallet del agente no configurada. Falta la variable AGENT_PRIVATE_KEY.')
  }
  if (!isAddress(to)) {
    throw new Error('La dirección de destino no es válida.')
  }
  if (!checkRateLimit()) {
    throw new Error('Se alcanzó el límite de 10 transacciones por hora. Intenta más tarde.')
  }

  const amount = parseUnits(amountCUSD.toFixed(6), 18)

  const hash = await walletClient.writeContract({
    address: cusdAddress,
    abi: ERC20_ABI,
    functionName: 'transfer',
    args: [to as `0x${string}`, amount],
  })

  recordTx()
  return hash
}

export async function getRecentTransfers(limit = 20) {
  const agentAddress = getAgentAddress()
  if (!agentAddress) return []

  try {
    const currentBlock = await publicClient.getBlockNumber()
    // ~50 000 blocks ≈ 3 days on Celo (5s blocks)
    const fromBlock = currentBlock > 50_000n ? currentBlock - 50_000n : 0n

    const [received, sent] = await Promise.all([
      publicClient.getLogs({
        address: cusdAddress,
        event: {
          type: 'event',
          name: 'Transfer',
          inputs: [
            { name: 'from', type: 'address', indexed: true },
            { name: 'to', type: 'address', indexed: true },
            { name: 'value', type: 'uint256', indexed: false },
          ],
        },
        args: { to: agentAddress },
        fromBlock,
        toBlock: 'latest',
      }),
      publicClient.getLogs({
        address: cusdAddress,
        event: {
          type: 'event',
          name: 'Transfer',
          inputs: [
            { name: 'from', type: 'address', indexed: true },
            { name: 'to', type: 'address', indexed: true },
            { name: 'value', type: 'uint256', indexed: false },
          ],
        },
        args: { from: agentAddress },
        fromBlock,
        toBlock: 'latest',
      }),
    ])

    const all = [...received, ...sent]
      .sort((a, b) => Number((b.blockNumber ?? 0n) - (a.blockNumber ?? 0n)))
      .slice(0, limit)

    return all.map(log => {
      const args = log.args as { from: string; to: string; value: bigint }
      const amountCUSD = parseFloat(formatUnits(args.value, 18))
      const direction = args.to.toLowerCase() === agentAddress.toLowerCase() ? 'in' : 'out'
      return {
        txHash: log.transactionHash ?? '',
        blockNumber: log.blockNumber?.toString() ?? '',
        from: args.from,
        to: args.to,
        amountCUSD: amountCUSD.toFixed(4),
        amountPEN: (amountCUSD * parseFloat(process.env.PEN_TO_CUSD_RATE ?? '3.7')).toFixed(2),
        direction,
      }
    })
  } catch {
    return []
  }
}

export { formatUnits }
