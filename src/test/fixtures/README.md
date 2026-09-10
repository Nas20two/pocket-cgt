# Parser Test Fixtures

These CSVs are the canonical input/output specs for the Pocket CGT exchange parsers. They are intentionally small so humans can reason about every row.

## Files

| File | Purpose |
|------|---------|
| `coinspot.csv` | CoinSpot `orderhistory.csv` export (AUD, DD/MM/YYYY, AEDT/AEST) |
| `binance.csv` | Binance spot trade history export (USDT, ISO-ish UTC, BNB/USDT fees) |
| `expected.ts` | Expected `RawTransaction[]` arrays after parsing + conversion |

## Conversion assumptions

- **CoinSpot dates** are interpreted as `Australia/Sydney` local time and converted to UTC epoch milliseconds for sorting.
- **Binance dates** are UTC (`YYYY-MM-DD HH:MM:SS` or ISO-8601).
- **USDT → AUD** rates are daily closes used only for fixture expectations:
  - 2024-06-16: 1.50
  - 2024-09-01/02/05: 1.52
  - 2024-09-03: 1.525
- **BNB → USDT** rates used for BNB fee conversion:
  - 2024-06-16: 600
  - 2024-09-01/02: 550
  - 2024-09-03: 540
- Binance quote-asset values are converted to AUD **without** adding the fee to `totalAud`. The converted fee is stored separately in `feeAud` to match the existing CoinSpot schema.

## Edge cases covered

### CoinSpot (`coinspot.csv`)

1. Buy and sell rows only; other row types are ignored.
2. Local date format with AM/PM.
3. Asset extracted from `Market` (e.g. `BTC/AUD` → `BTC`).
4. Multiple buys of the same asset followed by a partial sell (FIFO exercise).

### Binance (`binance.csv`)

1. **Spot buy with BNB fee** — row 1 (`ETHUSDT` BUY).
2. **Spot sell with BNB fee** — row 2 (`ETHUSDT` SELL).
3. **Cross-exchange FIFO** — row 3 (`BTCUSDT` SELL) will match against the CoinSpot BTC buys when files are merged.
4. **Unmatched sell** — row 4 (`SOLUSDT` SELL) has no corresponding SOL buy. The UI must halt with a non-dismissible warning (VEX 🔴 4.2).
5. **Futures/margin row** — row 5 (`BTCUSDT_PERP` BUY) must be rejected with a warning, not included in FIFO (VEX 1.2).
6. **USDT-denominated fee** — row 6 (`ADAUSDT` BUY) has `Fee Coin = USDT` and tests the non-BNB fee path.
7. **ISO vs `YYYY-MM-DD HH:MM:SS` date formats** — rows 1 and 6 are ISO-8601; rows 2-5 use the Binance text format.
8. **Asset extraction** — pair suffix stripped: `ETHUSDT` → `ETH`, `ADAUSDT` → `ADA` (VEX 1.3).

## Expected parser behaviour not yet in code

- Auto-detect exchange by header set (VEX 1.1).
- Reject unsupported pairs / Side values with a visible warning.
- Deduplicate identical trades across CoinSpot + Binance uploads by composite key (date, pair/side, amount, price) (VEX 3.3).

## Updating fixtures

If the parser design changes (e.g. fee inclusion in `totalAud`, date-time assumptions, or new columns), update `expected.ts` and this README in the same PR.
