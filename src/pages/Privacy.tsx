import { ArrowLeft, ShieldCheck, ServerOff, Globe, HardDrive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function Privacy() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">
              Pocket CGT
            </h1>
            <p className="text-xs text-muted-foreground">
              Australian crypto capital gains — 100% client-side
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
      </header>

      <main className="container mx-auto flex-1 max-w-2xl px-4 py-10">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">Privacy & Terms</h2>
          <p className="text-sm text-muted-foreground">
            Last updated: {new Date().toLocaleDateString("en-AU")}
          </p>
        </div>

        <div className="mt-8 space-y-8 text-sm leading-6 text-foreground">
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
              <h3 className="text-base font-semibold">Your data stays on your device</h3>
            </div>
            <p className="text-muted-foreground">
              Pocket CGT is a client-side application. Your transaction CSVs are
              parsed and processed entirely in your browser. We do not upload,
              store, or process your transaction data on any server.
            </p>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" aria-hidden="true" />
              <h3 className="text-base font-semibold">External data requests</h3>
            </div>
            <p className="text-muted-foreground">
              When converting non-AUD amounts (e.g. USDT), the app may request
              historical rates from the CoinGecko public API. These requests are
              made directly from your browser and expose your IP address and the
              requested coin/date to CoinGecko, not to Nasyhub.
            </p>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <HardDrive className="h-5 w-5 text-primary" aria-hidden="true" />
              <h3 className="text-base font-semibold">Local storage & caching</h3>
            </div>
            <p className="text-muted-foreground">
              Fetched exchange rates are cached in your browser's{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">localStorage</code>{" "}
              to avoid repeated API calls. No personal or transaction data is
              cached. The app may also use a service worker to cache the
              application shell for offline use.
            </p>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <ServerOff className="h-5 w-5 text-primary" aria-hidden="true" />
              <h3 className="text-base font-semibold">No account, no tracking</h3>
            </div>
            <p className="text-muted-foreground">
              We do not require sign-up, use analytics cookies, or sell data.
              This is a static, open-source tool.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-base font-semibold">Disclaimer</h3>
            <p className="text-muted-foreground">
              Pocket CGT is not affiliated with or endorsed by the Australian
              Taxation Office (ATO). The reports produced are for informational
              purposes only and should be reviewed by a registered tax agent
              before lodging your tax return.
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t bg-background py-6">
        <div className="container mx-auto px-4 text-center text-xs text-muted-foreground">
          Built by{" "}
          <a
            href="https://www.nasyhub.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground underline underline-offset-2 hover:text-primary"
          >
            Nasyhub
          </a>
        </div>
      </footer>
    </div>
  );
}
