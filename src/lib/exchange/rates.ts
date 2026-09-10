import { format } from "date-fns";

const CACHE_KEY = "pocket-cgt-rates-cache";
const MAX_MEMORY_CACHE = 128;
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

interface CacheEntry {
  value: number;
  ts: number;
}

const memoryCache = new Map<string, CacheEntry>();

function cacheKey(coinId: string, currency: string, date: Date): string {
  const dateStr = format(date, "dd-MM-yyyy");
  return `${coinId}:${currency.toLowerCase()}:${dateStr}`;
}

function loadLocalCache(): Record<string, CacheEntry> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, CacheEntry>;
  } catch {
    return {};
  }
}

function saveLocalCache(cache: Record<string, CacheEntry>): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // localStorage may be unavailable or full — fall back to memory-only cache.
  }
}

function readCache(key: string): CacheEntry | undefined {
  const mem = memoryCache.get(key);
  if (mem) return mem;
  const local = loadLocalCache()[key];
  if (local) {
    memoryCache.set(key, local);
    return local;
  }
  return undefined;
}

function writeCache(key: string, entry: CacheEntry): void {
  memoryCache.set(key, entry);
  if (memoryCache.size > MAX_MEMORY_CACHE) {
    const first = memoryCache.keys().next().value;
    if (first !== undefined) memoryCache.delete(first);
  }
  const local = loadLocalCache();
  local[key] = entry;
  saveLocalCache(local);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithBackoff(url: string, retries = MAX_RETRIES, delay = BASE_DELAY_MS): Promise<Response> {
  const response = await fetch(url);
  if (response.status === 429 && retries > 0) {
    await sleep(delay);
    return fetchWithBackoff(url, retries - 1, delay * 2);
  }
  return response;
}

/**
 * Fetch a daily close-ish rate for a CoinGecko coin ID against a currency on a given date.
 * Returns null if the API call fails after retries.
 */
export async function fetchRate(
  coinId: string,
  currency: string,
  date: Date
): Promise<number | null> {
  const key = cacheKey(coinId, currency, date);
  const cached = readCache(key);
  if (cached) return cached.value;

  const dateStr = format(date, "dd-MM-yyyy");
  const url = `https://api.coingecko.com/api/v3/coins/${coinId}/history?date=${dateStr}&localization=false`;

  try {
    const response = await fetchWithBackoff(url);
    if (!response.ok) {
      console.error(`CoinGecko API error for ${coinId}/${currency} on ${dateStr}: ${response.status}`);
      return null;
    }
    const data = await response.json();
    const value = data?.market_data?.current_price?.[currency.toLowerCase()];
    if (typeof value !== "number") {
      console.error(`CoinGecko missing rate for ${coinId}/${currency} on ${dateStr}`);
      return null;
    }
    writeCache(key, { value, ts: Date.now() });
    return value;
  } catch (err) {
    console.error(`Failed to fetch rate for ${coinId}/${currency} on ${dateStr}:`, err);
    return null;
  }
}

/**
 * Convert a USDT value to AUD on a given date.
 */
export async function usdtToAud(date: Date): Promise<number | null> {
  return fetchRate("tether", "aud", date);
}

/**
 * Convert a BNB value to AUD on a given date.
 */
export async function bnbToAud(date: Date): Promise<number | null> {
  return fetchRate("binancecoin", "aud", date);
}

/**
 * Convert a BNB value to USDT on a given date.
 * Computed from BNB/AUD and USDT/AUD rates so both legs use the same data source.
 */
export async function bnbToUsdt(date: Date): Promise<number | null> {
  const [bnbAud, usdtAud] = await Promise.all([fetchRate("binancecoin", "aud", date), fetchRate("tether", "aud", date)]);
  if (!bnbAud || !usdtAud || usdtAud === 0) return null;
  return bnbAud / usdtAud;
}

/** Clear the in-memory and localStorage rate cache. Useful for tests. */
export function clearRateCache(): void {
  memoryCache.clear();
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore
  }
}
