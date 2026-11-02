import { describe, expect, it } from "vitest";
import { exerciseDraftSchema, parseExerciseExport } from "./exercises";

const validSolution = [
  { accountId: "bank", side: "debit" as const, amountCents: 10_000 },
  { accountId: "capital", side: "credit" as const, amountCents: 10_000 },
];

const validDraft = {
  kicker: "Start",
  title: "Startkapitaal",
  story: "Boek de storting.",
  solution: validSolution,
};
const validExercise = { id: "11111111-1111-4111-8111-111111111111", ...validDraft };

describe("oefeningvalidatie", () => {
  it("accepteert en trimt een volledige gebalanceerde oefening", () => {
    const result = exerciseDraftSchema.parse({
      ...validDraft,
      kicker: "  Start  ",
    });
    expect(result.kicker).toBe("Start");
  });

  it.each([
    ["lege tekst", { ...validDraft, story: "   " }],
    ["onbekende rekening", { ...validDraft, solution: [{ ...validSolution[0], accountId: "unknown" }, validSolution[1]] }],
    ["nulbedrag", { ...validDraft, solution: [{ ...validSolution[0], amountCents: 0 }, validSolution[1]] }],
    ["decimale centen", { ...validDraft, solution: [{ ...validSolution[0], amountCents: 100.5 }, validSolution[1]] }],
    ["onbalans", { ...validDraft, solution: [{ ...validSolution[0], amountCents: 9_999 }, validSolution[1]] }],
  ])("weigert %s", (_label, draft) => {
    expect(exerciseDraftSchema.safeParse(draft).success).toBe(false);
  });

  it("weigert een verkeerde schemaversie en dubbele IDs", () => {
    expect(() => parseExerciseExport({
      schemaVersion: 2,
      exportedAt: "2026-10-29T12:00:00.000Z",
      exercises: [validExercise],
    })).toThrow();
    expect(() => parseExerciseExport({
      schemaVersion: 1,
      exportedAt: "2026-10-29T12:00:00.000Z",
      exercises: [validExercise, validExercise],
    })).toThrow(/Dubbele oefening-ID/);
  });
});
