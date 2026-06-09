// Compare USDC→USDm exchange rates across Celo DEXs
// Source A: DefiLlama prices API — aggregates Mento + Uniswap + all Celo pools
// Source B: Uniswap V3 QuoterV2 on-chain — exact quote for the specific pool (mainnet only)

import { parseUnits, formatUnits } from 'viem'
import { publicClient } from './celo'

const isMainnet = (process.env.NEXT_PUBLIC_NETWORK ?? 'sepolia') === 'mainnet'

// Mainnet token addresses
const USDC_MAINNET = '0xcebA9300f2b948710d2653dD7B07f33A8B32118C' as const
const USDM_MAINNET = '0x765DE816845861e75A25fCA122bb6898B8B1282a' as const
const UNISWAP_QUOTER_V2 = '0x82825d0554fA07f7FC52Ab63c961F330fdEFa8E8' as const

// Uniswap V3 QuoterV2 ABI — quoteExactInputSingle
const QUOTER_ABI = [
  {
    name: 'quoteExactInputSingle',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'fee', type: 'uint24' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' },
        ],
      },
    ],
    outputs: [
      { name: 'amountOut', type: 'uint256' },
      { name: 'sqrtPriceX96After', type: 'uint160' },
      { name: 'initializedTicksCrossed', type: 'uint32' },
      { name: 'gasEstimate', type: 'uint256' },
    ],
  },
] as const

// ── Source A: DefiLlama aggregated market price ───────────────────────────────
// Reflects best available rate across all Celo DEXs (Mento, Uniswap, Curve, etc.)
async function getDefillamaRate(amountUSDC: number) {
  const url =
    `https://coins.llama.fi/prices/current/` +
    `celo:${USDM_MAINNET},celo:${USDC_MAINNET}`

  const res = await fetch(url, { next: { revalidate: 60 }, signal: AbortSignal.timeout(5000) })
  if (!res.ok) throw new Error(`DefiLlama API error ${res.status}`)
  const data = await res.json()

  const usdmEntry = data.coins?.[`celo:${USDM_MAINNET}`]
  const usdcEntry = data.coins?.[`celo:${USDC_MAINNET}`]

  if (!usdmEntry?.price || !usdcEntry?.price) {
    throw new Error('Price data missing from DefiLlama response')
  }

  // USDC/USDm implied rate = how many USDm you get per USDC
  const rate = usdcEntry.price / usdmEntry.price
  const amountOut = amountUSDC * rate

  return {
    protocol: 'Mento / Mercado Celo',
    description: 'Tasa agregada — Mento + todos los DEXs de Celo',
    amountOut: amountOut.toFixed(4),
    rate: rate.toFixed(6),
    usdmPriceUSD: usdmEntry.price.toFixed(6),
    usdcPriceUSD: usdcEntry.price.toFixed(6),
    confidence: usdmEntry.confidence ?? null,
    source: 'DefiLlama',
    available: true,
  }
}

// ── Source B: Uniswap V3 QuoterV2 on-chain ───────────────────────────────────
// Direct pool simulation — gives the exact amount out including pool spread/slippage
// Fee tiers tried in order: 500 (0.05%), 3000 (0.3%)
async function getUniswapV3Rate(amountUSDC: number) {
  if (!isMainnet) {
    return {
      protocol: 'Uniswap V3',
      description: 'Cotización directa del pool (solo Mainnet)',
      amountOut: null as string | null,
      rate: null as string | null,
      available: false,
      note: 'On-chain quotes disponibles solo en Mainnet',
    }
  }

  const amountIn = parseUnits(amountUSDC.toString(), 6) // USDC = 6 decimals

  for (const fee of [500, 3000] as const) {
    try {
      const { result } = await publicClient.simulateContract({
        address: UNISWAP_QUOTER_V2,
        abi: QUOTER_ABI,
        functionName: 'quoteExactInputSingle',
        args: [
          {
            tokenIn: USDC_MAINNET,
            tokenOut: USDM_MAINNET,
            amountIn,
            fee,
            sqrtPriceLimitX96: 0n,
          },
        ],
      })
      const amountOut = parseFloat(formatUnits(result[0], 18))
      const rate = amountOut / amountUSDC
      return {
        protocol: 'Uniswap V3',
        description: `Pool USDC/USDm — fee ${fee / 10000}%`,
        amountOut: amountOut.toFixed(4),
        rate: rate.toFixed(6),
        feeTier: `${fee / 10000}%`,
        available: true,
        note: null as string | null,
      }
    } catch {
      // try next fee tier
    }
  }

  return {
    protocol: 'Uniswap V3',
    description: 'Cotización directa del pool',
    amountOut: null as string | null,
    rate: null as string | null,
    available: false,
    note: 'Pool sin liquidez suficiente para esta cotización',
  }
}

// ── Main: compare both sources ────────────────────────────────────────────────
export async function getBestDexRate(amountUSDC: number) {
  const [defillamaResult, uniswapResult] = await Promise.allSettled([
    getDefillamaRate(amountUSDC),
    getUniswapV3Rate(amountUSDC),
  ])

  const defillama =
    defillamaResult.status === 'fulfilled'
      ? defillamaResult.value
      : {
          protocol: 'Mento / Mercado Celo',
          description: 'Tasa agregada',
          amountOut: null as string | null,
          rate: null as string | null,
          available: false,
          note: 'Error al obtener precio de DefiLlama',
        }

  const uniswap =
    uniswapResult.status === 'fulfilled'
      ? uniswapResult.value
      : {
          protocol: 'Uniswap V3',
          description: 'Cotización directa del pool',
          amountOut: null as string | null,
          rate: null as string | null,
          available: false,
          note: 'Error al consultar el pool',
        }

  // Determine best source
  const rateA = defillama.available ? parseFloat(defillama.rate ?? '0') : 0
  const rateB = uniswap.available ? parseFloat(uniswap.rate ?? '0') : 0
  let best = 'Mento / Mercado Celo'
  let savingsBps: string | null = null

  if (defillama.available && uniswap.available) {
    best = rateB >= rateA ? 'Uniswap V3' : 'Mento / Mercado Celo'
    const diff = Math.abs(rateA - rateB)
    const bps = Math.round((diff / Math.max(rateA, rateB)) * 10_000)
    savingsBps = `${bps} bps`
  } else if (uniswap.available) {
    best = 'Uniswap V3'
  }

  return {
    amountIn: `${amountUSDC} USDC`,
    network: isMainnet ? 'Celo Mainnet' : 'Celo Sepolia (precios de Mainnet)',
    defillama,
    uniswap,
    best,
    savingsBps,
    tip:
      !isMainnet
        ? 'En Mainnet, la cotización de Uniswap será on-chain en tiempo real.'
        : savingsBps
        ? `Diferencia entre fuentes: ${savingsBps}. Para montos grandes, compara antes de swapear.`
        : null,
  }
}
