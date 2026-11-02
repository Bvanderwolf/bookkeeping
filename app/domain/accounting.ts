import { ACCOUNTS, accountById } from "./accounts";
import type { FinancialSnapshot, JournalEntry, JournalLine } from "./types";

export function sumSides(lines: JournalLine[]) {
  return lines.reduce(
    (total, line) => {
      total[line.side] += line.amountCents;
      return total;
    },
    { debit: 0, credit: 0 },
  );
}
export function isBalanced(lines: JournalLine[]) {
  const totals = sumSides(lines);
  return lines.length >= 2 && totals.debit > 0 && totals.debit === totals.credit;
}

export function sameBooking(actual: JournalLine[], expected: JournalLine[]) {
  const clean = (lines: JournalLine[]) =>
    lines
      .filter((line) => line.accountId && line.amountCents > 0)
      .map((line) => `${line.accountId}|${line.side}|${line.amountCents}`)
      .sort();
  return JSON.stringify(clean(actual)) === JSON.stringify(clean(expected));
}

export function calculateFinancials(entries: JournalEntry[]): FinancialSnapshot {
  const balances: Record<string, number> = Object.fromEntries(ACCOUNTS.map((account) => [account.id, 0]));

  for (const entry of entries) {
    for (const line of entry.lines) {
      const account = accountById(line.accountId);
      if (!account) continue;
      const increases = line.side === account.normalSide;
      balances[account.id] += increases ? line.amountCents : -line.amountCents;
    }
  }

  const totalFor = (type: string) =>
    ACCOUNTS.filter((account) => account.type === type).reduce(
      (sum, account) => sum + (balances[account.id] ?? 0),
      0,
    );

  const revenue = totalFor("revenue");
  const expenses = totalFor("expense");
  return {
    balances,
    assets: totalFor("asset"),
    liabilities: totalFor("liability"),
    equity: totalFor("equity"),
    revenue,
    expenses,
    result: revenue - expenses,
    bank: balances.bank ?? 0,
  };
}
