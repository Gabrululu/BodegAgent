// Live FX rate for PEN/USDm conversions
// Source: open.er-api.com — free, no API key, updates every 24h
// Falls back to PEN_TO_CUSD_RATE env var if the API is unreachable.

const FX_CACHE_TTL = 60 * 60 * 1000 // 1 hour in ms

let fxCache: { usdToPen: number; fetchedAt: number } | null = null

export async function getLivePenRate(): Promise<number> {
  const now = Date.now()
  if (fxCache && now - fxCache.fetchedAt < FX_CACHE_TTL) {
    return fxCache.usdToPen
  }
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const usdToPen: number = data.rates?.PEN
    if (!usdToPen || usdToPen <= 0) throw new Error('PEN rate missing in response')
    fxCache = { usdToPen, fetchedAt: Date.now() }
    return usdToPen
  } catch {
    const fallback = parseFloat(process.env.PEN_TO_CUSD_RATE ?? '3.7')
    return Number.isFinite(fallback) && fallback > 0 ? fallback : 3.7
  }
}

export async function getFxRateInfo() {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const usdToPen: number = data.rates?.PEN
    if (!usdToPen || usdToPen <= 0) throw new Error('PEN rate missing')
    fxCache = { usdToPen, fetchedAt: Date.now() }
    return {
      usdToPen: usdToPen.toFixed(4),
      penToUsdm: (1 / usdToPen).toFixed(6),
      exampleConversion: `S/100 = ${(100 / usdToPen).toFixed(2)} USDm`,
      updatedAt: data.time_last_update_utc ?? new Date().toUTCString(),
      source: 'open.er-api.com',
      live: true,
    }
  } catch {
    const fallback = parseFloat(process.env.PEN_TO_CUSD_RATE ?? '3.7')
    return {
      usdToPen: fallback.toFixed(4),
      penToUsdm: (1 / fallback).toFixed(6),
      exampleConversion: `S/100 = ${(100 / fallback).toFixed(2)} USDm`,
      updatedAt: null,
      source: 'variable de entorno (fallback)',
      live: false,
    }
  }
}
