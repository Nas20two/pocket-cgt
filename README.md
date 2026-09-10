# Pocket CGT

A free, privacy-first crypto capital gains tax calculator for Australian taxpayers. All CSV processing, FIFO tax-lot matching and report generation happens in your browser — no data is uploaded to any server.

**Live app:** https://app.pocketcgt.com  
**Repository:** https://github.com/nasyhub/pocket-cgt

## What is Pocket CGT?

Pocket CGT turns exchange transaction CSVs into Australian Taxation Office (ATO) friendly capital gains reports. It uses FIFO (First-In, First-Out) lot matching, handles short- and long-term CGT discounts, and produces summary tables, charts, and downloadable CSV/PDF reports.

## Features

- **Client-side only** — your transaction data never leaves your device
- **Multi-exchange support** — merge histories from multiple exchanges in one report
- **FIFO tax-lot matching** — ATO-compliant short-term / long-term gain classification
- **Financial-year filtering** — focus on the exact AU FY you need to report
- **Summary cards, charts and ledger** — see gains, losses, and per-asset performance at a glance
- **CSV + PDF export** — download a detailed ledger or ATO-style summary
- **No sign-up, no pricing gate** — drop your files in and get your report

## Supported Exchanges

| Exchange | Status | Notes |
|----------|--------|-------|
| CoinSpot | ✅ Supported | `orderhistory.csv` export |
| Binance  | ✅ Supported | Spot trade history export |

Want support for another exchange? See [Contributing](#contributing).

## How to Use

### Local development

```bash
# Clone the repo
git clone https://github.com/nasyhub/pocket-cgt.git
cd pocket-cgt

# Install dependencies
npm install

# Start the dev server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

### Generating a report

1. Export your transaction history from each supported exchange as CSV.
2. Open the app and drop the files onto the upload area.
3. Review the summary cards, ledger, and charts.
4. Select the financial year you need to report.
5. Export the CSV ledger or PDF summary for your accountant.

> ⚠️ **Not financial advice.** Always verify the output with a registered tax agent before lodging your tax return.

## Tech Stack

- **Framework:** React 18 + TypeScript
- **Build tool:** Vite
- **Styling:** Tailwind CSS + shadcn/ui
- **Charts:** Recharts
- **PDF export:** jsPDF
- **CSV parsing:** PapaParse
- **Testing:** Vitest + React Testing Library

## Contributing

Contributions are welcome, especially new exchange CSV parsers and tests.

1. Fork the repository.
2. Create a feature branch: `git checkout -b feat/your-feature`.
3. Make your changes and add tests.
4. Ensure `npm test` and `npm run build` pass.
5. Open a pull request with a clear description and, where relevant, a fixture CSV + expected output.

Please keep the app 100% client-side and avoid adding backend dependencies or paid feature gates.

## Credits

Built by [NaSy Hub](https://nasyhub-olve.vercel.app).

## License

[MIT](./LICENSE)
