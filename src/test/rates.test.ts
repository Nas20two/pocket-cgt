import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { fetchRate, clearRateCache } from "@/lib/exchange/rates";

describe("rate fetcher", () => {
  beforeEach(() => {
    clearRateCache();
    vi.useFakeTimers({ shouldAdvanceTime: false });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the CoinGecko rate for a given date", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        market_data: { current_price: { aud: 1.5 } },
      }),
    } as Response);

    const rate = await fetchRate("tether", "aud", new Date("2024-06-16T00:00:00.000Z"));
    expect(rate).toBe(1.5);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("caches rates in memory and avoids repeated network calls", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        market_data: { current_price: { aud: 1.5 } },
      }),
    } as Response);

    const date = new Date("2024-06-16T00:00:00.000Z");
    await fetchRate("tether", "aud", date);
    const rate2 = await fetchRate("tether", "aud", date);
    expect(rate2).toBe(1.5);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("retries with exponential backoff on 429 responses", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 429 } as Response)
      .mockResolvedValueOnce({ ok: false, status: 429 } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          market_data: { current_price: { aud: 1.5 } },
        }),
      } as Response);

    const promise = fetchRate("tether", "aud", new Date("2024-06-16T00:00:00.000Z"));
    await vi.advanceTimersByTimeAsync(5000);
    const rate = await promise;
    expect(rate).toBe(1.5);
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it("returns null after exhausting retries", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 429 } as Response);

    const promise = fetchRate("tether", "aud", new Date("2024-06-16T00:00:00.000Z"));
    await vi.advanceTimersByTimeAsync(10000);
    const rate = await promise;
    expect(rate).toBeNull();
    expect(global.fetch).toHaveBeenCalledTimes(4); // initial + 3 retries
  });
});
