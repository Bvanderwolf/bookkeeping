import type { BusinessEvent, ScenarioInstance } from "./types";

export const activePlayDates = (instances: ScenarioInstance[]) =>
  [...new Set(instances
    .filter((item) => item.completedAt && item.mode !== "practice")
    .map((item) => item.assignedDate))].sort();

export function shouldCreateEvent(instances: ScenarioInstance[], events: BusinessEvent[]) {
  if (events.some((event) => !event.completedAt)) return false;
  const last = events.at(-1);
  return activePlayDates(instances).filter((date) => !last?.completedDate || date > last.completedDate).length >= 6;
}

export function nextEventType(events: BusinessEvent[], random = Math.random): BusinessEvent["type"] {
  const types = ["month-close", "accountant", "invoice-without-order"] as const;
  const available = types.filter((type) => type !== events.at(-1)?.type);
  return available[Math.floor(random() * available.length)];
}

export const eventBooking = (amountCents: number) => [
  { accountId: "general-costs", side: "debit" as const, amountCents },
  { accountId: "accrued-invoices", side: "credit" as const, amountCents },
];

export const invoiceWithoutOrderBooking = (amountCents: number) => [
  { accountId: "suspense", side: "debit" as const, amountCents },
  { accountId: "payables", side: "credit" as const, amountCents },
];
