'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { encodeFunctionData, parseUnits } from 'viem'

const NETWORK = process.env.NEXT_PUBLIC_NETWORK ?? 'sepolia'
const USDM = NETWORK === 'mainnet'
  ? '0x765DE816845861e75A25fCA122bb6898B8B1282a'
  : '0xEF4d55D6dE8e8d73232827Cd1e9b2F2dBb45bC80'
const CHAIN_ID = NETWORK === 'mainnet' ? 42220 : 11142220
const EXPLORER = NETWORK === 'mainnet' ? 'https://celoscan.io' : 'https://celo-sepolia.blockscout.com'
const PLATFORM_ADDRESS = process.env.NEXT_PUBLIC_PLATFORM_ADDRESS ?? ''
const FEE_RATE = 0.005

const TRANSFER_ABI = [{
  name: 'transfer', type: 'function',
  inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }],
  outputs: [{ name: '', type: 'bool' }],
}] as const

type Ethereum = {
  isMiniPay?: boolean
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
}

function getEth(): Ethereum | undefined {
  return (window as Window & { ethereum?: Ethereum }).ethereum
}

function encodeTransfer(to: string, amountUSDm: number) {
  return encodeFunctionData({
    abi: TRANSFER_ABI,
    functionName: 'transfer',
    args: [to as `0x${string}`, parseUnits(amountUSDm.toFixed(18), 18)],
  })
}

