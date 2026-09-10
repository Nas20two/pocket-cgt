import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportCSV, exportPDF } from "@/lib/reportExporter";
import { TaxLot, TaxSummary } from "@/lib/types";
import type { ParseFileSource } from "@/lib/csvParser";

interface ExportMenuProps {
  taxLots: TaxLot[];
  summary: TaxSummary;
  sources?: ParseFileSource[];
}

export function ExportMenu({ taxLots, summary, sources }: ExportMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => exportCSV(taxLots, sources)}>
          Download CSV Report
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportPDF(taxLots, summary)}>
          Download PDF Summary
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
