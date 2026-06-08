# BodegAgent 🏪

**Conversational payment agent in USDm for Peruvian bodegueros, deployed on Celo.**

BodegAgent lets a corner store owner collect payments in USDm (Celo's dollar stablecoin), track debt ("fiado"), generate invoices, and send payment reminders — all through a natural Spanish conversation, without needing to understand crypto.

Built for the **[Onchain Agents Hackathon](https://celo.org)** on Celo.

---

## What it does

| Capability | Command (natural language) |
|---|---|
| Collect a payment in USDm | *"Cobra S/15 al Chino por 2 kilos de arroz"* |
| Check agent wallet balance | *"Ver mi saldo"* |
| Generate an invoice | *"Factura para Rosa: 3 gaseosas a S/3 cada una, vence el viernes"* |
| Review recent payments received | *"Ver deudas pendientes"* |
| Generate a debt reminder message | *"Recuérdale a Pedro que debe S/40"* |

The agent converts Peruvian soles (PEN) to USDm automatically using a configurable exchange rate, confirms every transaction before signing, and enforces a safety limit of 10 transactions per hour.

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 — App Router |
| AI | Vercel AI SDK v6 + Anthropic `claude-sonnet-4-20250514` |
| Blockchain | viem v2 — Celo Mainnet + **Celo Sepolia** (active testnet) |
| Stablecoin | USDm (Mento Dollar, legacy: cUSD) — 18 decimals |
| Gas abstraction | CIP-64 `feeCurrency` — agent pays gas in USDm, no CELO needed |
| Agent identity | ERC-8004 Identity Registry on Celo |
| Styling | Tailwind CSS v4 |
| Language | TypeScript (strict) |
| Deploy | Vercel |

---

## Project structure

```
app/
  page.tsx                  ← Chat UI (renders <Chat />)
  dashboard/page.tsx        ← Transaction history + debtors dashboard
  api/
    chat/route.ts           ← Vercel AI SDK streamText endpoint
    transactions/route.ts   ← Reads recent USDm transfers from Celo
lib/
  celo.ts                   ← viem clients, chain config, ERC-8004 addresses
  agent-wallet.ts           ← sendCUSD (CIP-64), ERC-8004 registration, getLogs
  tools.ts                  ← AI tools: send_cusd, check_balance, create_invoice, …
components/
  Chat.tsx                  ← Full chat UI with TxCard and quick replies
  TxHistory.tsx             ← Transaction history table
  DebtCard.tsx              ← Debtor summary card
.env.local.example          ← Required environment variables
```

---

## Getting started

### 1. Clone and install

```bash
git clone https://github.com/your-username/BodegAgent.git
cd BodegAgent
pnpm install
```

### 2. Configure environment variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
ANTHROPIC_API_KEY=sk-ant-...

# Hex private key WITHOUT the 0x prefix — server-side only, never exposed to the client
AGENT_PRIVATE_KEY=abc123...

# Network: "sepolia" (active testnet) | "mainnet"
NEXT_PUBLIC_NETWORK=sepolia

# Public address of the agent wallet (shown in the UI header)
NEXT_PUBLIC_AGENT_ADDRESS=0x...

# Conversion rate: 1 USDm ≈ 3.7 Peruvian soles — adjust as needed
PEN_TO_CUSD_RATE=3.7
```

> **Security:** `AGENT_PRIVATE_KEY` is a real private key. Use a fresh wallet with testnet funds only. Never commit `.env.local`.

### 3. Fund the agent wallet

Get testnet USDm and CELO from the Celo Sepolia faucet:

- https://faucet.celo.org/celo-sepolia

### 4. Run locally

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) — the chat interface loads immediately.

The dashboard is at [http://localhost:3000/dashboard](http://localhost:3000/dashboard).

---

## AI tools

The agent has five tools powered by Vercel AI SDK v6:

| Tool | Description |
|---|---|
| `send_cusd` | Transfers USDm via ERC-20. Converts PEN → USDm. Requires confirmation for amounts > 50 USDm. Rate-limited to 10 tx/hour. Uses CIP-64 fee abstraction. |
| `check_balance` | Returns the agent wallet's USDm and CELO balances. |
| `create_invoice` | Generates an invoice with line items in PEN + USDm total and a payment deeplink. |
| `check_pending_debts` | Reads recent Transfer events (~12 hours) from Celo to find incoming payments. |
| `remind_debtor` | Generates a friendly Spanish reminder message for the bodeguero to copy and send. |

---

## Celo-specific details

### Networks supported

| Network | Chain ID | RPC | Explorer | Default |
|---|---|---|---|---|
| **Celo Sepolia** (testnet) | 11142220 | `https://forno.celo-sepolia.celo-testnet.org` | https://celo-sepolia.blockscout.com | ✓ |
| Celo Mainnet | 42220 | `https://forno.celo.org` | https://celoscan.io | |

### USDm contract addresses

| Network | Address | Verified |
|---|---|---|
| **Celo Sepolia** | `0xEF4d55D6dE8e8d73232827Cd1e9b2F2dBb45bC80` | via Registry on-chain |
| Mainnet | `0x765DE816845861e75A25fCA122bb6898B8B1282a` | official docs |

> USDm (Mento Dollar) is the rebrand of cUSD. The token address doubles as the `feeCurrency` adapter for CIP-64 gas abstraction — no separate adapter needed.

### CIP-64 fee abstraction

All outgoing transactions include `feeCurrency: usdmAddress`. This means the agent wallet pays gas in USDm and does not need a CELO balance to operate.

### ERC-8004 agent identity

`lib/agent-wallet.ts` exports two helpers for on-chain agent registration:

```typescript
import { registerAgentERC8004, buildAgentMetadata } from '@/lib/agent-wallet'

// 1. Build spec-compliant metadata (EIP-8004 #registration-v1)
const metadata = buildAgentMetadata(agentAddress, 'https://bodegagent.vercel.app')

// 2. Pin metadata to IPFS, then register
const txHash = await registerAgentERC8004('ipfs://QmYourCID...')
```

The metadata shape follows the current ERC-8004 spec (v1): `type` is the spec URI, `services` (not `endpoints`), and each entry uses `endpoint` (not `url`). The `agentURI` must be content-addressed (`ipfs://` or `data:`) to pass validator checks on [8004scan](https://8004scan.io).

Identity Registry addresses:
- Mainnet: `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`
- Celo Sepolia: `0x8004A818BFB912233c491871b3d84c89A494BD9e`

### `eth_getLogs` limit

Celo's public RPC rejects log queries spanning more than 50,000 blocks. At ~1 second per block that is roughly **14 hours** of history per request. The dashboard queries the last 43,200 blocks (~12 hours) to stay safely under the limit. For deeper history, use the [Blockscout REST API](https://celo.blockscout.com/api-docs) — no API key needed.

---

## Deploy to Vercel

```bash
vercel deploy
```

Set the same environment variables from `.env.local` in your Vercel project settings under **Settings → Environment Variables**.

> Do not set `AGENT_PRIVATE_KEY` as a `NEXT_PUBLIC_` variable — it must remain server-side only.

---

## License

MIT
