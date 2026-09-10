import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { exportCSV } from "@/lib/reportExporter";
import type { TaxLot } from "@/lib/types";
import type { ParseFileSource } from "@/lib/csvParser";

function makeLot(dateSold: string, dateAcquired: string): TaxLot {
  return {
    dateSold: new Date(dateSold),
    dateAcquired: new Date(dateAcquired),
    asset: "BTC",
    amount: 1,
    costAud: 10000,
    proceedsAud: 12000,
    gainLoss: 2000,
    holdingPeriod: "Long term",
    discountedGain: 1000,
    feeAud: 10,
  };
}

describe("exportCSV", () => {
  let clickSpy: ReturnType<typeof vi.spyOn>;
  let createObjectURLSpy: ReturnType<typeof vi.spyOn>;
  let capturedBlob: Blob | undefined;
  let capturedDownload: string | undefined;

  beforeEach(() => {
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    capturedBlob = undefined;
    createObjectURLSpy = vi.spyOn(URL, "createObjectURL").mockImplementation((blob) => {
      capturedBlob = blob as Blob;
      return "blob:url";
    });

    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
      const el = originalCreateElement(tagName);
      if (tagName.toLowerCase() === "a") {
        Object.defineProperty(el, "download", {
          set(value: string) {
            capturedDownload = value;
          },
        });
      }
      return el;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    capturedBlob = undefined;
    capturedDownload = undefined;
  });

  it("derives report year from the latest lot date", async () => {
    exportCSV([makeLot("2026-06-15", "2025-06-15"), makeLot("2026-12-20", "2025-12-20")]);
    expect(clickSpy).toHaveBeenCalled();
    expect(capturedDownload).toBe("capital_gains_report_2026.csv");
    expect(createObjectURLSpy).toHaveBeenCalled();
    const text = await capturedBlob!.text();
    expect(text).toContain("Capital gains report 2026");
  });

  it("uses exchange name as wallet name for a single source", async () => {
    const sources: ParseFileSource[] = [{ fileName: "binance.csv", exchange: "binance" }];
    exportCSV([makeLot("2026-06-15", "2025-06-15")], sources);
    const text = await capturedBlob!.text();
    expect(text).toContain("Binance");
    expect(text).not.toContain("CoinSpot");
  });

  it("uses 'Multiple' as wallet name for multiple exchanges", async () => {
    const sources: ParseFileSource[] = [
      { fileName: "coinspot.csv", exchange: "coinspot" },
      { fileName: "binance.csv", exchange: "binance" },
    ];
    exportCSV([makeLot("2026-06-15", "2025-06-15")], sources);
    const text = await capturedBlob!.text();
    expect(text).toContain("Multiple");
  });
});
