'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'

export type WalletType = 'minipay' | 'injected' | 'embedded' | null

const VALID_WALLET_TYPES: ReadonlySet<string> = new Set(['minipay', 'injected', 'embedded'])

function isValidWalletType(v: string | null): v is NonNullable<WalletType> {
  return v !== null && VALID_WALLET_TYPES.has(v)
}

export interface WalletState {
  address: string | null
  walletType: WalletType
  isMiniPay: boolean
  hasInjected: boolean
  connecting: boolean
  embeddedPkWarning: boolean          // true when embedded PK exists in localStorage
  connect: (type: 'minipay' | 'injected' | 'embedded') => Promise<void>
  disconnect: () => void
  clearEmbeddedKey: () => void        // permanently deletes the embedded private key
}

const WalletContext = createContext<WalletState>({
  address: null,
  walletType: null,
  isMiniPay: false,
  hasInjected: false,
  connecting: false,
  embeddedPkWarning: false,
  connect: async () => {},
  disconnect: () => {},
  clearEmbeddedKey: () => {},
})

const STORAGE_KEY_ADDRESS = 'bodeg_address'
const STORAGE_KEY_TYPE    = 'bodeg_wallet_type'
const STORAGE_KEY_PK      = 'bodeg_embedded_pk'

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress]               = useState<string | null>(null)
  const [walletType, setWalletType]         = useState<WalletType>(null)
  const [connecting, setConnecting]         = useState(false)
  const [isMiniPay, setIsMiniPay]           = useState(false)
  const [hasInjected, setHasInjected]       = useState(false)
  const [embeddedPkWarning, setEmbeddedPkWarning] = useState(false)

  useEffect(() => {
    const ethereum = (window as Window & { ethereum?: { isMiniPay?: boolean; request?: unknown } }).ethereum
    const miniPay = !!ethereum?.isMiniPay
    const injected = !!ethereum && !miniPay
    setIsMiniPay(miniPay)
    setHasInjected(injected)

    // Surface warning if a PK is lingering from a previous session
    if (localStorage.getItem(STORAGE_KEY_PK)) {
      setEmbeddedPkWarning(true)
    }

    if (miniPay) {
      connect('minipay')
      return
    }

    // Restore persisted wallet — validate type before trusting localStorage
    const savedAddress = localStorage.getItem(STORAGE_KEY_ADDRESS)
    const savedRaw     = localStorage.getItem(STORAGE_KEY_TYPE)
    if (savedAddress && isValidWalletType(savedRaw)) {
      setAddress(savedAddress)
      setWalletType(savedRaw)
    } else if (savedRaw && !isValidWalletType(savedRaw)) {
      // Corrupt or tampered value — clear it
      localStorage.removeItem(STORAGE_KEY_ADDRESS)
      localStorage.removeItem(STORAGE_KEY_TYPE)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const connect = useCallback(async (type: 'minipay' | 'injected' | 'embedded') => {
    setConnecting(true)
    try {
      if (type === 'minipay' || type === 'injected') {
        const ethereum = (window as Window & { ethereum?: { request: (args: { method: string }) => Promise<string[]> } }).ethereum
        if (!ethereum) throw new Error('No se encontró wallet en el navegador.')
        const accounts = await ethereum.request({ method: 'eth_requestAccounts' })
        const addr = accounts[0]
        setAddress(addr)
        setWalletType(type)
        localStorage.setItem(STORAGE_KEY_ADDRESS, addr)
        localStorage.setItem(STORAGE_KEY_TYPE, type)
      } else {
        // Embedded: validate existing key or generate a new one
        let pk = localStorage.getItem(STORAGE_KEY_PK)
        if (!pk || !pk.startsWith('0x') || pk.length !== 66) {
          pk = generatePrivateKey()
          localStorage.setItem(STORAGE_KEY_PK, pk)
        }
        const account = privateKeyToAccount(pk as `0x${string}`)
        setAddress(account.address)
        setWalletType('embedded')
        setEmbeddedPkWarning(true)
        localStorage.setItem(STORAGE_KEY_ADDRESS, account.address)
        localStorage.setItem(STORAGE_KEY_TYPE, 'embedded')
      }
    } catch (err) {
      console.error('Wallet connection error:', err)
    } finally {
      setConnecting(false)
    }
  }, [])

  const disconnect = useCallback(() => {
    setAddress(null)
    setWalletType(null)
    localStorage.removeItem(STORAGE_KEY_ADDRESS)
    localStorage.removeItem(STORAGE_KEY_TYPE)
    // PK is intentionally kept so the same address is restored on reconnect.
    // Users who want to fully delete it should call clearEmbeddedKey().
  }, [])

  const clearEmbeddedKey = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY_PK)
    localStorage.removeItem(STORAGE_KEY_ADDRESS)
    localStorage.removeItem(STORAGE_KEY_TYPE)
    setAddress(null)
    setWalletType(null)
    setEmbeddedPkWarning(false)
  }, [])

  return (
    <WalletContext.Provider
      value={{ address, walletType, isMiniPay, hasInjected, connecting, embeddedPkWarning, connect, disconnect, clearEmbeddedKey }}
    >
      {children}
    </WalletContext.Provider>
  )
}

export const useWallet = () => useContext(WalletContext)
