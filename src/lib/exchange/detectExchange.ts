import { ExchangeFormat } from "./types";
import Papa from "papaparse";

const COINSPOT_HEADERS = [
  "Transaction Date",
  "Type",
  "Market",
  "Amount",
  "Rate inc. fee",
  "Rate ex. fee",
  "Fee",
  "Fee AUD (inc GST)",
  "GST AUD",
  "Total AUD",
  "Total (inc GST)",
];

const BINANCE_HEADERS = ["Time", "Pair", "Side", "Price", "Executed", "Amount", "Fee"];

export function detectExchange(headers: string[]): ExchangeFormat {
  const lower = headers.map((h) => h.toLowerCase().trim());

  if (COINSPOT_HEADERS.every((h) => headers.includes(h))) return "coinspot";

  if (BINANCE_HEADERS.every((h) => lower.includes(h.toLowerCase()))) return "binance";

  return "unknown";
}

export function supportedFormatsMessage(): string {
  return "Supported formats: CoinSpot orderhistory.csv and Binance spot trade history export.";
}

export function detectExchangeFromFile(file: File): Promise<ExchangeFormat> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      preview: 1,
      complete: (results) => {
        const headers = results.meta.fields || [];
        resolve(detectExchange(headers));
      },
      error: () => {
        resolve("unknown");
      },
    });
  });
}
