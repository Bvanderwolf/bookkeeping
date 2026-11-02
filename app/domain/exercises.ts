import { z } from "zod";
import { ACCOUNTS } from "./accounts";
import { isBalanced, sumSides } from "./accounting";
import type {
  ExerciseDefinition,
  ExerciseDraft,
  ExerciseExportV1,
  StoredExercise,
} from "./types";

const accountIds = new Set(ACCOUNTS.map((account) => account.id));

const exerciseFields = {
  kicker: z.string().trim().min(1),
  title: z.string().trim().min(1),
  story: z.string().trim().min(1),
  solution: z.array(
    z.object({
      accountId: z.string().refine((accountId) => accountIds.has(accountId), "Onbekende rekening"),
      side: z.enum(["debit", "credit"]),
      amountCents: z.number().int().positive(),
    }).strict(),
  ).min(2).max(4),
};

const validateBalance = (value: ExerciseDraft, context: z.RefinementCtx) => {
  const totals = sumSides(value.solution);
  if (totals.debit <= 0 || totals.credit <= 0 || !isBalanced(value.solution)) {
    context.addIssue({
      code: "custom",
      path: ["solution"],
      message: "De oplossing moet een positieve, gebalanceerde boeking zijn.",
    });
  }
};

export const exerciseDraftSchema: z.ZodType<ExerciseDraft> = z
  .object(exerciseFields)
  .strict()
  .superRefine(validateBalance);

export const exerciseDefinitionSchema: z.ZodType<ExerciseDefinition> = z
  .object({
    id: z.string().uuid(),
    ...exerciseFields,
  })
  .strict()
  .superRefine(validateBalance);

export const exerciseExportSchema: z.ZodType<ExerciseExportV1> = z
  .object({
    schemaVersion: z.literal(1),
    exportedAt: z.string().datetime(),
    exercises: z.array(exerciseDefinitionSchema),
  })
  .strict()
  .superRefine((value, context) => {
    const seen = new Set<string>();
    value.exercises.forEach((exercise, index) => {
      if (seen.has(exercise.id)) {
        context.addIssue({
          code: "custom",
          path: ["exercises", index, "id"],
          message: "Dubbele oefening-ID in het importbestand.",
        });
      }
      seen.add(exercise.id);
    });
  });

export function parseExerciseDraft(value: unknown) {
  return exerciseDraftSchema.parse(value);
}

export function parseExerciseExport(value: unknown) {
  return exerciseExportSchema.parse(value);
}

export function toExerciseExport(exercises: StoredExercise[], exportedAt = new Date().toISOString()): ExerciseExportV1 {
  return exerciseExportSchema.parse({
    schemaVersion: 1,
    exportedAt,
    exercises: exercises
      .filter((exercise) => exercise.source === "self-made")
      .map(({ id, kicker, title, story, solution }) => ({ id, kicker, title, story, solution })),
  });
}
