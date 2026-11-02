import { describe, expect, it } from "vitest";
import { calculateFinancials, isBalanced, sameBooking } from "./accounting";
import type { JournalEntry } from "./types";

describe("boekhoudmotor", () => {
  it("herkent een gebalanceerde journaalpost", () => {
    const lines = [
      { accountId: "bank", side: "debit" as const, amountCents: 500_000 },
      { accountId: "capital", side: "credit" as const, amountCents: 500_000 },
    ];
    expect(isBalanced(lines)).toBe(true);
    expect(sameBooking([...lines].reverse(), lines)).toBe(true);
  });

  it("berekent balans en resultaat uit journaalposten", () => {
    const entries: JournalEntry[] = [
      { id: "1", scenarioInstanceId: "start", description: "Start", postedAt: "2026-01-01", lines: [
        { accountId: "bank", side: "debit", amountCents: 500_000 },
        { accountId: "capital", side: "credit", amountCents: 500_000 },
      ] },
      { id: "2", scenarioInstanceId: "sale", description: "Verkoop", postedAt: "2026-01-02", lines: [
        { accountId: "bank", side: "debit", amountCents: 20_000 },
        { accountId: "revenue", side: "credit", amountCents: 20_000 },
      ] },
      { id: "3", scenarioInstanceId: "rent", description: "Huur", postedAt: "2026-01-03", lines: [
        { accountId: "rent", side: "debit", amountCents: 8_000 },
        { accountId: "bank", side: "credit", amountCents: 8_000 },
      ] },
    ];
    const result = calculateFinancials(entries);
    expect(result.bank).toBe(512_000);
    expect(result.result).toBe(12_000);
    expect(result.assets).toBe(result.liabilities + result.equity + result.result);
  });
});
