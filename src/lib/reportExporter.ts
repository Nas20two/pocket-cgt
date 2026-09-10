import { jsPDF } from "jspdf";
import { TaxLot, TaxSummary } from "./types";
import { format } from "date-fns";
import type { ParseFileSource } from "./csvParser";

function formatDate(d: Date): string {
  return format(d, "dd/MM/yyyy HH:mm");
}

function formatNumber(n: number): string {
  return n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getReportYear(taxLots: TaxLot[]): string {
  if (taxLots.length === 0) return format(new Date(), "yyyy");
  const latest = new Date(
    Math.max(...taxLots.flatMap((l) => [l.dateSold.getTime(), l.dateAcquired.getTime()]))
  );
  return format(latest, "yyyy");
}

function getWalletName(sources?: ParseFileSource[]): string {
  if (!sources || sources.length === 0) return "";
  const exchanges = new Set(sources.map((s) => s.exchange));
  if (exchanges.size === 1) {
    const exchange = Array.from(exchanges)[0];
    return exchange === "coinspot" ? "CoinSpot" : exchange === "binance" ? "Binance" : exchange;
  }
  return "Multiple";
}

export function exportCSV(taxLots: TaxLot[], sources?: ParseFileSource[]): void {
  const year = getReportYear(taxLots);
  const walletName = getWalletName(sources);
  const header = `Capital gains report ${year}`;
  const columns = [
    "Date Sold",
    "Date Acquired",
    "Asset",
    "Amount",
    "Cost (AUD)",
    "Proceeds (AUD)",
    "Gain / loss",
    "Notes",
    "Wallet Name",
    "Holding period",
  ];

  const rows = taxLots.map((lot) => [
    formatDate(lot.dateSold),
    formatDate(lot.dateAcquired),
    lot.asset,
    formatNumber(lot.amount),
    formatNumber(lot.costAud),
    formatNumber(lot.proceedsAud),
    formatNumber(lot.gainLoss),
    "",
    walletName,
    lot.holdingPeriod,
  ]);

  const csvContent = [header, columns.join(","), ...rows.map((r) => r.join(","))].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `capital_gains_report_${year}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportPDF(taxLots: TaxLot[], summary: TaxSummary): void {
  const doc = new jsPDF();

  // Determine period from data
  const dates = taxLots.flatMap((l) => [l.dateSold, l.dateAcquired]);
  const earliest = new Date(Math.min(...dates.map((d) => d.getTime())));
  const latest = new Date(Math.max(...dates.map((d) => d.getTime())));
  const periodStr = `${format(earliest, "dd MMM yyyy")} – ${format(latest, "dd MMM yyyy")}`;
  const reportYear = getReportYear(taxLots);
  const generatedAt = format(new Date(), "dd MMM yyyy HH:mm");

  const pageWidth = doc.internal.pageSize.getWidth();

  // Title
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(`Australian Summary Report ${reportYear}`, pageWidth / 2, 25, { align: "center" });

  // Period
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Period: ${periodStr}`, pageWidth / 2, 34, { align: "center" });

  // Methodology
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text("Methodology: FIFO (First-In, First-Out) · All calculations performed client-side", pageWidth / 2, 41, { align: "center" });
  doc.setTextColor(0);

  // Summary table
  let y = 55;
  const leftX = 25;
  const rightX = pageWidth - 25;

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Capital Gains Summary", leftX, y);
  y += 10;

  // Table header
  doc.setFillColor(240, 240, 240);
  doc.rect(leftX, y - 5, rightX - leftX, 8, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Description", leftX + 3, y);
  doc.text("Amount (AUD)", rightX - 3, y, { align: "right" });
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  const totalGrossProfit = summary.shortTerm.grossProfit + summary.longTerm.grossProfit;
  const totalLosses = Math.min(0, summary.shortTerm.netCapitalGains < 0 ? summary.shortTerm.netCapitalGains : 0) +
    Math.min(0, summary.longTerm.capitalGainsBeforeDiscount < 0 ? summary.longTerm.capitalGainsBeforeDiscount : 0);
  const netAfterLosses = totalGrossProfit + totalLosses;
  const longTermDiscount = summary.longTerm.capitalGainsBeforeDiscount > 0
    ? summary.longTerm.capitalGainsBeforeDiscount * 0.5
    : 0;

  const rows: [string, string][] = [
    ["Total current year capital gains", `$${formatNumber(Math.max(0, totalGrossProfit))}`],
    ["Total current year capital losses", `($${formatNumber(Math.abs(totalLosses))})`],
    ["Net capital gains", `$${formatNumber(Math.max(0, netAfterLosses))}`],
    ["50% CGT discount (long-term holdings)", `($${formatNumber(longTermDiscount)})`],
    ["Net capital gains after CGT discount", `$${formatNumber(summary.totalNetCapitalGains)}`],
  ];

  rows.forEach(([label, value], i) => {
    if (i % 2 === 1) {
      doc.setFillColor(248, 248, 248);
      doc.rect(leftX, y - 5, rightX - leftX, 8, "F");
    }
    const isBold = i === rows.length - 1;
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    doc.text(label, leftX + 3, y);
    doc.text(value, rightX - 3, y, { align: "right" });
    y += 10;
  });

  // Breakdown section
  y += 8;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Breakdown", leftX, y);
  y += 10;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");

  const breakdownRows: [string, string][] = [
    ["Short-term gross profit", `$${formatNumber(summary.shortTerm.grossProfit)}`],
    ["Short-term fees", `$${formatNumber(summary.shortTerm.fees)}`],
    ["Short-term net capital gains", `$${formatNumber(summary.shortTerm.netCapitalGains)}`],
    ["", ""],
    ["Long-term gross profit", `$${formatNumber(summary.longTerm.grossProfit)}`],
    ["Long-term fees", `$${formatNumber(summary.longTerm.fees)}`],
    ["Long-term capital gains (before discount)", `$${formatNumber(summary.longTerm.capitalGainsBeforeDiscount)}`],
    ["Long-term net capital gains (after 50% discount)", `$${formatNumber(summary.longTerm.netCapitalGains)}`],
  ];

  breakdownRows.forEach(([label, value]) => {
    if (label === "") { y += 4; return; }
    doc.text(label, leftX + 3, y);
    doc.text(value, rightX - 3, y, { align: "right" });
    y += 7;
  });

  // Disclaimer footer
  y += 15;
  doc.setFontSize(8);
  doc.setTextColor(130);
  const disclaimerLines = [
    "This report is generated by Pocket CGT and is not affiliated with or endorsed by the Australian Taxation Office (ATO).",
    `Generated on ${generatedAt} using FIFO (First-In, First-Out) lot matching. You are responsible for ensuring FIFO matches`,
    "your elected tax treatment. Exchange rates are approximate daily close values from CoinGecko and may differ from your",
    "exchange's actual rate. Figures are rounded and should be verified with a registered tax agent before lodging your return.",
  ];
  disclaimerLines.forEach((line) => {
    doc.text(line, pageWidth / 2, y, { align: "center" });
    y += 4.5;
  });

  doc.save(`australian_summary_report_${reportYear}.pdf`);
}
