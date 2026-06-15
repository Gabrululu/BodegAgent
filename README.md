# BodegAgent

**Conversational USDm payment agent for Peruvian corner store owners, deployed on Celo.**

BodegAgent lets a bodega owner collect payments in USDm, track credit tabs, generate invoices, and receive remittances from abroad — all in Spanish, no crypto knowledge required. It connects the **diaspora → Peru** remittance corridor to the Celo blockchain through natural conversation and quick-action shortcuts.

Built for the **Celo Onchain Agents Hackathon**.

**Live:** [bodegagent.vercel.app](https://bodegagent.vercel.app) · **Network:** Celo Mainnet · **ERC-8004 agentId:** [9396](https://agentscan.info/agents/2276ac18-9082-4d59-a890-7fb797be6a6b)

---

## The problem it solves

Peru receives ~$4B/year in remittances. 90% flows through traditional transfer services that charge 5–8% in fees with 1–3 day wait times. Bodega owners are key cash collection points in their neighborhoods — many families run a credit tab at the local store while waiting for the monthly remittance.

BodegAgent closes that loop:

```
Family member in USA/Spain          Bodega owner in Lima
   has USDT / USDC                         │
          │                                │
          │  compare_rates ─────────── best DEX
          │  (Mento vs Uniswap V3)         │
          │                                │
          └──────── USDm on-chain ────────▶│ receives in seconds
                    CIP-64 / gas in USDm   │
                                           ├── get_fx_rate → converts to PEN
                                           ├── settles the credit tab
                                           └── generates on-chain receipt
```

---

## What it can do

| Capability | Chat example |
|---|---|
| Collect payment in USDm | *"Charge Chino S/15 for 2 kilos of rice"* |
| Check wallet balance | *"Show my balance"* |
| Generate invoice with deeplink | *"Invoice for Rosa: 3 sodas at S/3, due Friday"* |
| Log a credit tab (fiado) | *"Note that Lucho took S/20 of groceries on credit"* |
| Settle a credit tab | *"Lucho just paid his tab"* |
| Debt reminder | *"Remind Pedro he owes S/40"* |
| Live exchange rate | *"How much is S/200 in USDm right now?"* |
| Compare DEXs | *"Which DEX gives me more USDm for 50 USDC?"* |
| Receive remittance | *"Receive payment from abroad"* |
| Save a contact | *"Save Rosa's address 0x..."* |

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 — App Router |
| AI | Vercel AI SDK v6 + Claude Sonnet 4 / Haiku 4.5 (cost routing) |
| Blockchain | viem v2 — **Celo Mainnet** (Sepolia supported for dev) |
| Stablecoin | USDm (Mento Dollar) — 18 decimals |
| Gas | CIP-64 `feeCurrency` — gas in USDm, no CELO needed |
| DEX quotes | Uniswap V3 QuoterV2 on-chain (mainnet) |
| FX aggregator | DefiLlama `coins.llama.fi` |
| Fiat FX | `open.er-api.com` — live USD/PEN rate |
| Wallet | MiniPay · MetaMask · Embedded (viem `generatePrivateKey`) |
| WhatsApp | Kapso API (`api.kapso.ai`) |
| Agent identity | ERC-8004 Identity Registry |
| Styling | Tailwind CSS v4 |
| Deploy | Vercel |

---

## Project structure

```
app/
  page.tsx                    ← Landing page (remittance narrative)
  chat/page.tsx               ← Chat page with hybrid quick-action UI
  dashboard/page.tsx          ← Transaction history + debtors
  pagar/[address]/page.tsx    ← Payment portal for family abroad
  api/
    chat/route.ts             ← Vercel AI SDK streamText endpoint (model routing)
    transactions/route.ts     ← Reads USDm transfers from Celo
    whatsapp/route.ts         ← Kapso WhatsApp webhook handler
lib/
  celo.ts                     ← viem clients, network config, ERC-8004
  agent-wallet.ts             ← sendCUSD (CIP-64), ERC-8004, getLogs
  tools.ts                    ← 9 agent tools
  fx.ts                       ← Live USD/PEN rate (open.er-api.com, 1h cache)
  dex-rates.ts                ← Mento vs Uniswap V3 rate comparison
  use-fiado.ts                ← Credit tab state hook (localStorage)
  wallet-context.tsx          ← React context: MiniPay / injected / embedded
components/
  Chat.tsx                    ← Full chat UI + contacts agenda
  QuickActions.tsx            ← Quick-action bar: Cobrar, Saldo, Fiado sheets
  TxHistory.tsx               ← Transaction history table
  DebtCard.tsx                ← Debtor card
scripts/
  register-erc8004.mjs        ← One-time ERC-8004 agent registration script
```

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/Gabrululu/BodegAgent.git
cd BodegAgent
pnpm install
```

### 2. Environment variables

```bash
cp .env.local.example .env.local
```

```env
# Anthropic API key (Claude)
ANTHROPIC_API_KEY=sk-ant-...

# Agent private key — server-side only, never expose to the client
AGENT_PRIVATE_KEY=abc123...

# Network: "mainnet" | "sepolia" (testnet)
NEXT_PUBLIC_NETWORK=mainnet

# Agent wallet public address (shown in chat header)
NEXT_PUBLIC_AGENT_ADDRESS=0x...

# Platform wallet — receives the 0.5% service fee on remittances
# Leave empty to disable fee collection
NEXT_PUBLIC_PLATFORM_ADDRESS=0x...

# WhatsApp via Kapso (https://kapso.com)
# Webhook URL to set in Kapso dashboard: https://your-domain.vercel.app/api/whatsapp
KAPSO_API_KEY=
KAPSO_PHONE_NUMBER_ID=

# PEN/USDm rate fallback if open.er-api.com is unavailable
PEN_TO_CUSD_RATE=3.43
```

> **Security:** `AGENT_PRIVATE_KEY` is a real private key. Use a dedicated wallet and never commit `.env.local`.

### 3. Fund the agent wallet

The agent wallet needs USDm on Celo Mainnet to send payments (CIP-64 gas). Acquire USDm via [Mento](https://app.mento.org) or any Celo DEX. For development on Sepolia, use the [Celo Sepolia faucet](https://faucet.celo.org/celo-sepolia).

### 4. Register the agent identity (ERC-8004)

Run the one-time registration script to mint the agent's on-chain identity NFT:

```bash
node --env-file=.env.local scripts/register-erc8004.mjs
```

The script builds a `data:` URI metadata payload (no IPFS upload needed), calls the ERC-8004 Identity Registry, waits for the receipt, and prints the `agentId`. Save the agentId — it is used for hackathon submissions and agentscan ranking.

**BodegAgent on Celo Mainnet:** agentId `9396` · [agentscan.info/agents/2276ac18-9082-4d59-a890-7fb797be6a6b](https://agentscan.info/agents/2276ac18-9082-4d59-a890-7fb797be6a6b)

### 5. Start development server

```bash
pnpm dev
```

- Chat: http://localhost:3000/chat
- Dashboard: http://localhost:3000/dashboard
- Payment portal: http://localhost:3000/pagar/0x... *(any Celo address)*

---

## Agent tools

The agent has 9 tools built with Vercel AI SDK v6:

| Tool | What it does |
|---|---|
| `send_cusd` | Transfers USDm via ERC-20. Converts PEN→USDm using the live rate. Confirms amounts > 50 USDm. Rate-limit: 10 tx/hour. CIP-64. |
| `check_balance` | Returns the agent wallet's USDm and CELO balance. |
| `create_invoice` | Generates an invoice with product lines in PEN + USDm total + payment deeplink. |
| `check_pending_debts` | Reads Transfer events (~12h) from Celo to find received payments. |
| `remind_debtor` | Generates a debt reminder in Peruvian Spanish ready to share via WhatsApp. |
| `get_fx_rate` | Live USD/PEN rate from `open.er-api.com`. 1-hour cache. Env fallback. |
| `compare_rates` | Compares USDC→USDm quotes: DefiLlama (Mento + Celo) vs Uniswap V3 on-chain. Reports best route and difference in basis points. |
| `register_fiado` | Logs a credit tab entry: customer name, amount in PEN, description. Persisted client-side in localStorage. |
| `settle_fiado` | Marks a credit tab as settled when the customer pays. |

Two additional client-side tools are also available:

| Tool | What it does |
|---|---|
| `save_contact` | Saves a name → Celo address mapping to the bodega's contact agenda (localStorage). Resolved automatically in future sessions. |

---

## Hybrid UI — quick actions + agent

For routine daily operations, a bottom quick-action bar avoids the latency of the conversational interface:

| Button | Behavior |
|---|---|
| **💸 Cobrar** | Opens a numpad sheet with contact picker, memo field, and live fee preview. Submits directly to the agent. |
| **💰 Saldo** | Sends "Ver mi saldo" instantly — no typing required. |
| **📒 Fiado** | Opens the credit tab list. Shows pending tabs sorted by age, with "Remind" and "Settled ✓" actions per entry. Badge shows pending count. |

The conversational agent remains available for complex flows: remittances, multi-item invoices, DEX comparisons, and error recovery.

---

## Contacts agenda (persistent memory)

The agent has no memory between sessions by default. BodegAgent solves this with a client-side contacts agenda stored in `localStorage`:

- When the agent learns a contact's name and address (via `save_contact`), it is saved automatically.
- At the start of every new session, the full agenda is injected into the first message: `[Agenda: Chino=0x..., Rosa=0x...]`.
- The agent reads this context and resolves names to addresses without asking.

```
Session 1:
  User: "charge S/20 to Rosa, her address is 0xabc..."
  Agent: executes send_cusd + calls save_contact("Rosa", "0xabc...")
  → "Rosa" stored in localStorage

Session 2 (next day):
  [Agenda: Rosa=0xabc...] injected into first message
  User: "charge S/15 to Rosa"
  Agent: uses 0xabc... directly — no prompt needed
```

---

## Credit tab ledger (fiado)

The fiado (credit tab) system persists across sessions in `localStorage` under the key `bodeg:fiado`:

```typescript
type FiadoEntry = {
  id: string
  customerName: string
  customerAddress?: string
  amountPEN: number
  description: string
  createdAt: string
  settled: boolean
  settledAt?: string
  txHash?: string
}
```

- Created via the `register_fiado` tool (conversational) or logged manually.
- Settled via `settle_fiado` tool or the "Saldado ✓" button in the Fiado sheet.
- The chat detects `register_fiado` and `settle_fiado` tool results and syncs local state automatically.
- Tabs older than 7 days are highlighted in orange as overdue.

---

## Payment portal — `/pagar/[address]`

A standalone page for the **family member abroad** to send USDm directly to the bodega without using the agent chat.

### Flow

1. Bodega owner shares their link: `https://bodegagent.vercel.app/pagar/0x...`
2. Family member opens it, connects their wallet (MetaMask or MiniPay)
3. Enters the USDm amount — sees a live breakdown of the payment and service fee
4. Approves **two separate on-chain transactions**:
   - **Tx 1** — `amount` USDm → bodega address
   - **Tx 2** — `0.5% fee` USDm → platform address (`NEXT_PUBLIC_PLATFORM_ADDRESS`)
5. Both transaction hashes are shown with Blockscout links

> If `NEXT_PUBLIC_PLATFORM_ADDRESS` is empty, only Tx 1 is sent (no fee collected). If Tx 2 fails, Tx 1 already confirmed — the bodega always receives its payment.

### Business model

| Service | Traditional | BodegAgent |
|---|---|---|
| Remittance fee | 5–8% | **0.5%** |
| Settlement time | 1–3 days | ~5 seconds |
| Intermediaries | 2–4 | 0 |

---

## WhatsApp bot — Kapso

The agent is available as a WhatsApp bot via [Kapso](https://kapso.com), meeting bodega owners on the channel they already use daily.

### How it works

1. User sends a WhatsApp message to the business number
2. Kapso delivers it to `POST /api/whatsapp`
3. The webhook responds immediately with `{ ok: true }` (no timeout risk)
4. Claude Haiku 4.5 processes the message with all 9 tools available
5. The reply is sent back via `POST api.kapso.ai/meta/whatsapp/v24.0/{phoneNumberId}/messages`

Always uses **Claude Haiku** on WhatsApp for speed and cost efficiency (~4× cheaper than Sonnet).

### Setup

1. Create an account at [kapso.com](https://kapso.com) and connect a WhatsApp number
2. In the Kapso dashboard → Settings → Webhooks → set URL to:
   ```
   https://your-domain.vercel.app/api/whatsapp
   ```
3. Add to `.env.local`:
   ```env
   KAPSO_API_KEY=your_api_key
   KAPSO_PHONE_NUMBER_ID=your_phone_number_id
   ```

Conversation history (up to 5 exchanges) is kept in memory per phone number. For production persistence across cold starts, replace the in-memory `sessions` map with Vercel KV.

---

## AI cost routing

To reduce API costs, the chat endpoint selects the model based on message complexity:

| Query type | Model | Approx. cost |
|---|---|---|
| Simple (balance, FX rate, reminders) | `claude-haiku-4-5-20251001` | ~$0.001/exchange |
| Complex (payments, invoices, remittances, multi-turn) | `claude-sonnet-4-20250514` | ~$0.004/exchange |
| WhatsApp (all messages) | `claude-haiku-4-5-20251001` | ~$0.001/message |

Classification uses a regex of intent keywords (`cobra`, `factura`, `remesa`, `compare`, `0x...`, etc.) plus conversation length. This reduces average API cost by ~60% compared to always using Sonnet.

---

## Wallet — connection options

When opening the chat, the user picks a connection method:

| Option | How it works | When to use |
|---|---|---|
| **MiniPay** | Detected via `window.ethereum.isMiniPay`. Auto-connects on app open. | Users in Africa/LatAm on Opera Browser |
| **MetaMask / injected** | `eth_requestAccounts` on `window.ethereum`. Only shown when a wallet is installed. | Users with a browser wallet |
| **Temporary wallet** | `generatePrivateKey()` + `privateKeyToAccount()` from viem, persisted in `localStorage`. | Demo, quick testing |

> The temporary wallet is for demo only. Do not deposit real funds — the private key lives in the browser.

When the user is inside MiniPay:
- An "Add USDm" banner appears with a deeplink to `https://link.minipay.xyz/add_cash?tokens=USDm`
- A "MiniPay Rate" quick reply calls the custom `miniPay_getExchangeRate` method
- The wallet badge dropdown links directly to the MiniPay balance view and Blockscout

---

## Live FX and DEX routing

### PEN/USDm rate (`lib/fx.ts`)

- Source: `https://open.er-api.com/v6/latest/USD` (free, no API key)
- 1-hour in-memory cache
- Falls back to `PEN_TO_CUSD_RATE` env var if the API is unavailable
- All tools use this rate: `send_cusd`, `create_invoice`, `check_pending_debts`, `remind_debtor`, `register_fiado`

### DEX comparison (`lib/dex-rates.ts`)

Two sources queried in parallel:

**DefiLlama** (`coins.llama.fi`) — aggregated price across Mento, Uniswap, Curve, and all Celo pools. Available on mainnet and Sepolia.

**Uniswap V3 QuoterV2** — exact on-chain quote via `quoteExactInputSingle` across fee tiers 500 and 3000. Mainnet only.

---

## Celo-specific details

### Supported networks

| Network | Chain ID | Explorer | Default |
|---|---|---|---|
| **Celo Mainnet** | 42220 | https://celoscan.io | ✓ |
| Celo Sepolia | 11142220 | https://celo-sepolia.blockscout.com | |

### USDm contract addresses

| Network | Address |
|---|---|
| **Mainnet** | `0x765DE816845861e75A25fCA122bb6898B8B1282a` |
| Celo Sepolia | `0xEF4d55D6dE8e8d73232827Cd1e9b2F2dBb45bC80` |

> USDm (Mento Dollar) is the rebrand of cUSD. The token address also serves as the `feeCurrency` adapter for CIP-64 — no separate adapter contract needed.

### CIP-64 — gas in USDm

All agent transactions include `feeCurrency: usdmAddress`. The agent wallet pays gas in USDm and does not require a CELO balance. This is critical for MiniPay compatibility.

```typescript
await walletClient.writeContract({
  address: usdmAddress,
  abi: ERC20_ABI,
  functionName: 'transfer',
  args: [to, amount],
  feeCurrency: feeCurrencyAddress, // CIP-64
})
```

### ERC-8004 — agent identity

`lib/agent-wallet.ts` exposes `registerAgentERC8004(uri)` and `buildAgentMetadata(address, url)`. The registration script encodes the metadata as a `data:application/json;base64` URI so no IPFS upload is required:

```bash
node --env-file=.env.local scripts/register-erc8004.mjs
```

The script pays gas in native CELO and prints the `agentId` from the on-chain `Transfer` event once the transaction confirms.

**Identity Registry addresses:**
- Mainnet: `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`
- Celo Sepolia: `0x8004A818BFB912233c491871b3d84c89A494BD9e`

**BodegAgent registration:**
- Mainnet agentId: `9396` · tx [`0x019afa...`](https://celoscan.io/tx/0x019afa798824a6e8084ae39e358c6fec4c64fc84e5a76c03fe09617e48a6d4b5)
- [agentscan.info/agents/2276ac18-9082-4d59-a890-7fb797be6a6b](https://agentscan.info/agents/2276ac18-9082-4d59-a890-7fb797be6a6b)

### `eth_getLogs` limit

The public Celo RPC rejects log queries spanning more than 50,000 blocks (~14 hours). All tools use 43,200-block windows (~12 hours). For deeper history, use the [Blockscout REST API](https://celo.blockscout.com/api-docs) — no API key required.

---

## Deploy to Vercel

```bash
vercel deploy
```

Set all environment variables under **Settings → Environment Variables**. `AGENT_PRIVATE_KEY` and `KAPSO_API_KEY` must never have the `NEXT_PUBLIC_` prefix.

---

## License

MIT
