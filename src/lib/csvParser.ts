import Papa from "papaparse";
import { RawTransaction } from "./types";

const EXPECTED_HEADERS = [
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

function parseDate(dateStr: string): Date {
  // Format: DD/MM/YYYY hh:mm AM/PM
  const match = dateStr.match(
    /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{1,2}):(\d{2})\s+(AM|PM)$/i
  );
  if (!match) throw new Error(`Invalid date format: ${dateStr}`);

  const [, day, month, year, hourStr, minute, ampm] = match;
  let hour = parseInt(hourStr, 10);
  if (ampm.toUpperCase() === "PM" && hour !== 12) hour += 12;
  if (ampm.toUpperCase() === "AM" && hour === 12) hour = 0;

  return new Date(
    parseInt(year, 10),
    parseInt(month, 10) - 1,
    parseInt(day, 10),
    hour,
    parseInt(minute, 10)
  );
}

function parseNum(val: string): number {
  if (!val || val.trim() === "") return 0;
  return parseFloat(val.replace(/,/g, "")) || 0;
}

export function parseCSV(file: File): Promise<RawTransaction[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        try {
          const headers = results.meta.fields || [];
          const missing = EXPECTED_HEADERS.filter((h) => !headers.includes(h));
          if (missing.length > 0) {
            reject(new Error(`Missing CSV columns: ${missing.join(", ")}`));
            return;
          }

          const transactions: RawTransaction[] = [];

          for (const row of results.data as Record<string, string>[]) {
            const type = row["Type"]?.trim();
            if (type !== "Buy" && type !== "Sell") continue;

            const market = row["Market"]?.trim() || "";
            const asset = market.split("/")[0]?.trim() || market;

            transactions.push({
              transactionDate: parseDate(row["Transaction Date"]?.trim()),
              type: type as "Buy" | "Sell",
              market,
              asset,
              amount: parseNum(row["Amount"]),
              rateIncFee: parseNum(row["Rate inc. fee"]),
              rateExFee: parseNum(row["Rate ex. fee"]),
              fee: parseNum(row["Fee"]),
              feeCurrency: "AUD",
              feeAud: parseNum(row["Fee AUD (inc GST)"]),
              gstAud: parseNum(row["GST AUD"]),
              totalAud: parseNum(row["Total AUD"]),
              totalIncGst: parseNum(row["Total (inc GST)"]),
            });
          }

          transactions.sort(
            (a, b) => a.transactionDate.getTime() - b.transactionDate.getTime()
          );

          resolve(transactions);
        } catch (err) {
          reject(err);
        }
      },
      error(err) {
        reject(err);
      },
    });
  });
}
