import { Heart } from "lucide-react";
import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="border-t bg-background py-6">
      <div className="container mx-auto flex flex-col items-center justify-center gap-2 px-4 text-center sm:flex-row sm:gap-3">
        <p className="text-xs text-muted-foreground">
          Built with{" "}
          <Heart className="inline h-3 w-3 fill-current text-destructive" aria-hidden="true" />{" "}
          by{" "}
          <a
            href="https://www.nasyhub.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground underline underline-offset-2 transition-colors hover:text-primary"
          >
            Nasyhub
          </a>
        </p>
        <span className="hidden text-muted-foreground sm:inline">·</span>
        <a
          href="https://www.nasyhub.com/ai"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium text-foreground underline underline-offset-2 transition-colors hover:text-primary"
        >
          AI portfolio
        </a>
        <span className="hidden text-muted-foreground sm:inline">·</span>
        <Link
          to="/privacy"
          className="text-xs font-medium text-foreground underline underline-offset-2 transition-colors hover:text-primary"
        >
          Privacy & Terms
        </Link>
      </div>
    </footer>
  );
}
