import { Calculator, ShieldCheck, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function Hero() {
  return (
    <section className="relative overflow-hidden rounded-2xl border bg-card px-6 py-10 sm:px-10 sm:py-14">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-sky-500 to-indigo-500" />
      <div className="relative mx-auto max-w-3xl text-center">
        <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
          <Badge variant="secondary" className="gap-1 font-normal">
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            Free & client-side
          </Badge>
          <Badge variant="outline" className="font-normal">
            ATO-friendly reports
          </Badge>
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl md:text-5xl">
          Pocket CGT
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-base text-muted-foreground sm:text-lg">
          Australian crypto tax, made simple. Upload your exchange CSVs and get
          a FIFO capital gains report in seconds — no data leaves your device.
        </p>

        <div className="mx-auto mt-6 flex max-w-md flex-col items-center gap-3 text-sm text-muted-foreground sm:flex-row sm:justify-center">
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-primary" aria-hidden="true" />
            <span>CoinSpot + Binance</span>
          </div>
          <span className="hidden sm:inline text-border">|</span>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
            <span>100% private</span>
          </div>
        </div>
      </div>
    </section>
  );
}
