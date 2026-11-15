import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRepository } from "../data/repository";
import { standardPracticeTemplates } from "../domain/scenarios";
import { useAppModel } from "./useAppModel";

beforeEach(async () => {
  window.localStorage.clear();
  await createRepository().reset();
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

it("negeert opgeslagen ontwikkelaarsopties in een productiebuild", async () => {
  window.localStorage.setItem("mijn-bedrijf:unlimited-scenarios", "true");
  window.localStorage.setItem("mijn-bedrijf:unlimited-events", "true");
  vi.stubEnv("DEV", false);
  const { result } = renderHook(() => useAppModel());
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.unlimitedScenarios).toBe(false);
  expect(result.current.unlimitedEvents).toBe(false);

  await act(async () => {
    await result.current.createCompany("Productiebedrijf", "creative", "webdesign");
  });
  const advanced = standardPracticeTemplates(result.current.snapshot.profile!).find((template) => template.level === 3)!;
  await expect(result.current.startStandardPractice(advanced.id)).rejects.toThrow(/nog niet beschikbaar/);
  await expect(result.current.startExtraEvent()).rejects.toThrow(/staat uit/);
  act(() => {
    result.current.setUnlimitedScenariosEnabled(true);
    result.current.setUnlimitedEventsEnabled(true);
  });
  expect(result.current.unlimitedScenarios).toBe(false);
  expect(result.current.unlimitedEvents).toBe(false);
});

describe("onbeperkt scenario's oefenen", () => {
  it("bewaart de lokale voorkeur en ontgrendelt alle standaardoefeningen zonder het leerniveau te wijzigen", async () => {
    const { result, unmount } = renderHook(() => useAppModel());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.unlimitedScenarios).toBe(false);
    await act(async () => {
      await result.current.createCompany("Testbedrijf", "creative", "webdesign");
    });
    const advanced = standardPracticeTemplates(result.current.snapshot.profile!).find((template) => template.level === 3)!;
    await expect(result.current.startStandardPractice(advanced.id)).rejects.toThrow(/nog niet beschikbaar/);

    act(() => result.current.setUnlimitedScenariosEnabled(true));
    await act(async () => {
      await result.current.startStandardPractice(advanced.id);
    });
    expect(result.current.snapshot.progress.unlockedLevel).toBe(0);
    unmount();

    const reopened = renderHook(() => useAppModel());
    await waitFor(() => expect(reopened.result.current.loading).toBe(false));
    expect(reopened.result.current.unlimitedScenarios).toBe(true);
    await act(async () => {
      await reopened.result.current.reset();
    });
    expect(reopened.result.current.unlimitedScenarios).toBe(false);
    expect(window.localStorage.getItem("mijn-bedrijf:unlimited-scenarios")).toBeNull();
  });

  it("maakt meerdere opgeslagen dagscenario's op dezelfde datum en herstelt de gewone dag-ID na uitschakelen", async () => {
    const { result } = renderHook(() => useAppModel());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.createCompany("Testbedrijf", "creative", "webdesign");
    });
    const normal = await result.current.getOrCreateScenario("daily");
    expect((await result.current.getOrCreateScenario("daily")).id).toBe(normal.id);
    act(() => result.current.setUnlimitedScenariosEnabled(true));

    const first = await result.current.getOrCreateScenario("daily");
    await act(async () => {
      await result.current.completeScenario(first);
    });
    const second = await result.current.getOrCreateScenario("daily");
    await act(async () => {
      await result.current.completeScenario(second);
    });
    expect(new Set([normal.id, first.id, second.id]).size).toBe(3);
    expect(result.current.snapshot.entries.map((entry) => entry.scenarioInstanceId)).toEqual([first.id, second.id]);
    expect(result.current.snapshot.progress.lastDailyDate).toBe(first.assignedDate);
    expect((await result.current.exportData()).instances.filter((instance) => instance.mode === "daily")).toHaveLength(3);

    act(() => result.current.setUnlimitedScenariosEnabled(false));
    expect((await result.current.getOrCreateScenario("daily")).id).toBe(normal.id);
    expect("unlimitedScenarios" in await result.current.exportData()).toBe(false);
  });
});

describe("onbeperkt events oefenen", () => {
  it("bewaart de voorkeur lokaal, laat events direct na elkaar starten en houdt de gewone leerprogressie gelijk", async () => {
    const { result, unmount } = renderHook(() => useAppModel());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.createCompany("Eventzaak", "shop", "stationery");
    });
    await expect(result.current.startExtraEvent()).rejects.toThrow(/staat uit/);
    act(() => result.current.setUnlimitedEventsEnabled(true));

    let first!: Awaited<ReturnType<typeof result.current.startExtraEvent>>;
    await act(async () => { first = await result.current.startExtraEvent(); });
    expect(result.current.snapshot.events).toHaveLength(1);
    await expect(result.current.startExtraEvent()).rejects.toThrow(/al een event open/);
    if (first.type === "accountant") {
      for (let number = 1; number <= 3; number += 1) {
        await act(async () => { await result.current.answerEventQuestion(first, number); });
      }
    }
    await act(async () => { await result.current.completeEvent(first); });

    let second!: Awaited<ReturnType<typeof result.current.startExtraEvent>>;
    await act(async () => { second = await result.current.startExtraEvent(); });
    expect(second.id).not.toBe(first.id);
    expect(second.type).not.toBe(first.type);
    expect(result.current.snapshot.progress.successfulScenarios).toBe(0);
    expect(result.current.snapshot.progress.growthDays).toBe(0);
    expect(result.current.snapshot.events).toHaveLength(2);
    expect("unlimitedEvents" in await result.current.exportData()).toBe(false);

    unmount();
    const reopened = renderHook(() => useAppModel());
    await waitFor(() => expect(reopened.result.current.loading).toBe(false));
    expect(reopened.result.current.unlimitedEvents).toBe(true);
    act(() => reopened.result.current.setUnlimitedEventsEnabled(false));
    await expect(reopened.result.current.startExtraEvent()).rejects.toThrow(/staat uit/);
    await act(async () => { await reopened.result.current.reset(); });
    expect(window.localStorage.getItem("mijn-bedrijf:unlimited-events")).toBeNull();
    expect(reopened.result.current.snapshot.events).toEqual([]);
  });
});
