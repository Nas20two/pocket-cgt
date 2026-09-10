import { RawTransaction, TaxLot, CoinSummary, TaxSummary, FinancialYear } from "./types";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function calculateTaxLots(transactions: RawTransaction[]): {
  lots: TaxLot[];
  unmatchedSells: RawTransaction[];
} {
  // Group buys by asset, each with remaining amount
  const buyQueues: Record<
    string,
    { tx: RawTransaction; remaining: number }[]
  > = {};

  const taxLots: TaxLot[] = [];
  const unmatchedSells: RawTransaction[] = [];

  // Process chronologically
  const sorted = [...transactions].sort(
    (a, b) => a.transactionDate.getTime() - b.transactionDate.getTime()
  );

  for (const tx of sorted) {
    if (tx.type === "Buy") {
      if (!buyQueues[tx.asset]) buyQueues[tx.asset] = [];
      buyQueues[tx.asset].push({ tx, remaining: tx.amount });
    } else if (tx.type === "Sell") {
      const queue = buyQueues[tx.asset] || [];
      let sellRemaining = tx.amount;
      const sellPricePerUnit = tx.amount > 0 ? tx.totalAud / tx.amount : 0;
      const sellFeePerUnit = tx.amount > 0 ? tx.feeAud / tx.amount : 0;

      while (sellRemaining > 1e-10 && queue.length > 0) {
        const buy = queue[0];
        const matched = Math.min(sellRemaining, buy.remaining);

        const buyPricePerUnit =
          buy.tx.amount > 0 ? buy.tx.totalAud / buy.tx.amount : 0;
        const costBasis = matched * buyPricePerUnit;
        const proceeds = matched * sellPricePerUnit;
        const gainLoss = proceeds - costBasis;

        const daysDiff =
          (tx.transactionDate.getTime() - buy.tx.transactionDate.getTime()) /
          MS_PER_DAY;
        const holdingPeriod: "Short term" | "Long term" =
          daysDiff > 365 ? "Long term" : "Short term";

        const discountedGain =
          holdingPeriod === "Long term" && gainLoss > 0
            ? gainLoss * 0.5
            : gainLoss;

        const fee = matched * sellFeePerUnit;

        taxLots.push({
          dateSold: tx.transactionDate,
          dateAcquired: buy.tx.transactionDate,
          asset: tx.asset,
          amount: matched,
          costAud: costBasis,
          proceedsAud: proceeds,
          gainLoss,
          holdingPeriod,
          discountedGain,
          feeAud: fee,
        });

        buy.remaining -= matched;
        sellRemaining -= matched;

        if (buy.remaining < 1e-10) {
          queue.shift();
        }
      }

      if (sellRemaining > 1e-10) {
        unmatchedSells.push(tx);
      }
    }
  }

  return { lots: taxLots, unmatchedSells };
}

export function calculateSummary(
  taxLots: TaxLot[],
  allTransactions: RawTransaction[]
): TaxSummary {
  const shortLots = taxLots.filter((l) => l.holdingPeriod === "Short term");
  const longLots = taxLots.filter((l) => l.holdingPeriod === "Long term");

  const totalFees = allTransactions.reduce((sum, tx) => sum + tx.feeAud, 0);
  const shortFees = shortLots.reduce((sum, l) => sum + l.feeAud, 0);
  const longFees = longLots.reduce((sum, l) => sum + l.feeAud, 0);

  const shortGross = shortLots.reduce((sum, l) => sum + l.gainLoss, 0);
  const longGross = longLots.reduce((sum, l) => sum + l.gainLoss, 0);
  const longDiscounted = longLots.reduce((sum, l) => sum + l.discountedGain, 0);

  return {
    shortTerm: {
      grossProfit: shortGross,
      fees: shortFees,
      netCapitalGains: shortGross,
    },
    longTerm: {
      grossProfit: longGross,
      fees: longFees,
      capitalGainsBeforeDiscount: longGross,
      netCapitalGains: longDiscounted,
    },
    totalNetCapitalGains: shortGross + longDiscounted,
  };
}

export function calculateCoinSummaries(taxLots: TaxLot[]): {
  gains: CoinSummary[];
  losses: CoinSummary[];
} {
  const byAsset: Record<string, CoinSummary> = {};

  for (const lot of taxLots) {
    if (!byAsset[lot.asset]) {
      byAsset[lot.asset] = {
        coin: lot.asset,
        amountSold: 0,
        purchasedValue: 0,
        soldValue: 0,
        capitalGains: 0,
      };
    }
    const s = byAsset[lot.asset];
    s.amountSold += lot.amount;
    s.purchasedValue += lot.costAud;
    s.soldValue += lot.proceedsAud;
    s.capitalGains += lot.gainLoss;
  }

  const all = Object.values(byAsset);
  const gains = all
    .filter((s) => s.capitalGains > 0)
    .sort((a, b) => b.capitalGains - a.capitalGains);
  const losses = all
    .filter((s) => s.capitalGains <= 0)
    .sort((a, b) => a.capitalGains - b.capitalGains);

  return { gains, losses };
}

export function getAvailableFinancialYears(taxLots: TaxLot[]): FinancialYear[] {
  const fySet = new Set<number>();

  for (const lot of taxLots) {
    const d = lot.dateSold;
    // AU FY runs July 1 to June 30. If month >= July (6 in 0-indexed), FY starts this calendar year.
    const fyStart = d.getMonth() >= 6 ? d.getFullYear() : d.getFullYear() - 1;
    fySet.add(fyStart);
  }

  return Array.from(fySet)
    .sort((a, b) => a - b)
    .map((year) => ({
      label: `FY ${year}-${String(year + 1).slice(-2)}`,
      startDate: new Date(year, 6, 1),
      endDate: new Date(year + 1, 5, 30, 23, 59, 59, 999),
    }));
}

export function filterByFinancialYear(taxLots: TaxLot[], fy: FinancialYear): TaxLot[] {
  return taxLots.filter(
    (lot) => lot.dateSold >= fy.startDate && lot.dateSold <= fy.endDate
  );
}
