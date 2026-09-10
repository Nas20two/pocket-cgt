import { useState, useMemo } from "react";
import { parseCSV } from "@/lib/csvParser";
import { calculateTaxLots, calculateSummary, calculateCoinSummaries, getAvailableFinancialYears, filterByFinancialYear } from "@/lib/taxEngine";
import { RawTransaction, TaxLot, TaxSummary, CoinSummary, FinancialYear } from "@/lib/types";
import { CsvUpload } from "@/components/CsvUpload";
import { SummaryCards } from "@/components/SummaryCards";
import { PerformanceTables } from "@/components/PerformanceTables";
import { TaxLedger } from "@/components/TaxLedger";
import { GainsChart } from "@/components/GainsChart";
import { ExportMenu } from "@/components/ExportMenu";
import { FinancialYearSelector } from "@/components/FinancialYearSelector";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [allTaxLots, setAllTaxLots] = useState<TaxLot[] | null>(null);
  const [allTransactions, setAllTransactions] = useState<RawTransaction[]>([]);
  const [selectedFY, setSelectedFY] = useState<string>("all");
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

  const handleFile = async (file: File) => {
    setIsLoading(true);
    try {
      const transactions: RawTransaction[] = await parseCSV(file);
      if (transactions.length === 0) {
        toast({ title: "No Buy/Sell transactions found", variant: "destructive" });
        setIsLoading(false);
        return;
      }
      const lots = calculateTaxLots(transactions);
      setAllTaxLots(lots);
      setAllTransactions(transactions);
      setSelectedFY("all");
      toast({ title: `Processed ${transactions.length} transactions → ${lots.length} tax lots` });
    } catch (err: unknown) {
      toast({ title: "Error parsing CSV", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
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
                <ExportMenu taxLots={filteredLots} summary={summary} />
              </>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto space-y-6 px-4 py-6">
        <CsvUpload onFileSelect={handleFile} isLoading={isLoading} />

        {summary && filteredLots && (
          <>
            <SummaryCards summary={summary} />
            <GainsChart taxLots={filteredLots} />
            <PerformanceTables gains={gains} losses={losses} />
            <TaxLedger lots={filteredLots} />
          </>
        )}
      </main>
    </div>
  );
};

export default Index;
