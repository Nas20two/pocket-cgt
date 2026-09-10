export interface RawTransaction {
  transactionDate: Date;
  type: "Buy" | "Sell";
  market: string;
  asset: string;
  amount: number;
  rateIncFee: number;
  rateExFee: number;
  fee: number;
  feeCurrency: string;
  feeAud: number;
  gstAud: number;
  totalAud: number;
  totalIncGst: number;
}

export interface TaxLot {
  dateSold: Date;
  dateAcquired: Date;
  asset: string;
  amount: number;
  costAud: number;
  proceedsAud: number;
  gainLoss: number;
  holdingPeriod: "Short term" | "Long term";
  discountedGain: number;
  feeAud: number;
}

export interface CoinSummary {
  coin: string;
  amountSold: number;
  purchasedValue: number;
  soldValue: number;
  capitalGains: number;
}

export interface TaxSummary {
  shortTerm: {
    grossProfit: number;
    fees: number;
    netCapitalGains: number;
  };
  longTerm: {
    grossProfit: number;
    fees: number;
    capitalGainsBeforeDiscount: number;
    netCapitalGains: number;
  };
  totalNetCapitalGains: number;
}

export interface FinancialYear {
  label: string;
  startDate: Date;
  endDate: Date;
}
