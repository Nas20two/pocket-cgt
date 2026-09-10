import { RawTransaction } from "@/lib/types";
import { ParseResult } from "./types";
import { usdtToAud as fetchUsdtToAud, bnbToUsdt as fetchBnbToUsdt } from "./rates";

const STABLE_QUOTES = ["USDT", "USDC", "BUSD", "TUSD", "FDUSD", "USDS"];
const FUTURES_MARKERS = ["_PERP", "FUTURES", "MARGIN"];

export interface RateProvider {
  usdtToAud(date: Date): Promise<number | null>;
  bnbToUsdt(date: Date): Promise<number | null>;
}

function parseBinanceDate(dateStr: string): Date {
  const trimmed = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
    return new Date(trimmed);
  }
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);
  if (match) {
    const [, year, month, day, hour, minute, second] = match;
    return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`);
  }
  throw new Error(`Invalid Binance date format: ${dateStr}`);
}

function parseNum(val: string): number {
  if (!val || val.trim() === "") return 0;
  return parseFloat(val.replace(/,/g, "")) || 0;
}

function round(n: number, decimals = 8): number {
  const factor = 10 ** decimals;
  return Math.round(n * factor) / factor;
}

function stripQuote(pair: string): { asset: string; quote: string } | null {
  const upper = pair.toUpperCase();
  for (const quote of STABLE_QUOTES) {
    if (upper.endsWith(quote)) {
      return { asset: pair.slice(0, -quote.length), quote };
    }
  }
  return null;
}

function isFuturesOrMargin(pair: string): boolean {
  const upper = pair.toUpperCase();
  return FUTURES_MARKERS.some((marker) => upper.includes(marker));
}

export async function parseBinance(
  rows: Record<string, string>[],
  rateProvider: RateProvider = { usdtToAud: fetchUsdtToAud, bnbToUsdt: fetchBnbToUsdt }
): Promise<ParseResult> {
  const transactions: RawTransaction[] = [];
  const warnings: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const pair = row["Pair"]?.trim() || "";
    const sideRaw = row["Side"]?.trim().toUpperCase() || "";

    if (isFuturesOrMargin(pair)) {
      warnings.push(`Binance row ${i + 1}: rejected futures/margin trade ${pair} — different tax treatment.`);
      continue;
    }

    if (sideRaw !== "BUY" && sideRaw !== "SELL") {
      warnings.push(`Binance row ${i + 1}: rejected unsupported side "${sideRaw}".`);
      continue;
    }

    const pairInfo = stripQuote(pair);
    if (!pairInfo) {
      warnings.push(`Binance row ${i + 1}: rejected unsupported pair "${pair}".`);
      continue;
    }

    const amount = parseNum(row["Executed"]);
    const price = parseNum(row["Price"]);
    const quoteAmount = parseNum(row["Amount"]);
    const feeRaw = parseNum(row["Fee"]);
    const feeCoinHeader = Object.keys(row).find((h) => h.toLowerCase() === "fee coin");
    const feeCurrency = (feeCoinHeader ? row[feeCoinHeader] : "USDT")?.trim().toUpperCase() || "USDT";

    if (amount <= 0 || price < 0) {
      warnings.push(`Binance row ${i + 1}: skipped zero/negative amount or price for ${pairInfo.asset}`);
      continue;
    }

    try {
      const transactionDate = parseBinanceDate(row["Time"]);
      const usdtAudRate = await rateProvider.usdtToAud(transactionDate);
      if (!usdtAudRate) {
        warnings.push(`Binance row ${i + 1}: could not fetch USDT/AUD rate for ${pairInfo.asset}; using approximate values.`);
      }
      const rate = usdtAudRate ?? 1;

      let feeInUsdt = 0;
      if (feeCurrency === "BNB") {
        const bnbUsdtRate = await rateProvider.bnbToUsdt(transactionDate);
        if (!bnbUsdtRate) {
          warnings.push(`Binance row ${i + 1}: could not fetch BNB/USDT rate for fee; using approximate values.`);
        }
        feeInUsdt = feeRaw * (bnbUsdtRate ?? 1);
      } else if (feeCurrency === "USDT") {
        feeInUsdt = feeRaw;
      } else {
        warnings.push(`Binance row ${i + 1}: unsupported fee currency "${feeCurrency}"; fee treated as zero.`);
      }

      const priceAud = round(price * rate);
      const quoteAud = round(quoteAmount * rate);
      const feeAud = round(feeInUsdt * rate);
      const totalAud = round(sideRaw === "BUY" ? quoteAud + feeAud : quoteAud - feeAud);

      transactions.push({
        transactionDate,
        type: sideRaw === "BUY" ? "Buy" : "Sell",
        market: pair,
        asset: pairInfo.asset,
        amount,
        rateIncFee: priceAud,
        rateExFee: priceAud,
        fee: feeRaw,
        feeCurrency,
        feeAud,
        gstAud: 0,
        totalAud,
        totalIncGst: totalAud,
      });
    } catch (err) {
      warnings.push(`Binance row ${i + 1}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { exchange: "binance", transactions, warnings };
}
