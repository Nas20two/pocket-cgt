import { RawTransaction } from "@/lib/types";

export type ExchangeFormat = "coinspot" | "binance" | "unknown";

export interface ParseResult {
  exchange: ExchangeFormat;
  transactions: RawTransaction[];
  warnings: string[];
}
