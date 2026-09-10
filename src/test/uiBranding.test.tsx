import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Hero } from "@/components/Hero";
import { Footer } from "@/components/Footer";
import { CsvUpload } from "@/components/CsvUpload";
import Privacy from "@/pages/Privacy";

vi.mock("@/lib/exchange/detectExchange", () => ({
  detectExchangeFromFile: vi.fn(),
}));

describe("Hero", () => {
  it("renders product name and tagline", () => {
    render(<Hero />);
    expect(screen.getByRole("heading", { name: /Pocket CGT/i })).toBeInTheDocument();
    expect(screen.getByText(/Australian crypto tax, made simple/i)).toBeInTheDocument();
  });
});

describe("Footer", () => {
  it("links to Nasyhub and AI portfolio", () => {
    render(<Footer />, { wrapper: MemoryRouter });
    expect(screen.getByRole("link", { name: /Nasyhub/i })).toHaveAttribute("href", "https://www.nasyhub.com");
    expect(screen.getByRole("link", { name: /AI portfolio/i })).toHaveAttribute("href", "https://www.nasyhub.com/ai");
  });

  it("links to the privacy page", () => {
    render(<Footer />, { wrapper: MemoryRouter });
    expect(screen.getByRole("link", { name: /Privacy & Terms/i })).toHaveAttribute("href", "/privacy");
  });
});

describe("CsvUpload empty state", () => {
  it("shows friendly empty state with feature bullets", () => {
    render(<CsvUpload files={[]} onFilesChange={() => {}} isLoading={false} />);
    expect(screen.getByText(/Upload your CoinSpot or Binance CSV/i)).toBeInTheDocument();
    expect(screen.getByText(/Auto currency conversion/i)).toBeInTheDocument();
    expect(screen.getByText(/FIFO tax-lot matching/i)).toBeInTheDocument();
    expect(screen.getByText(/CGT report/i)).toBeInTheDocument();
    expect(screen.getByText(/Privacy first/i)).toBeInTheDocument();
  });
});

describe("Privacy page", () => {
  it("renders privacy disclosures", () => {
    render(<Privacy />, { wrapper: MemoryRouter });
    expect(screen.getByRole("heading", { name: /Privacy & Terms/i })).toBeInTheDocument();
    expect(screen.getByText(/Your data stays on your device/i)).toBeInTheDocument();
    expect(screen.getByText(/not affiliated with or endorsed by the Australian Taxation Office/i)).toBeInTheDocument();
  });
});
