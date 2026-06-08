import { createPublicClient, createWalletClient, http, isAddress } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

const celoMainnet = {
  id: 42220,
  name: 'Celo',
  rpcUrls: { default: { http: ['https://forno.celo.org'] } },
  nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
} as const

const celoAlfajores = {
  id: 44787,
  name: 'Celo Alfajores',
  rpcUrls: { default: { http: ['https://alfajores-forno.celo-testnet.org'] } },
  nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
} as const

export const CUSD_MAINNET = '0x765DE816845861e75A25fCA122bb6898B8B1282a' as const
export const CUSD_ALFAJORES = '0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1' as const

export const ERC20_ABI = [
  {
    name: 'transfer',
    type: 'function',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    name: 'balanceOf',
    type: 'function',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    name: 'decimals',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
  },
  {
    name: 'symbol',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
  },
  {
    name: 'Transfer',
    type: 'event',
    inputs: [
      { name: 'from', type: 'address', indexed: true },
      { name: 'to', type: 'address', indexed: true },
      { name: 'value', type: 'uint256', indexed: false },
    ],
  },
] as const

const isMainnet = process.env.NEXT_PUBLIC_NETWORK === 'mainnet'
const activeChain = isMainnet ? celoMainnet : celoAlfajores

export const cusdAddress: `0x${string}` = isMainnet ? CUSD_MAINNET : CUSD_ALFAJORES
export const networkName = isMainnet ? 'Mainnet' : 'Alfajores'
export const explorerBase = isMainnet
  ? 'https://celoscan.io'
  : 'https://alfajores.celoscan.io'

export const publicClient = createPublicClient({
  chain: activeChain,
  transport: http(),
})

function buildWalletClient() {
  const privKey = process.env.AGENT_PRIVATE_KEY
  if (!privKey) return null
  const key = (privKey.startsWith('0x') ? privKey : `0x${privKey}`) as `0x${string}`
  const account = privateKeyToAccount(key)
  return createWalletClient({ account, chain: activeChain, transport: http() })
}

export const walletClient = buildWalletClient()

export function getAgentAddress(): `0x${string}` | '' {
  const fromEnv = process.env.NEXT_PUBLIC_AGENT_ADDRESS
  if (fromEnv) return fromEnv as `0x${string}`
  return (walletClient?.account?.address ?? '') as `0x${string}` | ''
}

export { isAddress }
