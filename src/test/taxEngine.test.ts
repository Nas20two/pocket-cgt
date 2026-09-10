import { describe, it, expect } from "vitest";
import { calculateTaxLots } from "@/lib/taxEngine";
import { RawTransaction } from "@/lib/types";

function tx(
  overrides: Partial<RawTransaction> & { transactionDate: Date; type: "Buy" | "Sell"; asset: string; amount: number }
): RawTransaction {
  return {
    market: `${overrides.asset}/AUD`,
    rateIncFee: 100,
    rateExFee: 100,
    fee: 0,
    feeCurrency: "AUD",
    feeAud: 0,
    gstAud: 0,
    totalAud: overrides.amount * 100,
    totalIncGst: overrides.amount * 100,
    ...overrides,
  } as RawTransaction;
}

describe("tax engine", () => {
  it("classifies a 365-day gap as long term", () => {
    const buy = tx({
      transactionDate: new Date("2023-01-01T00:00:00.000Z"),
      type: "Buy",
      asset: "BTC",
      amount: 1,
      totalAud: 100,
      totalIncGst: 100,
    });
    const sell = tx({
      transactionDate: new Date("2024-01-01T00:00:00.000Z"),
      type: "Sell",
      asset: "BTC",
      amount: 1,
      totalAud: 200,
      totalIncGst: 200,
    });
    const { lots } = calculateTaxLots([buy, sell]);
    expect(lots).toHaveLength(1);
    expect(lots[0].holdingPeriod).toBe("Long term");
  });

  it("classifies a 364-day gap as short term", () => {
    const buy = tx({
      transactionDate: new Date("2023-01-01T00:00:00.000Z"),
      type: "Buy",
      asset: "BTC",
      amount: 1,
      totalAud: 100,
      totalIncGst: 100,
    });
    const sell = tx({
      transactionDate: new Date("2023-12-30T23:59:00.000Z"),
      type: "Sell",
      asset: "BTC",
      amount: 1,
      totalAud: 200,
      totalIncGst: 200,
    });
    const { lots } = calculateTaxLots([buy, sell]);
    expect(lots[0].holdingPeriod).toBe("Short term");
  });
});
