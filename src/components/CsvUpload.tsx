import { useCallback, useState } from "react";
import { Upload, FileText, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { detectExchangeFromFile } from "@/lib/exchange/detectExchange";

export interface UploadedFile {
  file: File;
  exchange: string;
}

interface CsvUploadProps {
  files: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
  isLoading: boolean;
}

function exchangeLabel(exchange: string): string {
  return exchange === "coinspot"
    ? "CoinSpot"
    : exchange === "binance"
    ? "Binance"
    : "Unknown";
}

function exchangeColor(exchange: string): string {
  if (exchange === "coinspot") return "bg-emerald-100 text-emerald-700";
  if (exchange === "binance") return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
}

export function CsvUpload({ files, onFilesChange, isLoading }: CsvUploadProps) {
  const [isDragging, setIsDragging] = useState(false);

  const addFiles = useCallback(
    async (newFiles: FileList | null) => {
      if (!newFiles) return;
      const additions: UploadedFile[] = [];
      for (const file of Array.from(newFiles)) {
        if (!file.name.endsWith(".csv")) continue;
        const exchange = await detectExchangeFromFile(file);
        additions.push({ file, exchange });
      }
      if (additions.length > 0) {
        onFilesChange([...files, ...additions]);
      }
    },
    [files, onFilesChange]
  );

  const removeFile = useCallback(
    (index: number) => {
      const next = [...files];
      next.splice(index, 1);
      onFilesChange(next);
    },
    [files, onFilesChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <div className="space-y-4">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-all cursor-pointer ${
          isDragging
            ? "border-primary bg-primary/5 scale-[1.01]"
            : "border-border hover:border-primary/50 hover:bg-muted/50"
        }`}
        onClick={() => {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = ".csv";
          input.multiple = true;
          input.onchange = (e) => {
            addFiles((e.target as HTMLInputElement).files);
          };
          input.click();
        }}
      >
        {isLoading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary" />
            <p className="text-sm text-muted-foreground">Processing CSV…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Upload className="h-10 w-10 text-muted-foreground" />
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                Drop your CoinSpot or Binance CSV files here
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                or click to browse — all processing is done locally in your
                browser
              </p>
            </div>
          </div>
        )}
      </div>

      {files.length > 0 && (
        <div className="rounded-lg border bg-card p-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Uploaded files
          </p>
          <ul className="space-y-2">
            {files.map((uploaded, index) => (
              <li
                key={`${uploaded.file.name}-${index}`}
                className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-4 w-4 shrink-0 text-primary" />
                  <span className="truncate text-sm font-medium">
                    {uploaded.file.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    variant="secondary"
                    className={`${exchangeColor(uploaded.exchange)} capitalize`}
                  >
                    {exchangeLabel(uploaded.exchange)}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(index);
                    }}
                    aria-label="Remove file"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
