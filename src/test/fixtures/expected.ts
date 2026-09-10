/**
 * Expected parsed output for the fixture CSVs.
 *
 * Rates used for USDT → AUD conversion:
 * - 2024-06-16: 1.50
 * - 2024-09-01/02/05: 1.52
 * - 2024-09-03: 1.525
 *
 * BNB → USDT rates used for BNB fee conversion:
 * - 2024-06-16: 600 USDT
 * - 2024-09-01/02: 550 USDT
 * - 2024-09-03: 540 USDT
 *
 * CoinSpot dates are interpreted as Australia/Sydney local time and converted
 * to the equivalent UTC timestamps below.
 *
 * For Binance, `totalAud` is the net-of-fee value so the FIFO engine treats
 * fees the same way as CoinSpot:
 * - BUY: totalAud = (Amount + fee_in_usdt) * usdtToAud
 * - SELL: totalAud = (Amount - fee_in_usdt) * usdtToAud
 */

import { RawTransaction } from "@/lib/types";

export const expectedCoinSpotTransactions: RawTransaction[] = [
  {
    transactionDate: new Date("2024-06-15T00:00:00.000Z"),
    type: "Buy",
    market: "BTC/AUD",
    asset: "BTC",
    amount: 0.5,
    rateIncFee: 100100,
    rateExFee: 100000,
    fee: 50,
    feeCurrency: "AUD",
    feeAud: 55,
    gstAud: 5,
    totalAud: 50050,
    totalIncGst: 50055,
  },
  {
    transactionDate: new Date("2024-08-10T01:00:00.000Z"),
    type: "Buy",
    market: "BTC/AUD",
    asset: "BTC",
    amount: 0.5,
    rateIncFee: 110110,
    rateExFee: 110000,
    fee: 55,
    feeCurrency: "AUD",
    feeAud: 60.5,
    gstAud: 5.5,
    totalAud: 55055,
    totalIncGst: 55060.5,
  },
  {
    transactionDate: new Date("2025-01-20T03:00:00.000Z"),
    type: "Sell",
    market: "BTC/AUD",
    asset: "BTC",
    amount: 0.6,
    rateIncFee: 120120,
    rateExFee: 120000,
    fee: 72,
    feeCurrency: "AUD",
    feeAud: 79.2,
    gstAud: 7.2,
    totalAud: 71928,
    totalIncGst: 72000,
  },
  {
    transactionDate: new Date("2024-06-30T23:00:00.000Z"),
    type: "Buy",
    market: "ADA/AUD",
    asset: "ADA",
    amount: 1000,
    rateIncFee: 0.505,
    rateExFee: 0.5,
    fee: 5,
    feeCurrency: "AUD",
    feeAud: 5.5,
    gstAud: 0.5,
    totalAud: 500,
    totalIncGst: 505,
  },
  {
    transactionDate: new Date("2024-11-30T23:00:00.000Z"),
    type: "Sell",
    market: "ADA/AUD",
    asset: "ADA",
    amount: 500,
    rateIncFee: 0.808,
    rateExFee: 0.8,
    fee: 4,
    feeCurrency: "AUD",
    feeAud: 4.4,
    gstAud: 0.4,
    totalAud: 396,
    totalIncGst: 400,
  },
];

export const expectedBinanceTransactions: RawTransaction[] = [
  {
    transactionDate: new Date("2024-06-16T00:00:00.000Z"),
    type: "Buy",
    market: "ETHUSDT",
    asset: "ETH",
    amount: 1,
    rateIncFee: 5250,
    rateExFee: 5250,
    fee: 0.0005,
    feeCurrency: "BNB",
    feeAud: 0.45,
    gstAud: 0,
    totalAud: 5250.45,
    totalIncGst: 5250.45,
  },
  {
    transactionDate: new Date("2024-09-01T00:00:00.000Z"),
    type: "Sell",
    market: "ETHUSDT",
    asset: "ETH",
    amount: 0.5,
    rateIncFee: 6080,
    rateExFee: 6080,
    fee: 0.0004,
    feeCurrency: "BNB",
    feeAud: 0.3344,
    gstAud: 0,
    totalAud: 3039.6656,
    totalIncGst: 3039.6656,
  },
  {
    transactionDate: new Date("2024-09-02T00:00:00.000Z"),
    type: "Sell",
    market: "BTCUSDT",
    asset: "BTC",
    amount: 0.1,
    rateIncFee: 98800,
    rateExFee: 98800,
    fee: 0.0001,
    feeCurrency: "BNB",
    feeAud: 0.0836,
    gstAud: 0,
    totalAud: 9879.9164,
    totalIncGst: 9879.9164,
  },
  {
    transactionDate: new Date("2024-09-03T00:00:00.000Z"),
    type: "Sell",
    market: "SOLUSDT",
    asset: "SOL",
    amount: 10,
    rateIncFee: 228.75,
    rateExFee: 228.75,
    fee: 0.001,
    feeCurrency: "BNB",
    feeAud: 0.8235,
    gstAud: 0,
    totalAud: 2286.6765,
    totalIncGst: 2286.6765,
  },
  {
    transactionDate: new Date("2024-09-05T00:00:00.000Z"),
    type: "Buy",
    market: "ADAUSDT",
    asset: "ADA",
    amount: 1000,
    rateIncFee: 0.684,
    rateExFee: 0.684,
    fee: 0.45,
    feeCurrency: "USDT",
    feeAud: 0.684,
    gstAud: 0,
    totalAud: 684.684,
    totalIncGst: 684.684,
  },
];
