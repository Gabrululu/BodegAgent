'use client'

import { useCallback, useState } from 'react'

export type FiadoEntry = {
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

const KEY = 'bodeg:fiado'

export function useFiado() {
  const [entries, setEntries] = useState<FiadoEntry[]>(() => {
    if (typeof window === 'undefined') return []
    try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') } catch { return [] }
  })

  const persist = useCallback((fn: (prev: FiadoEntry[]) => FiadoEntry[]) => {
    setEntries(prev => {
      const next = fn(prev)
      localStorage.setItem(KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const addFiado = useCallback((data: Omit<FiadoEntry, 'id' | 'createdAt' | 'settled'>) => {
    const entry: FiadoEntry = {
      ...data,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      settled: false,
    }
    persist(prev => [...prev, entry])
    return entry
  }, [persist])

  const settleFiado = useCallback((id: string, txHash?: string) => {
    persist(prev => prev.map(e =>
      e.id === id
        ? { ...e, settled: true, settledAt: new Date().toISOString(), txHash }
        : e
    ))
  }, [persist])

  const removeFiado = useCallback((id: string) => {
    persist(prev => prev.filter(e => e.id !== id))
  }, [persist])

  return {
    entries,
    pending: entries.filter(e => !e.settled),
    settled: entries.filter(e => e.settled),
    addFiado,
    settleFiado,
    removeFiado,
  }
}
