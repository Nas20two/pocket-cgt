import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseCSVFiles } from "@/lib/csvParser";
import { calculateTaxLots } from "@/lib/taxEngine";
import { RawTransaction } from "@/lib/types";
import {
  expectedCoinSpotTransactions,
  expectedBinanceTransactions,
} from "./fixtures/expected";
import { RateProvider } from "@/lib/exchange/binanceParser";

function toFile(name: string, content: string): File {
  return new File([content], name, { type: "text/csv" });
}

function fixtureFile(name: string): File {
  const path = resolve(__dirname, "fixtures", name);
  const content = readFileSync(path, "utf-8");
  return toFile(name, content);
}

function mockRateProvider(): RateProvider {
  const rates = new Map<string, number>([
    ["2024-06-16:USDT->AUD", 1.5],
    ["2024-09-01:USDT->AUD", 1.52],
    ["2024-09-02:USDT->AUD", 1.52],
    ["2024-09-03:USDT->AUD", 1.525],
    ["2024-09-05:USDT->AUD", 1.52],
    ["2024-06-16:BNB->USDT", 600],
    ["2024-09-01:BNB->USDT", 550],
    ["2024-09-02:BNB->USDT", 550],
    ["2024-09-03:BNB->USDT", 540],
  ]);

  function dateKey(date: Date) {
    return date.toISOString().split("T")[0];
  }

  return {
    usdtToAud: async (date: Date) => rates.get(`${dateKey(date)}:USDT->AUD`) ?? null,
    bnbToUsdt: async (date: Date) => rates.get(`${dateKey(date)}:BNB->USDT`) ?? null,
  };
}

function txToComparable(tx: RawTransaction) {
  return {
    ...tx,
    transactionDate: tx.transactionDate.toISOString(),
  };
}

describe("CSV parsing", () => {
  const rates = mockRateProvider();

  beforeEach(() => {
    // Ensure no leakage from previous runs
  });

  it("parses the CoinSpot fixture into the expected transactions", async () => {
    const file = fixtureFile("coinspot.csv");
    const { transactions, errors } = await parseCSVFiles([file], rates);
    expect(errors).toEqual([]);
    expect(transactions.map(txToComparable)).toEqual(
      expectedCoinSpotTransactions.map(txToComparable)
    );
  });

  it("parses the Binance fixture into the expected transactions", async () => {
    const file = fixtureFile("binance.csv");
    const { transactions, errors } = await parseCSVFiles([file], rates);
    expect(errors).toEqual([]);
    expect(transactions.map(txToComparable)).toEqual(
      expectedBinanceTransactions.map(txToComparable)
    );
  });

  it("rejects futures/margin rows with a warning", async () => {
    const file = fixtureFile("binance.csv");
    const { warnings } = await parseCSVFiles([file], rates);
    const futuresWarning = warnings.find((w) =>
      w.includes("BTCUSDT_PERP")
    );
    expect(futuresWarning).toBeDefined();
    expect(futuresWarning).toContain("futures/margin");
  });

  it("detects unmatched sells when no matching buy exists", async () => {
    const file = fixtureFile("binance.csv");
    const { transactions } = await parseCSVFiles([file], rates);
    const { unmatchedSells } = calculateTaxLots(transactions);
    const unmatchedAssets = unmatchedSells.map((tx) => tx.asset).sort();
    // BTC and SOL have no matching buys in the Binance-only fixture.
    expect(unmatchedAssets).toEqual(["BTC", "SOL"]);
  });

  it("deduplicates transactions when the same file is uploaded twice", async () => {
    const file = fixtureFile("coinspot.csv");
    const { transactions, warnings } = await parseCSVFiles([file, file], rates);
    expect(transactions.length).toBe(expectedCoinSpotTransactions.length);
    expect(warnings.some((w) => w.includes("duplicate"))).toBe(true);
  });

  it("rejects CSVs with unsupported headers", async () => {
    const file = toFile(
      "bad.csv",
      "Date,Symbol,Quantity,Price\n2024-01-01,BTC,1,100\n"
    );
    const { transactions, errors } = await parseCSVFiles([file], rates);
    expect(transactions).toEqual([]);
    expect(errors.length).toBe(1);
    expect(errors[0]).toContain("unsupported CSV format");
  });

  it("skips rows with zero or negative amount", async () => {
    const file = toFile(
      "binance-bad.csv",
      "Time,Pair,Side,Price,Executed,Amount,Fee,Fee Coin\n" +
        "2024-09-01 00:00:00,ETHUSDT,SELL,4000,0,2000,0.0004,BNB\n" +
        "2024-09-02 00:00:00,ETHUSDT,SELL,-1,0.5,2000,0.0004,BNB\n" +
        "2024-09-03 00:00:00,ETHUSDT,SELL,4000,0.5,2000,0.0004,BNB\n"
    );
    const { transactions, warnings } = await parseCSVFiles([file], rates);
    expect(transactions.length).toBe(1);
    expect(warnings.some((w) => w.includes("zero/negative"))).toBe(true);
  });

  it("sorts Binance UTC dates correctly against CoinSpot AEDT/AEST dates", async () => {
    const coinspot = toFile(
      "coinspot-tz.csv",
      "Transaction Date,Type,Market,Amount,Rate inc. fee,Rate ex. fee,Fee,Fee AUD (inc GST),GST AUD,Total AUD,Total (inc GST)\n" +
        "16/06/2024 02:00 PM,Buy,BTC/AUD,0.1,100100,100000,10,11,1,10010,10011\n"
    );
    const binance = toFile(
      "binance-tz.csv",
      "Time,Pair,Side,Price,Executed,Amount,Fee,Fee Coin\n" +
        "2024-06-16T00:00:00.000Z,BTCUSDT,BUY,65000,0.1,6500,0.0001,BNB\n"
    );
    const { transactions } = await parseCSVFiles([coinspot, binance], rates);
    expect(transactions[0].market).toBe("BTCUSDT");
    expect(transactions[1].market).toBe("BTC/AUD");
  });

  it("merges CoinSpot and Binance transactions for cross-exchange FIFO", async () => {
    const coinspot = fixtureFile("coinspot.csv");
    const binance = fixtureFile("binance.csv");
    const { transactions, errors } = await parseCSVFiles([coinspot, binance], rates);
    expect(errors).toEqual([]);
    expect(transactions.length).toBe(
      expectedCoinSpotTransactions.length + expectedBinanceTransactions.length
    );

    const { unmatchedSells } = calculateTaxLots(transactions);
    // BTC sell from Binance should be matched by CoinSpot BTC buys; SOL has no buy.
    expect(unmatchedSells.some((tx) => tx.asset === "BTC")).toBe(false);
    expect(unmatchedSells.some((tx) => tx.asset === "SOL")).toBe(true);
  });
});
