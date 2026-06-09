# BodegAgent

**Agente de pagos conversacional en USDm para bodegueros peruanos, desplegado en Celo.**

BodegAgent permite al dueño de una bodega cobrar en USDm, registrar fiado, generar facturas y recibir remesas desde el exterior — todo en español, sin entender crypto. Conecta el corredor de remesas **diáspora → Perú** con la blockchain de Celo a través de una conversación natural.

Construido para el **Onchain Agents Hackathon de Celo**.

---

## El problema que resuelve

Perú recibe ~$4B/año en remesas. El 90% pasa por servicios tradicionales de transferencia que cobran 5–8% de comisión con 1–3 días de espera. Los bodegueros son puntos de cobro clave en sus barrios — muchas familias fían en la bodega anticipando la remesa mensual.

BodegAgent cierra ese loop:

```
Familiar en EE.UU./España          Bodeguero en Lima
   tiene USDT / USDC                      │
          │                               │
          │  compare_rates ──────────── mejor DEX
          │  (Mento vs Uniswap V3)        │
          │                               │
          └──────── USDm on-chain ───────▶│ recibe en segundos
                    CIP-64 / gas en USDm  │
                                          ├── get_fx_rate → convierte a S/
                                          ├── salda el fiado
                                          └── genera recibo on-chain
```

---

## Qué puede hacer

| Capacidad | Ejemplo en chat |
|---|---|
| Cobrar en USDm | *"Cobra S/15 al Chino por 2 kilos de arroz"* |
| Ver saldo de la wallet | *"Ver mi saldo"* |
| Generar factura con deeplink | *"Factura para Rosa: 3 gaseosas a S/3, vence el viernes"* |
| Revisar pagos recibidos | *"Ver deudas pendientes"* |
| Recordatorio de deuda | *"Recuérdale a Pedro que debe S/40"* |
| Tasa de cambio en vivo | *"¿Cuánto es S/200 en USDm ahora?"* |
| Comparar DEXs | *"¿En qué DEX me dan más USDm por 50 USDC?"* |
| Recibir remesa | *"Recibir pago del extranjero"* |

---

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16 — App Router |
| AI | Vercel AI SDK v6 + `claude-sonnet-4-20250514` |
| Blockchain | viem v2 — Celo Mainnet / **Celo Sepolia** |
| Stablecoin | USDm (Mento Dollar) — 18 decimals |
| Gas | CIP-64 `feeCurrency` — gas en USDm, sin CELO |
| DEX quotes | Uniswap V3 QuoterV2 on-chain (mainnet) |
| FX agregado | DefiLlama `coins.llama.fi` |
| FX fiat | `open.er-api.com` — USD/PEN en vivo |
| Wallet | MiniPay · MetaMask · Embedded (viem `generatePrivateKey`) |
| Agent identity | ERC-8004 Identity Registry |
| Styling | Tailwind CSS v4 |
| Deploy | Vercel |

---

## Estructura del proyecto

```
app/
  page.tsx                    ← Landing page (narrativa de remesas)
  chat/page.tsx               ← Página del chat
  dashboard/page.tsx          ← Historial de transacciones + deudores
  api/
    chat/route.ts             ← Vercel AI SDK streamText endpoint
    transactions/route.ts     ← Lee transfers de USDm desde Celo
lib/
  celo.ts                     ← viem clients, config de red, ERC-8004
  agent-wallet.ts             ← sendCUSD (CIP-64), ERC-8004, getLogs
  tools.ts                    ← 7 herramientas del agente
  fx.ts                       ← Tasa USD/PEN en vivo (open.er-api.com, cache 1h)
  dex-rates.ts                ← Comparación Mento vs Uniswap V3
  wallet-context.tsx          ← React context: MiniPay / injected / embedded
components/
  Chat.tsx                    ← UI completa del chat
  TxHistory.tsx               ← Tabla de historial de transacciones
  DebtCard.tsx                ← Tarjeta de deudor
```

