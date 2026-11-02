import { Plus, Trash2 } from "lucide-react";
import { ACCOUNTS, formatMoney } from "../domain/accounts";
import { isBalanced, sumSides } from "../domain/accounting";
import type { JournalLine } from "../domain/types";
import styles from "./components.module.css";

export interface DraftBookingLine {
  key: string;
  accountId: string;
  side: "debit" | "credit";
  amount: string;
}

const newLine = (index: number): DraftBookingLine => ({
  key: `${Date.now()}-${index}-${Math.random()}`,
  accountId: "",
  side: index === 0 ? "debit" : "credit",
  amount: "",
});

export const createDraftBookingLines = () => [newLine(0), newLine(1)];

export const toCents = (value: string) => {
  const normalized = value.replace(/\s/g, "").replace(",", ".");
  const amount = Number.parseFloat(normalized);
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
};

export const draftLinesToJournalLines = (lines: DraftBookingLine[]): JournalLine[] =>
  lines.map((line) => ({
    accountId: line.accountId,
    side: line.side,
    amountCents: toCents(line.amount),
  }));

export function BookingLinesEditor({
  lines,
  onChange,
}: {
  lines: DraftBookingLine[];
  onChange: (lines: DraftBookingLine[]) => void;
}) {
  const booking = draftLinesToJournalLines(lines);
  const totals = sumSides(booking);
  const balanced = isBalanced(booking);

  const updateLine = (key: string, patch: Partial<DraftBookingLine>) => {
    onChange(lines.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  };

  return (
    <>
      <div className={styles.lines}>
        {lines.map((line, index) => (
          <fieldset className={styles.bookingLine} key={line.key}>
            <legend>Boekingsregel {index + 1}</legend>
            <label>
              Rekening
              <select
                value={line.accountId}
                onChange={(event) => updateLine(line.key, { accountId: event.target.value })}
              >
                <option value="">Kies een rekening</option>
                {ACCOUNTS.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.code} · {account.name}
                  </option>
                ))}
              </select>
            </label>
            <div className={styles.lineRow}>
              <label>
                Zijde
                <select
                  value={line.side}
                  onChange={(event) => updateLine(line.key, { side: event.target.value as "debit" | "credit" })}
                >
                  <option value="debit">Debet</option>
                  <option value="credit">Credit</option>
                </select>
              </label>
              <label>
                Bedrag
                <span className={styles.moneyInput}>
                  <span>€</span>
                  <input
                    inputMode="decimal"
                    placeholder="0,00"
                    value={line.amount}
                    onChange={(event) => updateLine(line.key, { amount: event.target.value })}
                  />
                </span>
              </label>
              {lines.length > 2 && (
                <button
                  type="button"
                  className={styles.removeLine}
                  onClick={() => onChange(lines.filter((item) => item.key !== line.key))}
                  aria-label={`Verwijder regel ${index + 1}`}
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          </fieldset>
        ))}
      </div>

      {lines.length < 4 && (
        <button
          type="button"
          className={styles.addLine}
          onClick={() => onChange([...lines, newLine(lines.length)])}
        >
          <Plus size={18} /> Voeg boekingsregel toe
        </button>
      )}

      <div className={styles.balanceBar}>
        <div><span>Debet</span><strong>{formatMoney(totals.debit)}</strong></div>
        <div className={styles.balanceTrack}>
          <span
            style={{
              width: balanced
                ? "100%"
                : `${Math.min(100, Math.max(totals.debit, totals.credit)
                  ? Math.min(totals.debit, totals.credit) / Math.max(totals.debit, totals.credit) * 100
                  : 0)}%`,
            }}
          />
        </div>
        <div><span>Credit</span><strong>{formatMoney(totals.credit)}</strong></div>
      </div>
    </>
  );
}
