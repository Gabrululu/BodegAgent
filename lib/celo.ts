import { createPublicClient, createWalletClient, http, isAddress } from 'viem'
import { celo, celoSepolia } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'

// ─── Network selection ────────────────────────────────────────────────────────
// NEXT_PUBLIC_NETWORK: "mainnet" | "sepolia" (default: sepolia)
const network = process.env.NEXT_PUBLIC_NETWORK ?? 'sepolia'
const activeChain = network === 'mainnet' ? celo : celoSepolia

// ─── USDm (Mento Dollar, legacy name: cUSD) — 18 decimals ────────────────────
// Address verified on-chain via Celo Registry.getAddressForString('StableToken')
// USDm token address == feeCurrency adapter (CIP-64 fee abstraction).
export const USDM_MAINNET = '0x765DE816845861e75A25fCA122bb6898B8B1282a' as const
export const USDM_SEPOLIA  = '0xEF4d55D6dE8e8d73232827Cd1e9b2F2dBb45bC80' as const

export const usdmAddress: `0x${string}` =
  network === 'mainnet' ? USDM_MAINNET : USDM_SEPOLIA

// For CIP-64 fee abstraction: on Celo, USDm token address == feeCurrency adapter
export const feeCurrencyAddress: `0x${string}` = usdmAddress

// ─── ERC-8004 Agent Identity Registry ─────────────────────────────────────────
// https://eips.ethereum.org/EIPS/eip-8004 | https://www.8004.org
export const identityRegistryAddress: `0x${string}` =
  network === 'mainnet'
    ? '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432'
    : '0x8004A818BFB912233c491871b3d84c89A494BD9e'

export const IDENTITY_REGISTRY_ABI = [
  {
    name: 'register',
    type: 'function',
    inputs: [{ name: 'agentURI', type: 'string' }],
    outputs: [{ name: 'agentId', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    name: 'tokenURI',
    type: 'function',
    inputs: [{ name: 'agentId', type: 'uint256' }],
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
  },
  {
    name: 'ownerOf',
    type: 'function',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
] as const

// ─── ERC-20 ABI (minimal) ─────────────────────────────────────────────────────
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

// ─── Clients ──────────────────────────────────────────────────────────────────
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

export const networkName = network === 'mainnet' ? 'Mainnet' : 'Celo Sepolia'

export const explorerBase =
  network === 'mainnet' ? 'https://celoscan.io' : 'https://celo-sepolia.blockscout.com'

// Backward compat alias
export const cusdAddress = usdmAddress

export { isAddress }