---

## Instalación

### 1. Clonar e instalar

```bash
git clone https://github.com/your-username/BodegAgent.git
cd BodegAgent
pnpm install
```

### 2. Variables de entorno

```bash
cp .env.local.example .env.local
```

```env
# API de Anthropic (Claude)
ANTHROPIC_API_KEY=sk-ant-...

# Clave privada del agente — solo server-side, nunca exponer al cliente
AGENT_PRIVATE_KEY=abc123...

# Red: "sepolia" (testnet activa) | "mainnet"
NEXT_PUBLIC_NETWORK=sepolia

# Dirección pública de la wallet del agente (mostrada en el header del chat)
NEXT_PUBLIC_AGENT_ADDRESS=0x...

# Fallback de tasa PEN/USDm si open.er-api.com no está disponible
# El agente obtiene la tasa en vivo automáticamente — este valor es el respaldo
PEN_TO_CUSD_RATE=3.7
```

> **Seguridad:** `AGENT_PRIVATE_KEY` es una clave real. Usa una wallet nueva con solo fondos de testnet. Nunca hagas commit de `.env.local`.

### 3. Fondear la wallet del agente (testnet)

- Faucet Celo Sepolia: https://faucet.celo.org/celo-sepolia

### 4. Levantar en desarrollo

```bash
pnpm dev
```

- Chat: http://localhost:3000/chat
- Dashboard: http://localhost:3000/dashboard

---

## Herramientas del agente

El agente tiene 7 tools construidas con Vercel AI SDK v6:

| Tool | Qué hace |
|---|---|
| `send_cusd` | Transfiere USDm vía ERC-20. Convierte PEN→USDm con tasa en vivo. Pide confirmación para montos > 50 USDm. Rate-limit: 10 tx/hora. Usa CIP-64. |
| `check_balance` | Devuelve el saldo USDm y CELO de la wallet del agente. |
| `create_invoice` | Genera factura con líneas de productos en PEN + total en USDm + deeplink de pago. |
| `check_pending_debts` | Lee eventos Transfer (~12h) de Celo para encontrar pagos recibidos. |
| `remind_debtor` | Genera un recordatorio en español peruano para enviar por WhatsApp. |
| `get_fx_rate` | Tasa USD/PEN en vivo desde `open.er-api.com`. Cache de 1 hora. Fallback a variable de entorno. |
| `compare_rates` | Compara la cotización USDC→USDm entre DefiLlama (Mento + mercado Celo) y Uniswap V3 on-chain. Indica cuál da más USDm y la diferencia en basis points. |

---

## Wallet — opciones de conexión

Al abrir el chat, el usuario elige cómo conectarse:

| Opción | Cómo funciona | Cuándo usar |
|---|---|---|
| **MiniPay** | Se detecta via `window.ethereum.isMiniPay`. Auto-conecta al abrir la app. | Usuarios en Africa/LatAm con Opera Browser |
| **MetaMask / injected** | `eth_requestAccounts` sobre `window.ethereum`. Aparece solo si hay wallet instalada. | Usuarios con wallet de navegador |
| **Wallet temporal** | `generatePrivateKey()` + `privateKeyToAccount()` de viem, persiste en `localStorage`. | Demo, pruebas rápidas |

> La wallet temporal es solo para demo. No deposites fondos reales — la clave privada vive en el navegador.

Si el usuario está dentro de MiniPay, se muestra:
- Un banner "Recarga USDm" con deeplink a `https://link.minipay.xyz/add_cash?tokens=USDm`
- Un quick reply "Tasa MiniPay" que llama al método custom `miniPay_getExchangeRate`
- Menú con link directo al saldo en MiniPay y a Blockscout

La dirección conectada se inyecta automáticamente en el primer mensaje al agente para que pueda referenciarla.

---

## FX en vivo y routing entre DEXs

### Tasa PEN/USDm (`lib/fx.ts`)

