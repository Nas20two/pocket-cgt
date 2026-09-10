import { fromZonedTime } from "date-fns-tz";
import { RawTransaction } from "@/lib/types";
import { ParseResult } from "./types";

function parseDate(dateStr: string): Date {
  const match = dateStr.match(
    /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{1,2}):(\d{2})\s+(AM|PM)$/i
  );
  if (!match) throw new Error(`Invalid CoinSpot date format: ${dateStr}`);

  const [, day, month, year, hourStr, minute, ampm] = match;
  let hour = parseInt(hourStr, 10);
  if (ampm.toUpperCase() === "PM" && hour !== 12) hour += 12;
  if (ampm.toUpperCase() === "AM" && hour === 12) hour = 0;

  const localDateStr = `${year}-${month}-${day} ${String(hour).padStart(2, "0")}:${minute}`;
  return fromZonedTime(localDateStr, "Australia/Sydney");
}

function parseNum(val: string): number {
  if (!val || val.trim() === "") return 0;
  return parseFloat(val.replace(/,/g, "")) || 0;
}

export function parseCoinSpot(rows: Record<string, string>[]): ParseResult {
  const transactions: RawTransaction[] = [];
  const warnings: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const type = row["Type"]?.trim();
    if (type !== "Buy" && type !== "Sell") {
      if (type) warnings.push(`CoinSpot row ${i + 1}: ignored unsupported type "${type}"`);
      continue;
    }

    const market = row["Market"]?.trim() || "";
    const asset = market.split("/")[0]?.trim() || market;
    const amount = parseNum(row["Amount"]);
    const rateIncFee = parseNum(row["Rate inc. fee"]);
    const rateExFee = parseNum(row["Rate ex. fee"]);

    if (amount <= 0 || rateExFee < 0) {
      warnings.push(`CoinSpot row ${i + 1}: skipped zero/negative amount or price for ${asset}`);
      continue;
    }

    try {
      transactions.push({
        transactionDate: parseDate(row["Transaction Date"]?.trim()),
        type: type as "Buy" | "Sell",
        market,
        asset,
        amount,
        rateIncFee,
        rateExFee,
        fee: parseNum(row["Fee"]),
        feeCurrency: "AUD",
        feeAud: parseNum(row["Fee AUD (inc GST)"]),
        gstAud: parseNum(row["GST AUD"]),
        totalAud: parseNum(row["Total AUD"]),
        totalIncGst: parseNum(row["Total (inc GST)"]),
      });
    } catch (err) {
      warnings.push(`CoinSpot row ${i + 1}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { exchange: "coinspot", transactions, warnings };
}
