import { beforeEach, describe, expect, it } from "vitest";
import { createRepository, freshProgress } from "./repository";

describe("IndexedDB-repository", () => {
  beforeEach(async () => {
    await createRepository().reset();
  });

  it("bewaart profiel en voorkomt dubbele journaalposten", async () => {
    const repository = createRepository();
    const profile = { id: "company", name: "Testzaak", sectorId: "shop" as const, offeringId: "stationery", createdAt: new Date().toISOString() };
    await repository.saveProfile(profile);
    await repository.saveProgress(freshProgress());
    const entry = { id: "entry-1", scenarioInstanceId: "scenario-1", description: "Start", postedAt: new Date().toISOString(), lines: [
      { accountId: "bank", side: "debit" as const, amountCents: 1000 },
      { accountId: "capital", side: "credit" as const, amountCents: 1000 },
    ] };
    expect(await repository.postEntry(entry)).toBe(true);
    expect(await repository.postEntry(entry)).toBe(false);
    const result = await repository.load();
    expect(result.profile?.name).toBe("Testzaak");
    expect(result.entries).toHaveLength(1);
  });

  it("kan na het wissen in dezelfde sessie een nieuw bedrijf opslaan", async () => {
    const repository = createRepository();
    await repository.saveProfile({
      id: "old-company",
      name: "Oude zaak",
      sectorId: "shop",
      offeringId: "stationery",
      createdAt: "2026-10-20T10:00:00.000Z",
    });

    await repository.reset();
    await repository.saveProfile({
      id: "new-company",
      name: "Nieuwe fotostudio",
      sectorId: "creative",
      offeringId: "photography",
      createdAt: "2026-10-20T11:00:00.000Z",
    });
    await repository.saveProgress(freshProgress());

    const result = await repository.load();
    expect(result.profile?.name).toBe("Nieuwe fotostudio");
    expect(result.progress).toEqual(freshProgress());
  });

  it("leidt het ontgrendelde niveau bij laden af uit afgeronde oefeningen", async () => {
    const repository = createRepository(`exercise-progress-${crypto.randomUUID()}`);
    await repository.saveProfile({
      id: "company",
      name: "Testzaak",
      sectorId: "creative",
      offeringId: "webdesign",
      createdAt: "2026-10-20T10:00:00.000Z",
    });
    await repository.saveProgress({
      ...freshProgress(),
      successfulScenarios: 9,
      unlockedLevel: 4,
      completedTemplateIds: ["start-capital", "buy-equipment"],
    });

    expect((await repository.load()).progress.unlockedLevel).toBe(2);
  });

  it("bewaart de taalkeuze ook wanneer het bedrijf wordt gewist", async () => {
    const repository = createRepository(`language-${crypto.randomUUID()}`);
    expect((await repository.load()).language).toBeUndefined();
    await repository.saveLanguage("en");
    expect((await repository.load()).language).toBe("en");
    await repository.reset();
    expect((await repository.load()).language).toBe("en");
  });

  it("bewaart zelfgemaakte en geïmporteerde oefeningen met dezelfde ID afzonderlijk", async () => {
    const repository = createRepository(`exercise-sources-${crypto.randomUUID()}`);
    const exercise = {
      id: "11111111-1111-4111-8111-111111111111",
      kicker: "Basis",
      title: "Startkapitaal",
      story: "Boek de storting.",
      solution: [
        { accountId: "bank", side: "debit" as const, amountCents: 10_000 },
        { accountId: "capital", side: "credit" as const, amountCents: 10_000 },
      ],
    };
    await repository.saveSelfMadeExercise(exercise);
    expect(await repository.importExercises({
      schemaVersion: 1,
      exportedAt: "2026-10-29T12:00:00.000Z",
      exercises: [{ ...exercise, title: "Geïmporteerde versie" }],
    })).toEqual({ added: 1, updated: 0 });

    const stored = await repository.loadExercises();
    expect(stored).toHaveLength(2);
    expect(stored.map((item) => item.storageId).sort()).toEqual([
      `self-made:${exercise.id}`,
      `imported:${exercise.id}`,
    ].sort());
  });

  it("werkt een herimport bij en importeert een ongeldig bestand atomair", async () => {
    const repository = createRepository(`exercise-import-${crypto.randomUUID()}`);
    const exercise = {
      id: "22222222-2222-4222-8222-222222222222",
      kicker: "Basis",
      title: "Eerste titel",
      story: "Boek de storting.",
      solution: [
        { accountId: "bank", side: "debit" as const, amountCents: 10_000 },
        { accountId: "capital", side: "credit" as const, amountCents: 10_000 },
      ],
    };
    const payload = { schemaVersion: 1, exportedAt: "2026-10-29T12:00:00.000Z", exercises: [exercise] };
    await repository.importExercises(payload);
    expect(await repository.importExercises({
      ...payload,
      exercises: [{ ...exercise, title: "Bijgewerkt" }],
    })).toEqual({ added: 0, updated: 1 });

    await expect(repository.importExercises({
      ...payload,
      exercises: [
        { ...exercise, id: "33333333-3333-4333-8333-333333333333" },
        { ...exercise, id: "44444444-4444-4444-8444-444444444444", solution: [{ ...exercise.solution[0], amountCents: 1 }, exercise.solution[1]] },
      ],
    })).rejects.toThrow();
    const stored = await repository.loadExercises();
    expect(stored).toHaveLength(1);
    expect(stored[0].title).toBe("Bijgewerkt");
  });

  it("exporteert alleen zelfgemaakte oefeningen en bewaart oefeningen bij het wissen", async () => {
    const repository = createRepository(`exercise-export-${crypto.randomUUID()}`);
    const exercise = {
      id: "55555555-5555-4555-8555-555555555555",
      kicker: "Basis",
      title: "Zelfgemaakt",
      story: "Boek de storting.",
      solution: [
        { accountId: "bank", side: "debit" as const, amountCents: 10_000 },
        { accountId: "capital", side: "credit" as const, amountCents: 10_000 },
      ],
    };
    await repository.saveSelfMadeExercise(exercise);
    await repository.importExercises({
      schemaVersion: 1,
      exportedAt: "2026-10-29T12:00:00.000Z",
      exercises: [{ ...exercise, id: "66666666-6666-4666-8666-666666666666", title: "Import" }],
    });
    const exported = await repository.exportExercises();
    expect(exported.exercises).toEqual([exercise]);
    expect(await repository.exportData()).not.toHaveProperty("exercises");

    await repository.reset();
    expect(await repository.loadExercises()).toHaveLength(2);
  });
});