```typescript
import { getLivePenRate } from '@/lib/fx'
const rate = await getLivePenRate() // USD → PEN desde open.er-api.com
```

- Fuente: `https://open.er-api.com/v6/latest/USD` (gratuito, sin API key)
- Cache en memoria de 1 hora — Next.js `next: { revalidate: 3600 }`
- Fallback a `PEN_TO_CUSD_RATE` del `.env` si la API no responde
- Todos los tools (`send_cusd`, `create_invoice`, `check_pending_debts`, `remind_debtor`) usan esta tasa

### Comparación de DEXs (`lib/dex-rates.ts`)

```typescript
import { getBestDexRate } from '@/lib/dex-rates'
const result = await getBestDexRate(100) // Cotiza 100 USDC → USDm
```

Dos fuentes en paralelo:

**DefiLlama** (`coins.llama.fi`) — precio agregado:
- Agrega precios de Mento, Uniswap, Curve y todos los pools de Celo
- Disponible en mainnet y Sepolia
- `USDC/USDm rate = usdc_price_usd / usdm_price_usd`

**Uniswap V3 QuoterV2** — cotización on-chain:
- `quoteExactInputSingle` con 100 USDC en fee tiers 500 (0.05%) y 3000 (0.3%)
- Solo mainnet. En Sepolia retorna `available: false`
- Cotización exacta incluyendo spread real del pool

El resultado incluye cuál da más USDm y la diferencia en basis points.

---

## Detalles específicos de Celo

### Redes soportadas

| Red | Chain ID | Explorer | Default |
|---|---|---|---|
| **Celo Sepolia** | 11142220 | https://celo-sepolia.blockscout.com | ✓ |
| Celo Mainnet | 42220 | https://celoscan.io | |

### Contratos USDm

| Red | Dirección |
|---|---|
| **Celo Sepolia** | `0xEF4d55D6dE8e8d73232827Cd1e9b2F2dBb45bC80` |
| Mainnet | `0x765DE816845861e75A25fCA122bb6898B8B1282a` |

> USDm (Mento Dollar) es el rebrand de cUSD. La dirección del token sirve también como adaptador `feeCurrency` para CIP-64 — no se necesita un adaptador separado.

### CIP-64 — gas en USDm

Todas las transacciones incluyen `feeCurrency: usdmAddress`. La wallet del agente paga el gas en USDm y no necesita saldo CELO para operar. Esto es crítico para compatibilidad con MiniPay.

```typescript
await walletClient.writeContract({
  address: usdmAddress,
  abi: ERC20_ABI,
  functionName: 'transfer',
  args: [to, amount],
  feeCurrency: feeCurrencyAddress, // CIP-64
})
```

### ERC-8004 — identidad del agente

`lib/agent-wallet.ts` incluye helpers para registrar el agente on-chain:

```typescript
import { registerAgentERC8004, buildAgentMetadata } from '@/lib/agent-wallet'

const metadata = buildAgentMetadata(agentAddress, 'https://bodegagent.vercel.app')
const txHash = await registerAgentERC8004('ipfs://QmYourCID...')
```

El `agentURI` debe ser content-addressed (`ipfs://` o `data:`) para pasar los checks del validador ERC-8004.

**Identity Registry:**
- Mainnet: `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`
- Celo Sepolia: `0x8004A818BFB912233c491871b3d84c89A494BD9e`

### Límite de `eth_getLogs`

El RPC público de Celo rechaza queries de logs de más de 50.000 bloques (~14 horas). Los tools usan ventanas de 43.200 bloques (~12 horas). Para historial más profundo usar la [Blockscout REST API](https://celo.blockscout.com/api-docs) — sin API key.

---

## Deploy en Vercel

```bash
vercel deploy
```

Configura las variables de entorno en **Settings → Environment Variables**. `AGENT_PRIVATE_KEY` nunca debe tener prefijo `NEXT_PUBLIC_`.

---

## Licencia

MIT
