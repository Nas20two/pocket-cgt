import { useState, useMemo } from "react";
import { parseCSVFiles } from "@/lib/csvParser";
import { calculateTaxLots, calculateSummary, calculateCoinSummaries, getAvailableFinancialYears, filterByFinancialYear } from "@/lib/taxEngine";
import { RawTransaction, TaxLot, TaxSummary, CoinSummary, FinancialYear } from "@/lib/types";
import { CsvUpload, UploadedFile } from "@/components/CsvUpload";
import { SummaryCards } from "@/components/SummaryCards";
import { PerformanceTables } from "@/components/PerformanceTables";
import { TaxLedger } from "@/components/TaxLedger";
import { GainsChart } from "@/components/GainsChart";
import { ExportMenu } from "@/components/ExportMenu";
import { FinancialYearSelector } from "@/components/FinancialYearSelector";
import { Hero } from "@/components/Hero";
import { Footer } from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { ParseFileSource } from "@/lib/csvParser";

const Index = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [allTaxLots, setAllTaxLots] = useState<TaxLot[] | null>(null);
  const [allTransactions, setAllTransactions] = useState<RawTransaction[]>([]);
  const [unmatchedSells, setUnmatchedSells] = useState<RawTransaction[]>([]);
  const [selectedFY, setSelectedFY] = useState<string>("all");
  const [sources, setSources] = useState<ParseFileSource[]>([]);
  const { toast } = useToast();

  const financialYears = useMemo(
    () => (allTaxLots ? getAvailableFinancialYears(allTaxLots) : []),
    [allTaxLots]
  );

  const filteredLots = useMemo(() => {
    if (!allTaxLots) return null;
    if (selectedFY === "all") return allTaxLots;
    const fy = financialYears.find((f) => f.label === selectedFY);
    return fy ? filterByFinancialYear(allTaxLots, fy) : allTaxLots;
  }, [allTaxLots, selectedFY, financialYears]);

  const summary = useMemo(
    () => (filteredLots ? calculateSummary(filteredLots, allTransactions) : null),
    [filteredLots, allTransactions]
  );

  const { gains, losses } = useMemo(
    () => (filteredLots ? calculateCoinSummaries(filteredLots) : { gains: [], losses: [] }),
    [filteredLots]
  );

  const handleFilesChange = async (files: UploadedFile[]) => {
    setUploadedFiles(files);
    if (files.length === 0) {
      setAllTaxLots(null);
      setAllTransactions([]);
      setUnmatchedSells([]);
      setSources([]);
      return;
    }

    setIsLoading(true);
    try {
      const rawFiles = files.map((f) => f.file);
      const { transactions, warnings, errors, sources: parsedSources } = await parseCSVFiles(rawFiles);

      if (errors.length > 0) {
        errors.forEach((err) =>
          toast({ title: "CSV error", description: err, variant: "destructive" })
        );
      }

      if (warnings.length > 0) {
        const message = warnings.slice(0, 5).join("\n") + (warnings.length > 5 ? "\n…" : "");
        toast({ title: "CSV warnings", description: message });
      }

      if (transactions.length === 0) {
        toast({ title: "No transactions found", variant: "destructive" });
        setAllTaxLots(null);
        setAllTransactions([]);
        setUnmatchedSells([]);
        setSources([]);
        setIsLoading(false);
        return;
      }

      const { lots, unmatchedSells: unmatched } = calculateTaxLots(transactions);
      setAllTaxLots(lots);
      setAllTransactions(transactions);
      setUnmatchedSells(unmatched);
      setSources(parsedSources);
      setSelectedFY("all");
      toast({ title: `Processed ${transactions.length} transactions → ${lots.length} tax lots` });
    } catch (err: unknown) {
      toast({ title: "Error processing CSV", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">
              Pocket CGT
            </h1>
            <p className="text-xs text-muted-foreground">
              Australian crypto capital gains — 100% client-side
            </p>
          </div>
          <div className="flex items-center gap-2">
            {summary && filteredLots && (
              <>
                <FinancialYearSelector
                  financialYears={financialYears}
                  selected={selectedFY}
                  onSelect={setSelectedFY}
                />
                <ExportMenu taxLots={filteredLots} summary={summary} sources={sources} />
              </>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto flex-1 space-y-6 px-4 py-6">
        <Hero />

        <CsvUpload
          files={uploadedFiles}
          onFilesChange={handleFilesChange}
          isLoading={isLoading}
        />

        {unmatchedSells.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Unmatched sell(s) detected</AlertTitle>
            <AlertDescription>
              The following sells have no matching buys in the uploaded data. Add the missing buy CSV before generating a report:
              <ul className="mt-2 list-disc pl-5">
                {unmatchedSells.map((tx, i) => (
                  <li key={i}>
                    {tx.asset}: {tx.amount.toLocaleString("en-AU", { maximumFractionDigits: 8 })} sold on{" "}
                    {tx.transactionDate.toLocaleDateString("en-AU")}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {summary && filteredLots && unmatchedSells.length === 0 && (
          <>
            <SummaryCards summary={summary} />
            <GainsChart taxLots={filteredLots} />
            <PerformanceTables gains={gains} losses={losses} />
            <TaxLedger lots={filteredLots} />
          </>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Index;
