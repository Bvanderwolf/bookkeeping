import Dexie, { type EntityTable } from "dexie";
import type {
  AppSnapshot,
  Attempt,
  CompanyProfile,
  ExerciseDefinition,
  ExerciseExportV1,
  ExerciseImportResult,
  JournalEntry,
  Progress,
  ScenarioInstance,
  StoredExercise,
} from "../domain/types";
import { exerciseDefinitionSchema, parseExerciseExport, toExerciseExport } from "../domain/exercises";

interface SettingRecord {
  key: "profile" | "progress";
  value: CompanyProfile | Progress;
}

export const freshProgress = (): Progress => ({
  id: "progress",
  unlockedLevel: 1,
  successfulScenarios: 0,
  completedTemplateIds: [],
  masteredConcepts: [],
  growthDays: 0,
  reputation: 40,
});

class AppDatabase extends Dexie {
  settings!: EntityTable<SettingRecord, "key">;
  entries!: EntityTable<JournalEntry, "id">;
  instances!: EntityTable<ScenarioInstance, "id">;
  attempts!: EntityTable<Attempt, "id">;
  exercises!: EntityTable<StoredExercise, "storageId">;

  constructor(databaseName: string) {
    super(databaseName);
    this.version(1).stores({
      settings: "&key",
      entries: "&id, scenarioInstanceId, postedAt",
      instances: "&id, templateId, mode, assignedDate",
      attempts: "&id, scenarioInstanceId, attemptedAt",
    });
    this.version(2).stores({
      settings: "&key",
      entries: "&id, scenarioInstanceId, postedAt",
      instances: "&id, templateId, mode, assignedDate",
      attempts: "&id, scenarioInstanceId, attemptedAt",
      exercises: "&storageId, source, id, createdAt, updatedAt",
    });
  }
}

export interface AppRepository {
  load(): Promise<AppSnapshot>;
  saveProfile(profile: CompanyProfile): Promise<void>;
  saveProgress(progress: Progress): Promise<void>;
  saveInstance(instance: ScenarioInstance): Promise<void>;
  saveAttempt(attempt: Attempt): Promise<void>;
  postEntry(entry: JournalEntry): Promise<boolean>;
  loadExercises(): Promise<StoredExercise[]>;
  saveSelfMadeExercise(exercise: ExerciseDefinition): Promise<StoredExercise>;
  exportExercises(): Promise<ExerciseExportV1>;
  importExercises(data: unknown): Promise<ExerciseImportResult>;
  exportData(): Promise<AppSnapshot>;
  importData(snapshot: AppSnapshot): Promise<void>;
  reset(): Promise<void>;
}

export function createRepository(databaseName = "mijn-bedrijf-app"): AppRepository {
  const db = new AppDatabase(databaseName);

  const load = async (): Promise<AppSnapshot> => {
    const [profileRecord, progressRecord, entries, instances, attempts] = await Promise.all([
      db.settings.get("profile"),
      db.settings.get("progress"),
      db.entries.toArray(),
      db.instances.toArray(),
      db.attempts.toArray(),
    ]);
    return {
      profile: (profileRecord?.value as CompanyProfile | undefined) ?? null,
      progress: (progressRecord?.value as Progress | undefined) ?? freshProgress(),
      entries,
      instances,
      attempts,
    };
  };

  return {
    load,
    saveProfile: (profile) => db.settings.put({ key: "profile", value: profile }).then(() => undefined),
    saveProgress: (progress) => db.settings.put({ key: "progress", value: progress }).then(() => undefined),
    saveInstance: (instance) => db.instances.put(instance).then(() => undefined),
    saveAttempt: (attempt) => db.attempts.put(attempt).then(() => undefined),
    async postEntry(entry) {
      return db.transaction("rw", db.entries, async () => {
        if (await db.entries.get(entry.id)) return false;
        await db.entries.add(entry);
        return true;
      });
    },
    loadExercises: () => db.exercises.orderBy("createdAt").toArray(),
    async saveSelfMadeExercise(exercise) {
      const normalized = exerciseDefinitionSchema.parse(exercise);
      const now = new Date().toISOString();
      const record: StoredExercise = {
        ...normalized,
        storageId: `self-made:${normalized.id}`,
        source: "self-made",
        createdAt: now,
        updatedAt: now,
      };
      await db.exercises.add(record);
      return record;
    },
    async exportExercises() {
      const exercises = await db.exercises.where("source").equals("self-made").sortBy("createdAt");
      return toExerciseExport(exercises);
    },
    async importExercises(data) {
      const payload = parseExerciseExport(data);
      const now = new Date().toISOString();
      const storageIds = payload.exercises.map((exercise) => `imported:${exercise.id}`);
      const existing = await db.exercises.bulkGet(storageIds);
      const added = existing.filter((exercise) => !exercise).length;
      const updated = existing.length - added;
      const records: StoredExercise[] = payload.exercises.map((exercise, index) => ({
        ...exercise,
        storageId: storageIds[index],
        source: "imported",
        createdAt: existing[index]?.createdAt ?? now,
        updatedAt: now,
      }));
      await db.transaction("rw", db.exercises, async () => {
        if (records.length) await db.exercises.bulkPut(records);
      });
      return { added, updated };
    },
    exportData: load,
    async importData(snapshot) {
      await db.transaction("rw", [db.settings, db.entries, db.instances, db.attempts], async () => {
        await Promise.all([db.settings.clear(), db.entries.clear(), db.instances.clear(), db.attempts.clear()]);
        if (snapshot.profile) await db.settings.add({ key: "profile", value: snapshot.profile });
        await db.settings.add({ key: "progress", value: snapshot.progress });
        if (snapshot.entries.length) await db.entries.bulkAdd(snapshot.entries);
        if (snapshot.instances.length) await db.instances.bulkAdd(snapshot.instances);
        if (snapshot.attempts.length) await db.attempts.bulkAdd(snapshot.attempts);
      });
    },
    async reset() {
      await db.transaction("rw", [db.settings, db.entries, db.instances, db.attempts], async () => {
        await Promise.all([db.settings.clear(), db.entries.clear(), db.instances.clear(), db.attempts.clear()]);
      });
    },
  };
}
