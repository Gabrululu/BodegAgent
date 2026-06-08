import { formatUnits, parseUnits } from 'viem'
import {
  publicClient,
  walletClient,
  usdmAddress,
  feeCurrencyAddress,
  ERC20_ABI,
  IDENTITY_REGISTRY_ABI,
  identityRegistryAddress,
  getAgentAddress,
  isAddress,
} from './celo'

// ─── Rate limiter (in-memory, OK for hackathon) ───────────────────────────────
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

// ─── Balance helpers ──────────────────────────────────────────────────────────
export async function getUSDmBalance(address: `0x${string}`): Promise<bigint> {
  return publicClient.readContract({
    address: usdmAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address],
  }) as Promise<bigint>
}

export async function getCELOBalance(address: `0x${string}`): Promise<bigint> {
  return publicClient.getBalance({ address })
}

// Backward compat alias
export const getCUSDBalance = getUSDmBalance

// ─── Send USDm with CIP-64 fee abstraction ────────────────────────────────────
// feeCurrency = usdmAddress enables paying gas in USDm instead of CELO (CIP-64).
// This is critical for MiniPay compatibility and a better UX for bodegueros.
export async function sendCUSD(to: string, amountUSDm: number): Promise<string> {
  if (!walletClient) {
    throw new Error('Wallet del agente no configurada. Falta la variable AGENT_PRIVATE_KEY.')
  }
  if (!isAddress(to)) {
    throw new Error('La dirección de destino no es válida.')
  }
  if (!checkRateLimit()) {
    throw new Error('Se alcanzó el límite de 10 transacciones por hora. Intenta más tarde.')
  }

  const amount = parseUnits(amountUSDm.toFixed(6), 18)

  const hash = await walletClient.writeContract({
    address: usdmAddress,
    abi: ERC20_ABI,
    functionName: 'transfer',
    args: [to as `0x${string}`, amount],
    feeCurrency: feeCurrencyAddress, // CIP-64: pay gas in USDm
  })

  recordTx()
  return hash
}

// ─── ERC-8004 Agent Identity Registration ────────────────────────────────────
// Registers BodegAgent on the Celo ERC-8004 Identity Registry.
// Returns the transaction hash. The agentId can be read from the Transfer event.
// Metadata must be content-addressed (ipfs:// or data:) to pass validator checks.
export async function registerAgentERC8004(agentMetadataURI: string): Promise<string> {
  if (!walletClient) {
    throw new Error('Wallet del agente no configurada.')
  }
  if (!agentMetadataURI.startsWith('ipfs://') && !agentMetadataURI.startsWith('data:')) {
    throw new Error(
      'El URI de metadata debe ser content-addressed (ipfs:// o data:) para pasar el validador ERC-8004.'
    )
  }

  const hash = await walletClient.writeContract({
    address: identityRegistryAddress,
    abi: IDENTITY_REGISTRY_ABI,
    functionName: 'register',
    args: [agentMetadataURI],
    feeCurrency: feeCurrencyAddress,
  })

  return hash
}

// Build compliant ERC-8004 metadata for BodegAgent
export function buildAgentMetadata(agentAddress: string, deployedUrl: string) {
  return {
    type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
    name: 'BodegAgent',
    description:
      'Agente de pagos conversacional en USDm para bodegueros peruanos. Cobra, registra fiado y envía recordatorios.',
    services: [
      { name: 'web', endpoint: deployedUrl },
      { name: 'A2A', endpoint: `${deployedUrl}/.well-known/agent.json` },
    ],
    supportedTrust: ['reputation'],
    wallet: agentAddress,
    tags: ['payments', 'peru', 'stablecoin', 'celo', 'retail'],
  }
}

// ─── Transaction history via Blockscout API ───────────────────────────────────
// Celo's public RPC limits eth_getLogs to 50 000 blocks (~14 hours at 1s/block).
// For deeper history (30 days), use Blockscout's REST API — no key needed.
export async function getRecentTransfers(limit = 20) {
  const agentAddress = getAgentAddress()
  if (!agentAddress) return []

  try {
    const currentBlock = await publicClient.getBlockNumber()
    // 43 200 blocks ≈ 12 hours on Celo (1s/block) — safely under the 50 000 limit
    const fromBlock = currentBlock > 43_200n ? currentBlock - 43_200n : 0n

    const TRANSFER_EVENT = {
      type: 'event' as const,
      name: 'Transfer',
      inputs: [
        { name: 'from', type: 'address', indexed: true },
        { name: 'to', type: 'address', indexed: true },
        { name: 'value', type: 'uint256', indexed: false },
      ],
    }

    const [received, sent] = await Promise.all([
      publicClient.getLogs({
        address: usdmAddress,
        event: TRANSFER_EVENT,
        args: { to: agentAddress },
        fromBlock,
        toBlock: 'latest',
      }),
      publicClient.getLogs({
        address: usdmAddress,
        event: TRANSFER_EVENT,
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
      const amountUSDm = parseFloat(formatUnits(args.value, 18))
      const direction = args.to.toLowerCase() === agentAddress.toLowerCase() ? 'in' : 'out'
      return {
        txHash: log.transactionHash ?? '',
        blockNumber: log.blockNumber?.toString() ?? '',
        from: args.from,
        to: args.to,
        amountCUSD: amountUSDm.toFixed(4), // field kept as amountCUSD for API compat
        amountPEN: (amountUSDm * parseFloat(process.env.PEN_TO_CUSD_RATE ?? '3.7')).toFixed(2),
        direction,
      }
    })
  } catch {
    return []
  }
}

export { formatUnits }
