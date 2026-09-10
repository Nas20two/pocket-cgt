import Papa from "papaparse";
import { RawTransaction } from "./types";
import { detectExchange, supportedFormatsMessage } from "./exchange/detectExchange";
import { parseCoinSpot } from "./exchange/coinspotParser";
import { parseBinance, RateProvider } from "./exchange/binanceParser";

export interface ParseFileSource {
  fileName: string;
  exchange: "coinspot" | "binance";
}

export interface ParseFilesResult {
  transactions: RawTransaction[];
  warnings: string[];
  errors: string[];
  sources: ParseFileSource[];
}

interface ParsedFile {
  fileName: string;
  exchange: "coinspot" | "binance";
  transactions: RawTransaction[];
  warnings: string[];
}

function parseFile(
  file: File,
  rateProvider?: RateProvider
): Promise<{ parsed: ParsedFile } | { error: string }> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const headers = results.meta.fields || [];
        const exchange = detectExchange(headers);

        if (exchange === "unknown") {
          resolve({
            error: `${file.name}: unsupported CSV format. Detected columns: ${headers.join(", ")}. ${supportedFormatsMessage()}`,
          });
          return;
        }

        try {
          if (exchange === "coinspot") {
            const { transactions, warnings } = parseCoinSpot(results.data as Record<string, string>[]);
            resolve({ parsed: { fileName: file.name, exchange, transactions, warnings } });
          } else {
            const { transactions, warnings } = await parseBinance(results.data as Record<string, string>[], rateProvider);
            resolve({ parsed: { fileName: file.name, exchange, transactions, warnings } });
          }
        } catch (err) {
          resolve({
            error: `${file.name}: ${err instanceof Error ? err.message : String(err)}`,
          });
        }
      },
      error: (err) => {
        resolve({ error: `${file.name}: ${err.message}` });
      },
    });
  });
}

function deduplicateTransactions(transactions: RawTransaction[]): { unique: RawTransaction[]; duplicates: number } {
  const seen = new Map<string, RawTransaction>();
  let duplicates = 0;

  for (const tx of transactions) {
    const key = `${tx.transactionDate.getTime()}:${tx.asset}:${tx.type}:${tx.amount}:${tx.totalAud}`;
    if (seen.has(key)) {
      duplicates++;
      continue;
    }
    seen.set(key, tx);
  }

  return { unique: Array.from(seen.values()), duplicates };
}

export async function parseCSVFiles(files: File[], rateProvider?: RateProvider): Promise<ParseFilesResult> {
  const transactions: RawTransaction[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];
  const sources: ParseFileSource[] = [];

  for (const file of files) {
    const result = await parseFile(file, rateProvider);
    if ("error" in result) {
      errors.push(result.error);
    } else {
      transactions.push(...result.parsed.transactions);
      sources.push({ fileName: result.parsed.fileName, exchange: result.parsed.exchange });
      if (result.parsed.warnings.length > 0) {
        warnings.push(`[${result.parsed.fileName}]`, ...result.parsed.warnings);
      }
    }
  }

  transactions.sort((a, b) => a.transactionDate.getTime() - b.transactionDate.getTime());

  const { unique, duplicates } = deduplicateTransactions(transactions);
  if (duplicates > 0) {
    warnings.push(`${duplicates} duplicate transaction(s) removed after merging files.`);
  }

  return { transactions: unique, warnings, errors, sources };
}
