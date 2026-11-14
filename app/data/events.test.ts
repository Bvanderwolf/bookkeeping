import { describe, expect, it, vi } from "vitest";
import { calculateFinancials } from "../domain/accounting";
import type { BusinessEvent, CompanyProfile, ScenarioInstance } from "../domain/types";
import { createRepository, freshProgress } from "./repository";

const profile: CompanyProfile = { id: "event-company", name: "Eventzaak", sectorId: "shop", offeringId: "stationery", createdAt: "2026-11-01T09:00:00.000Z" };
const instance = (day: number): ScenarioInstance => ({
  id: `daily-2026-11-${String(day).padStart(2, "0")}`, templateId: "buy-equipment", mode: day === 1 ? "tutorial" : "daily",
  assignedDate: `2026-11-${String(day).padStart(2, "0")}`, seed: 0, amountCents: 100, title: "", story: "", solution: [], hint: "", explanation: "", sceneEffect: "", completedAt: `2026-11-${String(day).padStart(2, "0")}T10:00:00.000Z`,
});

describe("eventopslag", () => {
  it("bewaart en verwerkt een factuur zonder bestelling één keer zonder resultaat- of voortgangseffect", async () => {
    const repository = createRepository(`events-${crypto.randomUUID()}`);
    await repository.saveProfile(profile);
    await repository.saveProgress(freshProgress());
    const random = vi.spyOn(Math, "random").mockReturnValue(0.99);
    let event: BusinessEvent;
    try {
      event = await repository.createExtraEvent();
    } finally {
      random.mockRestore();
    }
    expect(event.type).toBe("invoice-without-order");
    expect(event.amountCents).toBeGreaterThan(0);
    await repository.completeEvent(event.id);
    await repository.completeEvent(event.id);
    const result = await repository.load();
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].lines).toEqual([
      { accountId: "suspense", side: "debit", amountCents: event.amountCents },
      { accountId: "payables", side: "credit", amountCents: event.amountCents },
    ]);
    const financials = calculateFinancials(result.entries);
    expect(financials.assets).toBe(event.amountCents);
    expect(financials.liabilities).toBe(event.amountCents);
    expect(financials.result).toBe(0);
    expect(result.progress).toEqual(freshProgress());
    expect(result.events?.[0].completedAt).toBeTruthy();
  });

  it("maakt na zes bestaande speeldagen één duurzaam event en rondt de maandafsluiting één keer af", async () => {
    const repository = createRepository(`events-${crypto.randomUUID()}`);
    await repository.saveProfile(profile);
    await repository.saveProgress(freshProgress());
    for (let day = 1; day <= 5; day += 1) await repository.saveInstance(instance(day));
    await repository.ensureDueEvent();
    expect((await repository.load()).events).toEqual([]);
    await repository.saveInstance(instance(6));
    await repository.ensureDueEvent();
    await repository.ensureDueEvent();
    const events = (await repository.load()).events!;
    expect(events).toHaveLength(1);
    const monthClose: BusinessEvent = { ...events[0], type: "month-close", amountCents: 30_000 };
    await repository.importData({ ...(await repository.load()), events: [monthClose] });
    await repository.completeEvent(monthClose.id);
    await repository.completeEvent(monthClose.id);
    const result = await repository.load();
    expect(result.events?.[0].completedAt).toBeTruthy();
    expect(result.entries).toHaveLength(1);
    expect(calculateFinancials(result.entries).result).toBe(-30_000);
    expect(calculateFinancials(result.entries).liabilities).toBe(30_000);
    expect(result.progress).toEqual(freshProgress());
    await repository.reset();
    expect((await repository.load()).events).toEqual([]);
  });

  it("bewaart quizantwoorden en kan een oude reservekopie zonder events importeren", async () => {
    const repository = createRepository(`events-${crypto.randomUUID()}`);
    await repository.saveProfile(profile);
    await repository.saveProgress(freshProgress());
    for (let day = 1; day <= 6; day += 1) await repository.saveInstance(instance(day));
    await repository.ensureDueEvent();
    const original = await repository.load();
    const event = { ...original.events![0], type: "accountant" as const, answeredQuestions: 0 };
    await repository.importData({ ...original, events: [event] });
    await repository.answerEventQuestion(event.id, 1);
    await repository.completeEvent(event.id);
    expect((await repository.load()).events?.[0].completedAt).toBeUndefined();
    await repository.answerEventQuestion(event.id, 2);
    await repository.answerEventQuestion(event.id, 3);
    await repository.completeEvent(event.id);
    expect((await repository.load()).events?.[0].completedAt).toBeTruthy();
    await repository.importData({ ...original, events: undefined });
    expect((await repository.load()).events).toEqual([]);
    await repository.ensureDueEvent();
    expect((await repository.load()).events).toHaveLength(1);
  });
});
