import { describe, expect, it } from "vitest";
import { activePlayDates, eventBooking, invoiceWithoutOrderBooking, nextEventType, shouldCreateEvent } from "./events";
import type { BusinessEvent, ScenarioInstance } from "./types";

const instance = (date: string, mode: ScenarioInstance["mode"] = "daily", completed = true): ScenarioInstance => ({
  id: `${mode}-${date}-${Math.random()}`, templateId: "buy-equipment", mode, assignedDate: date,
  seed: 0, amountCents: 100, title: "", story: "", solution: [], hint: "", explanation: "", sceneEffect: "",
  completedAt: completed ? `${date}T10:00:00.000Z` : undefined,
});

describe("zes actieve speeldagen", () => {
  it("telt de eerste boeking, maar geen oefening, onvoltooide opdracht of extra scenario op dezelfde datum", () => {
    const dates = ["2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05"];
    const runs = [instance(dates[0], "tutorial"), ...dates.slice(1).map((date) => instance(date)), instance(dates[4]), instance("2026-11-06", "practice"), instance("2026-11-06", "daily", false)];
    expect(activePlayDates(runs)).toEqual(dates);
    expect(shouldCreateEvent(runs, [])).toBe(false);
    expect(shouldCreateEvent([...runs, instance("2026-11-06")], [])).toBe(true);
  });

  it("houdt een open event vast en telt na afronding zes nieuwe dagen", () => {
    const before = Array.from({ length: 6 }, (_, i) => instance(`2026-11-${String(i + 1).padStart(2, "0")}`));
    const open: BusinessEvent = { id: "event-1", type: "month-close", triggeredAt: "2026-11-06T10:00:00.000Z", answeredQuestions: 0 };
    expect(shouldCreateEvent([...before, instance("2026-11-07")], [open])).toBe(false);
    const done = { ...open, completedAt: "2026-11-08T10:00:00.000Z", completedDate: "2026-11-08" };
    const next = Array.from({ length: 6 }, (_, i) => instance(`2026-11-${String(i + 9).padStart(2, "0")}`));
    expect(shouldCreateEvent([...before, ...next.slice(0, 5)], [done])).toBe(false);
    expect(shouldCreateEvent([...before, ...next], [done])).toBe(true);
    expect(nextEventType([done], () => 0)).toBe("accountant");
    expect(nextEventType([done], () => 0.99)).toBe("invoice-without-order");
    expect(nextEventType([{ ...done, type: "accountant" }], () => 0)).toBe("month-close");
    expect(nextEventType([{ ...done, type: "accountant" }], () => 0.99)).toBe("invoice-without-order");
    expect(nextEventType([{ ...done, type: "invoice-without-order" }], () => 0)).toBe("month-close");
    expect(nextEventType([{ ...done, type: "invoice-without-order" }], () => 0.99)).toBe("accountant");
    expect(nextEventType([], () => 0.99)).toBe("invoice-without-order");
  });

  it("maakt een gebalanceerde maandafsluitingsboeking", () => {
    expect(eventBooking(30_000)).toEqual([
      { accountId: "general-costs", side: "debit", amountCents: 30_000 },
      { accountId: "accrued-invoices", side: "credit", amountCents: 30_000 },
    ]);
  });

  it("boekt een factuur zonder bestelling voorlopig op de tussenrekening", () => {
    expect(invoiceWithoutOrderBooking(30_000)).toEqual([
      { accountId: "suspense", side: "debit", amountCents: 30_000 },
      { accountId: "payables", side: "credit", amountCents: 30_000 },
    ]);
  });
});
