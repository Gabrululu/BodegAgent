import { z } from 'zod'
import { formatUnits } from 'viem'
import { getAgentAddress, publicClient, usdmAddress, isAddress } from './celo'
import { getUSDmBalance, getCELOBalance, sendCUSD } from './agent-wallet'
import { getLivePenRate, getFxRateInfo } from './fx'
import { getBestDexRate } from './dex-rates'

const TRANSFER_EVENT = {
  type: 'event' as const,
  name: 'Transfer',
  inputs: [
    { name: 'from', type: 'address', indexed: true },
    { name: 'to', type: 'address', indexed: true },
    { name: 'value', type: 'uint256', indexed: false },
  ],
}

export const tools = {
  send_cusd: {
    description:
      'Envía USDm (stablecoin de dólar de Celo, antes llamado cUSD) a una dirección Celo. Siempre confirma monto y destinatario antes de ejecutar. Si el monto supera 50 USDm, solicita confirmación explícita del usuario.',
    inputSchema: z.object({
      to: z.string().describe('Dirección Celo del destinatario (0x...)'),
      amount: z.number().positive().describe('Monto a enviar'),
      currency: z.enum(['PEN', 'USDm']).describe('Moneda en que está expresado el monto (USDm = stablecoin de dólar en Celo)'),
      memo: z.string().describe('Descripción breve del pago (ej: "2 kilos de arroz")'),
      confirmed: z
        .boolean()
        .optional()
        .describe('true si el usuario ya confirmó un pago mayor a 50 cUSD'),
    }),
    execute: async ({
      to,
      amount,
      currency,
      memo,
      confirmed,
    }: {
      to: string
      amount: number
      currency: 'PEN' | 'USDm'
      memo: string
      confirmed?: boolean
    }) => {
      if (!isAddress(to)) {
        return { error: 'La dirección de destino no es válida. Pide al cliente su dirección Celo correcta.' }
      }

      const rate = await getLivePenRate()
      const amountUSDm = currency === 'PEN' ? amount / rate : amount
      const amountPEN = currency === 'PEN' ? amount : amount * rate

      if (amountUSDm > 50 && !confirmed) {
        return {
          requiresConfirmation: true,
          amountCUSD: amountUSDm.toFixed(2), // field kept for UI compat
          amountPEN: amountPEN.toFixed(2),
          to,
          memo,
          message: `Este pago es de ${amountUSDm.toFixed(2)} USDm (S/${amountPEN.toFixed(2)}). Por ser un monto alto, ¿confirmas el envío a ${to.slice(0, 6)}...${to.slice(-4)}?`,
        }
      }

      try {
        const txHash = await sendCUSD(to, amountUSDm)
        return {
          success: true,
          txHash,
          amountCUSD: amountUSDm.toFixed(2), // field kept for UI compat
          amountPEN: amountPEN.toFixed(2),
          to,
          memo,
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error desconocido'
        return { error: `No se pudo enviar: ${msg}` }
      }
    },
  },

  check_balance: {
    description: 'Consulta el saldo de USDm (stablecoin de dólar) y CELO de la wallet del agente',
    inputSchema: z.object({}),
    execute: async () => {
      const address = getAgentAddress()
      if (!address) {
        return { error: 'La wallet del agente no está configurada (falta AGENT_PRIVATE_KEY o NEXT_PUBLIC_AGENT_ADDRESS).' }
      }

      try {
        const [usdmBal, celoBal] = await Promise.all([
          getUSDmBalance(address as `0x${string}`),
          getCELOBalance(address as `0x${string}`),
        ])
        return {
          cusd: parseFloat(formatUnits(usdmBal, 18)).toFixed(2), // field kept as "cusd" for UI compat
          celo: parseFloat(formatUnits(celoBal, 18)).toFixed(4),
          address,
        }
      } catch {
        return { error: 'No se pudo leer el saldo. Verifica la conexión a la red Celo.' }
      }
    },
  },

  create_invoice: {
    description: 'Crea una factura para un cliente con detalle de productos y total en PEN y cUSD',
    inputSchema: z.object({
      customerName: z.string().describe('Nombre del cliente'),
      customerAddress: z.string().optional().describe('Dirección Celo del cliente (opcional)'),
      items: z
        .array(
          z.object({
            name: z.string().describe('Nombre del producto'),
            qty: z.number().positive().describe('Cantidad'),
            priceSOLES: z.number().positive().describe('Precio unitario en soles (PEN)'),
          })
        )
        .describe('Lista de productos de la factura'),
      dueDate: z.string().describe('Fecha límite de pago (DD/MM/YYYY)'),
    }),
    execute: async ({
      customerName,
      customerAddress,
      items,
      dueDate,
    }: {
      customerName: string
      customerAddress?: string
      items: { name: string; qty: number; priceSOLES: number }[]
      dueDate: string
    }) => {
      const rate = await getLivePenRate()
      const totalPEN = items.reduce((sum, i) => sum + i.qty * i.priceSOLES, 0)
      const totalCUSD = totalPEN / rate
      const invoiceId = Date.now().toString()

      return {
        id: invoiceId,
        customerName,
        customerAddress: customerAddress ?? '',
        items: items.map(i => ({
          ...i,
          subtotalPEN: (i.qty * i.priceSOLES).toFixed(2),
        })),
        totalPEN: totalPEN.toFixed(2),
        totalCUSD: totalCUSD.toFixed(2),
        dueDate,
        deeplink: `https://bodegagent.vercel.app/pay/${invoiceId}`,
        createdAt: new Date().toISOString(),
      }
    },
  },

  check_pending_debts: {
    description:
      'Verifica pagos recibidos en los últimos 3 días leyendo eventos Transfer de cUSD en Celo',
    inputSchema: z.object({
      customerAddress: z
        .string()
        .optional()
        .describe('Filtra por dirección específica del cliente'),
    }),
    execute: async ({ customerAddress }: { customerAddress?: string }) => {
      const agentAddress = getAgentAddress()
      if (!agentAddress) {
        return { debts: [], error: 'Wallet del agente no configurada.' }
      }

      try {
        const currentBlock = await publicClient.getBlockNumber()
        const fromBlock = currentBlock > 50_000n ? currentBlock - 50_000n : 0n

        const received = await publicClient.getLogs({
          address: usdmAddress,
          event: TRANSFER_EVENT,
          args: {
            to: agentAddress as `0x${string}`,
            ...(customerAddress && isAddress(customerAddress)
              ? { from: customerAddress as `0x${string}` }
              : {}),
          },
          fromBlock,
          toBlock: 'latest',
        })

        // Group by sender address
        const byCustomer: Record<string, { total: bigint; count: number }> = {}
        for (const log of received) {
          const args = log.args as { from: string; value: bigint }
          if (!byCustomer[args.from]) byCustomer[args.from] = { total: 0n, count: 0 }
          byCustomer[args.from].total += args.value
          byCustomer[args.from].count++
        }

        const rate = await getLivePenRate()
        const debts = Object.entries(byCustomer).map(([addr, data]) => ({
          customer: addr,
          shortAddress: `${addr.slice(0, 6)}...${addr.slice(-4)}`,
          totalReceivedCUSD: parseFloat(formatUnits(data.total, 18)).toFixed(2),
          totalReceivedPEN: (
            parseFloat(formatUnits(data.total, 18)) * rate
          ).toFixed(2),
          txCount: data.count,
        }))

        return { debts, agentAddress, blocksScanned: '~50 000 (≈3 días)' }
      } catch {
        return { debts: [], error: 'Error al leer la blockchain. Intenta de nuevo.' }
      }
    },
  },

  get_fx_rate: {
    description:
      'Obtiene la tasa de cambio USD/PEN en vivo desde el mercado. Úsalo antes de cualquier conversión soles↔USDm para dar la tasa exacta al cliente.',
    inputSchema: z.object({}),
    execute: async () => getFxRateInfo(),
  },

  compare_rates: {
    description:
      'Compara el tipo de cambio USDC→USDm entre Mento/mercado Celo (precio agregado DefiLlama) y Uniswap V3 (cotización on-chain), e indica cuál da más USDm por el mismo USDC. Útil cuando un cliente paga en USDC y el bodeguero quiere saber el mejor lugar para convertir.',
    inputSchema: z.object({
      amountUSDC: z
        .number()
        .positive()
        .default(100)
        .describe('Monto en USDC a cotizar (por defecto 100)'),
    }),
    execute: async ({ amountUSDC }: { amountUSDC: number }) =>
      getBestDexRate(amountUSDC),
  },

  register_fiado: {
    description:
      'Registra en la libreta de fiado que un cliente tomó mercadería a crédito. Úsalo cuando el bodeguero diga que alguien fió, pidió prestado o se llevó algo sin pagar.',
    inputSchema: z.object({
      customerName: z.string().describe('Nombre o apodo del cliente'),
      customerAddress: z.string().optional().describe('Dirección Celo del cliente (opcional)'),
      amountPEN: z.number().positive().describe('Monto en soles'),
      description: z.string().describe('Qué se filó (ej: "2kg arroz, 1 gaseosa")'),
    }),
    execute: async ({
      customerName, customerAddress, amountPEN, description,
    }: { customerName: string; customerAddress?: string; amountPEN: number; description: string }) => {
      const rate = await getLivePenRate()
      return {
        registered: true,
        customerName,
        customerAddress: customerAddress ?? null,
        amountPEN,
        amountUSDm: (amountPEN / rate).toFixed(2),
        description,
        message: `Anotado: ${customerName} debe S/${amountPEN.toFixed(2)} por ${description}.`,
      }
    },
  },

  settle_fiado: {
    description: 'Marca un fiado como saldado cuando el cliente paga.',
    inputSchema: z.object({
      customerName: z.string().describe('Nombre del cliente que salda la deuda'),
      amountPEN: z.number().positive().describe('Monto saldado en soles'),
    }),
    execute: async ({ customerName, amountPEN }: { customerName: string; amountPEN: number }) => ({
      settled: true,
      customerName,
      amountPEN,
      message: `Saldado ✓: ${customerName} pagó S/${amountPEN.toFixed(2)}.`,
    }),
  },

  save_contact: {
    description:
      'Guarda un contacto (nombre → dirección Celo) en la agenda del bodeguero para que no tenga que dictar la dirección de nuevo en el futuro. Úsalo siempre que el usuario proporcione el nombre y la dirección de alguien.',
    inputSchema: z.object({
      name: z.string().describe('Nombre o apodo del contacto (ej: "el Chino", "Rosa", "señora del mercado")'),
      address: z.string().describe('Dirección Celo del contacto (0x...)'),
    }),
    execute: async ({ name, address }: { name: string; address: string }) => {
      if (!isAddress(address)) {
        return { saved: false, error: 'Dirección inválida — no se guardó el contacto.' }
      }
      return {
        saved: true,
        name,
        address,
        message: `Guardé a ${name} (${address.slice(0, 6)}…${address.slice(-4)}) en tu agenda.`,
      }
    },
  },

  remind_debtor: {
    description:
      'Genera un mensaje de recordatorio amable en español para un cliente que debe dinero',
    inputSchema: z.object({
      customerName: z.string().describe('Nombre del cliente deudor'),
      amountPEN: z.number().positive().describe('Monto adeudado en soles'),
      daysSince: z.number().nonnegative().describe('Días desde que se registró la deuda'),
    }),
    execute: async ({
      customerName,
      amountPEN,
      daysSince,
    }: {
      customerName: string
      amountPEN: number
      daysSince: number
    }) => {
      const amountCUSD = (amountPEN / (await getLivePenRate())).toFixed(2)
      const contexto =
        daysSince > 14
          ? 'ya va un buen tiempo'
          : daysSince > 7
          ? 'ya pasó una semana'
          : 'hace unos díitas'

      const message =
        `Hola ${customerName}! Soy de la bodega, por acá para recordarte ` +
        `que tienes un pendientito de S/${amountPEN.toFixed(2)} — ${contexto} ya. ` +
        `Cuando puedas nos cuadras, ¿sí? Gracias y que te vaya bien! 🙏`

      return { message, customerName, amountPEN, amountCUSD, daysSince }
    },
  },
}
