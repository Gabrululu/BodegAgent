/**
 * One-time ERC-8004 agent registration script for BodegAgent.
 *
 * Usage:
 *   node --env-file=.env.local scripts/register-erc8004.mjs
 *
 * Requires AGENT_PRIVATE_KEY in .env.local.
 * Uses a data: URI so no IPFS upload is needed.
 */

import { createPublicClient, createWalletClient, http } from 'viem'
import { celo, celoSepolia } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'

// ─── Config ───────────────────────────────────────────────────────────────────
const network = process.env.NEXT_PUBLIC_NETWORK ?? 'sepolia'
const activeChain = network === 'mainnet' ? celo : celoSepolia
const isMainnet = network === 'mainnet'

const identityRegistryAddress = isMainnet
  ? '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432'
  : '0x8004A818BFB912233c491871b3d84c89A494BD9e'

const explorerBase = isMainnet
  ? 'https://celoscan.io'
  : 'https://celo-sepolia.blockscout.com'

const IDENTITY_REGISTRY_ABI = [
  {
    name: 'register',
    type: 'function',
    inputs: [{ name: 'agentURI', type: 'string' }],
    outputs: [{ name: 'agentId', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    name: 'Transfer',
    type: 'event',
    inputs: [
      { name: 'from', type: 'address', indexed: true },
      { name: 'to', type: 'address', indexed: true },
      { name: 'tokenId', type: 'uint256', indexed: true },
    ],
  },
]

// ─── Wallet setup ─────────────────────────────────────────────────────────────
const privKey = process.env.AGENT_PRIVATE_KEY
if (!privKey) {
  console.error('❌  AGENT_PRIVATE_KEY no está en .env.local')
  process.exit(1)
}

const key = privKey.startsWith('0x') ? privKey : `0x${privKey}`
const account = privateKeyToAccount(key)

const publicClient = createPublicClient({ chain: activeChain, transport: http() })
const walletClient = createWalletClient({ account, chain: activeChain, transport: http() })

const agentAddress = account.address
const deployedUrl = process.env.NEXT_PUBLIC_DEPLOY_URL ?? 'https://bodegagent.vercel.app'

// ─── Build metadata ───────────────────────────────────────────────────────────
const metadata = {
  type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
  name: 'BodegAgent',
  description:
    'Agente de pagos conversacional en USDm para bodegueros peruanos. Cobra, registra fiado y envía recordatorios en español.',
  services: [
    { name: 'web', endpoint: deployedUrl },
    { name: 'A2A', endpoint: `${deployedUrl}/.well-known/agent.json` },
  ],
  supportedTrust: ['reputation'],
  wallet: agentAddress,
  tags: ['payments', 'peru', 'stablecoin', 'celo', 'retail', 'minipay'],
}

const metadataURI = `data:application/json;base64,${Buffer.from(JSON.stringify(metadata)).toString('base64')}`

// ─── Execute ──────────────────────────────────────────────────────────────────
console.log('─────────────────────────────────────────')
console.log('BodegAgent — ERC-8004 Registration')
console.log('─────────────────────────────────────────')
console.log('Network  :', isMainnet ? 'Celo Mainnet' : 'Celo Sepolia')
console.log('Registry :', identityRegistryAddress)
console.log('Agent    :', agentAddress)
console.log('URL      :', deployedUrl)
console.log('')

try {
  const hash = await walletClient.writeContract({
    address: identityRegistryAddress,
    abi: IDENTITY_REGISTRY_ABI,
    functionName: 'register',
    args: [metadataURI],
    // gas paid in CELO (native token) — no feeCurrency needed
  })

  console.log('✅  Tx enviada:', hash)
  console.log('🔍  Explorer :', `${explorerBase}/tx/${hash}`)
  console.log('')
  console.log('⏳  Esperando confirmación...')

  const receipt = await publicClient.waitForTransactionReceipt({ hash })

  // The ERC-721 Transfer event (from=0x0) carries the tokenId = agentId
  const transferLog = receipt.logs.find(
    log => log.address.toLowerCase() === identityRegistryAddress.toLowerCase()
  )

  console.log('')
  if (transferLog?.topics?.[3]) {
    const agentId = BigInt(transferLog.topics[3]).toString()
    console.log('🎉  Registro exitoso!')
    console.log('    agentId :', agentId)
    console.log('    NFT link:', `${explorerBase}/token/${identityRegistryAddress}/instance/${agentId}`)
    console.log('')
    console.log('Link para el tweet (agentscan):')
    console.log(`https://agentscan.io/agent/${agentId}`)
  } else {
    console.log('🎉  Registro exitoso! (revisa el explorer para el agentId)')
    console.log('    Block:', receipt.blockNumber.toString())
  }
} catch (err) {
  console.error('❌  Error:', err?.shortMessage ?? err?.message ?? err)
  process.exit(1)
}