export default function PagarPage({ params }: { params: Promise<{ address: string }> }) {
  const { address: toAddress } = use(params)

  const [sender, setSender] = useState<string | null>(null)
  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState('')
  const [status, setStatus] = useState<'idle' | 'connecting' | 'tx1' | 'tx2' | 'done' | 'error'>('idle')
  const [txMain, setTxMain] = useState<string | null>(null)
  const [txFee, setTxFee] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  const net = +(parseFloat(amount) || 0).toFixed(4)
  const fee = +(net * FEE_RATE).toFixed(4)
  const collectFee = PLATFORM_ADDRESS && fee > 0

  async function connect() {
    setStatus('connecting')
    try {
      const eth = getEth()
      if (!eth) throw new Error('No hay wallet detectada. Instala MetaMask o abre en Opera (MiniPay).')
      const accounts = await eth.request({ method: 'eth_requestAccounts' }) as string[]
      setSender(accounts[0])
      setStatus('idle')
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Error al conectar')
      setStatus('error')
    }
  }

  async function send() {
    if (!sender || net <= 0) return
    const eth = getEth()
    if (!eth) { setErrorMsg('No hay wallet'); setStatus('error'); return }

    setErrorMsg('')

    // Switch to Celo
    try {
      await eth.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${CHAIN_ID.toString(16)}` }],
      })
    } catch {}

    try {
      // ── Tx 1: pago principal a la bodega ──
      setStatus('tx1')
      const hash1 = await eth.request({
        method: 'eth_sendTransaction',
        params: [{ from: sender, to: USDM, data: encodeTransfer(toAddress, net) }],
      }) as string
      setTxMain(hash1)

      // ── Tx 2: fee de servicio a la plataforma ──
      if (collectFee) {
        setStatus('tx2')
        try {
          const hash2 = await eth.request({
            method: 'eth_sendTransaction',
            params: [{ from: sender, to: USDM, data: encodeTransfer(PLATFORM_ADDRESS, fee) }],
          }) as string
          setTxFee(hash2)
        } catch {
          // Fee tx failed — payment already sent, just skip fee
        }
      }

      setStatus('done')
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Error al enviar')
      setStatus('error')
    }
  }

  const isSending = status === 'tx1' || status === 'tx2'

  return (
    <div className="min-h-screen bg-ink text-text flex flex-col">

      {/* Header */}
      <header className="border-b border-line bg-surface px-6 py-4">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="6" fill="#FCFF52"/>
              <path d="M6 22 L6 14 L9 11 L23 11 L26 14 L26 22 Z" fill="#1C1C1C"/>
              <rect x="13" y="16" width="6" height="6" fill="#FCFF52"/>
              <rect x="8" y="14" width="4" height="4" fill="#FCFF52"/>
              <rect x="20" y="14" width="4" height="4" fill="#FCFF52"/>
              <circle cx="25" cy="9" r="3" fill="#35D07F"/>
            </svg>
            <span className="font-mono text-xs font-bold text-text">BODEGAGENT</span>
          </Link>
          <span className="font-mono text-[10px] text-muted">Portal de pagos</span>
        </div>
      </header>

      <main className="flex-1 px-6 py-8">
        <div className="mx-auto max-w-md space-y-6">

          {/* Destination */}
          <div className="rounded-xl border border-line bg-surface p-5">
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted mb-2">
              Bodega destinataria
            </p>
            <p className="font-mono text-xs text-sub break-all">{toAddress}</p>
            <a
              href={`${EXPLORER}/address/${toAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1.5 inline-flex items-center gap-1 font-mono text-[10px] text-muted hover:text-yellow transition-colors"
            >
              Ver en explorer ↗
            </a>
          </div>

          {status === 'done' ? (
            /* ── Success ── */
            <div className="rounded-xl border border-green/30 bg-green/5 p-6 text-center space-y-4">
              <p className="text-4xl">✅</p>
              <div>
                <h2 className="text-lg font-bold text-text">¡Pago enviado!</h2>
                <p className="mt-1 text-sm text-muted">{net} USDm llegaron a la bodega</p>
              </div>
              <div className="space-y-2 text-left">
                {txMain && (
                  <a
                    href={`${EXPLORER}/tx/${txMain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-lg border border-green/20 bg-ink px-3 py-2.5 font-mono text-[10px] text-green hover:opacity-75 transition-opacity"
                  >
                    <span>Pago principal · {net} USDm</span>
                    <span>{txMain.slice(0, 8)}… ↗</span>
                  </a>
                )}
                {txFee && (
                  <a
                    href={`${EXPLORER}/tx/${txFee}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-lg border border-line bg-ink px-3 py-2.5 font-mono text-[10px] text-muted hover:opacity-75 transition-opacity"
                  >
                    <span>Fee servicio · {fee} USDm</span>
                    <span>{txFee.slice(0, 8)}… ↗</span>
                  </a>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Amount */}
              <div className="space-y-3">
                <label className="block font-mono text-[9px] uppercase tracking-[0.18em] text-muted">
                  Monto en USDm
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-2xl font-mono font-bold text-text placeholder:text-overlay focus:border-yellow/50 focus:outline-none"
                />

                {net > 0 && (
                  <div className="rounded-lg border border-line bg-raised px-4 py-3 space-y-1.5 font-mono text-xs">
                    <div className="flex justify-between text-muted">
                      <span>Pago a la bodega</span>
                      <span className="text-text">{net} USDm</span>
                    </div>
                    {collectFee && (
                      <div className="flex justify-between text-muted">
                        <span>Fee de servicio (0.5%)</span>
                        <span className="text-orange/80">{fee} USDm</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold border-t border-line pt-1.5 mt-0.5">
                      <span className="text-muted">Total que apruebas</span>
                      <span className="text-text">{collectFee ? (net + fee).toFixed(4) : net} USDm</span>
                    </div>
                    {collectFee && (
                      <p className="text-[9px] text-muted pt-0.5">
                        2 transacciones · gas pagado en USDm (CIP-64)
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Memo */}
              <input
                type="text"
                value={memo}
                onChange={e => setMemo(e.target.value)}
                placeholder="Concepto opcional: pago fiado, remesa familiar…"
                className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm text-text placeholder:text-muted focus:border-yellow/50 focus:outline-none"
              />

              {/* Error */}
              {status === 'error' && (
                <div className="rounded-lg border border-orange/30 bg-orange/5 px-4 py-3">
                  <p className="font-mono text-xs text-orange">{errorMsg}</p>
                </div>
              )}

              {/* Progress steps while sending */}
              {isSending && (
                <div className="rounded-lg border border-line bg-raised px-4 py-3 space-y-2">
                  <div className={`flex items-center gap-2 text-xs ${status === 'tx1' ? 'text-yellow' : 'text-green'}`}>
                    <span>{status === 'tx1' ? '⏳' : '✓'}</span>
                    <span>Tx 1: Pago a la bodega ({net} USDm)</span>
                  </div>
                  {collectFee && (
                    <div className={`flex items-center gap-2 text-xs ${status === 'tx2' ? 'text-yellow' : 'text-muted'}`}>
                      <span>{status === 'tx2' ? '⏳' : '○'}</span>
                      <span>Tx 2: Fee de servicio ({fee} USDm)</span>
                    </div>
                  )}
                </div>
              )}

              {/* CTA */}
              {!sender ? (
                <button
                  onClick={connect}
                  disabled={status === 'connecting'}
                  className="w-full rounded-full bg-yellow py-4 text-sm font-bold text-ink transition-opacity hover:opacity-85 disabled:opacity-50"
                >
                  {status === 'connecting' ? 'Conectando…' : 'Conectar wallet →'}
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 rounded-lg border border-line bg-raised px-3 py-2">
                    <span className="h-2 w-2 rounded-full bg-green" />
                    <span className="font-mono text-[10px] text-sub">
                      {sender.slice(0, 8)}…{sender.slice(-6)}
                    </span>
                    <button
                      onClick={() => setSender(null)}
                      className="ml-auto font-mono text-[10px] text-muted hover:text-text"
                    >
                      cambiar
                    </button>
                  </div>
                  <button
                    onClick={send}
                    disabled={isSending || net <= 0}
                    className="w-full rounded-full bg-yellow py-4 text-sm font-bold text-ink transition-opacity hover:opacity-85 disabled:opacity-30"
                  >
                    {status === 'tx1'
                      ? 'Aprueba el pago en tu wallet…'
                      : status === 'tx2'
                      ? 'Aprueba el fee de servicio…'
                      : `Enviar ${net > 0 ? net : '0'} USDm →`}
                  </button>
                </div>
              )}

              <p className="text-center font-mono text-[10px] text-muted">
                Red Celo · Gas en USDm · Sin intermediarios
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
