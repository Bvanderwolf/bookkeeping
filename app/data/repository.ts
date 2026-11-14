import Dexie, { type EntityTable } from "dexie";
import type {
  AppSnapshot,
  AppLanguage,
  Attempt,
  BusinessEvent,
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
import { unlockedLevelFor } from "../domain/scenarios";
import { eventBooking, invoiceWithoutOrderBooking, nextEventType, shouldCreateEvent } from "../domain/events";
import { localDateKey } from "../domain/accounts";

interface SettingRecord {
  key: "profile" | "progress" | "language";
  value: CompanyProfile | Progress | AppLanguage;
}

export const freshProgress = (): Progress => ({
  id: "progress",
  unlockedLevel: 0,
  successfulScenarios: 0,
  completedTemplateIds: [],
  masteredConcepts: [],
  growthDays: 0,
  reputation: 40,
});

const newEvent = (events: BusinessEvent[]): BusinessEvent => {
  const type = nextEventType(events);
  const lastTriggeredAt = events.at(-1)?.triggeredAt;
  const triggeredAt = new Date(Math.max(Date.now(), lastTriggeredAt ? Date.parse(lastTriggeredAt) + 1 : 0)).toISOString();
  return {
    id: crypto.randomUUID(),
    type,
    triggeredAt,
    amountCents: type === "accountant" ? undefined : [15_000, 30_000, 45_000][Math.floor(Math.random() * 3)],
    answeredQuestions: 0,
  };
};

class AppDatabase extends Dexie {
  settings!: EntityTable<SettingRecord, "key">;
  entries!: EntityTable<JournalEntry, "id">;
  instances!: EntityTable<ScenarioInstance, "id">;
  attempts!: EntityTable<Attempt, "id">;
  exercises!: EntityTable<StoredExercise, "storageId">;
  events!: EntityTable<BusinessEvent, "id">;

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
    this.version(3).stores({
      settings: "&key",
      entries: "&id, scenarioInstanceId, postedAt",
      instances: "&id, templateId, mode, assignedDate",
      attempts: "&id, scenarioInstanceId, attemptedAt",
      exercises: "&storageId, source, id, createdAt, updatedAt",
      events: "&id, triggeredAt",
    });
  }
}

export interface AppRepository {
  load(): Promise<AppSnapshot>;
  saveProfile(profile: CompanyProfile): Promise<void>;
  saveLanguage(language: AppLanguage): Promise<void>;
  saveProgress(progress: Progress): Promise<void>;
  saveInstance(instance: ScenarioInstance): Promise<void>;
  saveAttempt(attempt: Attempt): Promise<void>;
  postEntry(entry: JournalEntry): Promise<boolean>;
  ensureDueEvent(): Promise<void>;
  createExtraEvent(): Promise<BusinessEvent>;
  answerEventQuestion(id: string, answeredQuestions: number): Promise<void>;
  completeEvent(id: string): Promise<void>;
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
    const [profileRecord, progressRecord, languageRecord, entries, instances, attempts, events] = await Promise.all([
      db.settings.get("profile"),
      db.settings.get("progress"),
      db.settings.get("language"),
      db.entries.toArray(),
      db.instances.toArray(),
      db.attempts.toArray(),
      db.events.orderBy("triggeredAt").toArray(),
    ]);
    const profile = (profileRecord?.value as CompanyProfile | undefined) ?? null;
    const storedProgress = (progressRecord?.value as Progress | undefined) ?? freshProgress();
    return {
      language: languageRecord?.value === "en" || languageRecord?.value === "nl" ? languageRecord.value : undefined,
      profile,
      progress: profile
        ? { ...storedProgress, unlockedLevel: unlockedLevelFor(storedProgress.completedTemplateIds, profile.sectorId) }
        : storedProgress,
      entries,
      instances,
      attempts,
      events,
    };
  };

  return {
    load,
    saveProfile: (profile) => db.settings.put({ key: "profile", value: profile }).then(() => undefined),
    saveLanguage: (language) => db.settings.put({ key: "language", value: language }).then(() => undefined),
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
    async ensureDueEvent() {
      await db.transaction("rw", [db.settings, db.instances, db.events], async () => {
        if (!(await db.settings.get("profile"))) return;
        const [instances, events] = await Promise.all([db.instances.toArray(), db.events.orderBy("triggeredAt").toArray()]);
        if (!shouldCreateEvent(instances, events)) return;
        await db.events.add(newEvent(events));
      });
    },
    async createExtraEvent() {
      return db.transaction("rw", [db.settings, db.events], async () => {
        if (!(await db.settings.get("profile"))) throw new Error("Maak eerst een bedrijf aan.");
        const events = await db.events.orderBy("triggeredAt").toArray();
        if (events.some((event) => !event.completedAt)) throw new Error("Er staat al een event open.");
        const event = newEvent(events);
        await db.events.add(event);
        return event;
      });
    },
    async answerEventQuestion(id, answeredQuestions) {
      await db.transaction("rw", db.events, async () => {
        const event = await db.events.get(id);
        if (!event || event.completedAt || event.type !== "accountant" || answeredQuestions !== event.answeredQuestions + 1 || answeredQuestions > 3) return;
        await db.events.put({ ...event, answeredQuestions });
      });
    },
    async completeEvent(id) {
      await db.transaction("rw", [db.events, db.entries], async () => {
        const event = await db.events.get(id);
        if (!event || event.completedAt) return;
        if (event.type === "accountant" && event.answeredQuestions !== 3) return;
        if (event.type !== "accountant") {
          const amountCents = event.amountCents;
          if (!amountCents) throw new Error("Eventbedrag ontbreekt.");
          await db.entries.add({
            id: `event-entry-${id}`,
            scenarioInstanceId: id,
            description: event.type === "month-close" ? "Maandafsluiting: nog te ontvangen factuur" : "Factuur zonder bestelling",
            postedAt: new Date().toISOString(),
            lines: event.type === "month-close" ? eventBooking(amountCents) : invoiceWithoutOrderBooking(amountCents),
          });
        }
        await db.events.put({ ...event, completedAt: new Date().toISOString(), completedDate: localDateKey() });
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
      await db.transaction("rw", [db.settings, db.entries, db.instances, db.attempts, db.events], async () => {
        const currentLanguage = await db.settings.get("language");
        await Promise.all([db.settings.clear(), db.entries.clear(), db.instances.clear(), db.attempts.clear(), db.events.clear()]);
        if (snapshot.profile) await db.settings.add({ key: "profile", value: snapshot.profile });
        const language = snapshot.language === "en" || snapshot.language === "nl"
          ? snapshot.language
          : currentLanguage?.value;
        if (language === "en" || language === "nl") await db.settings.add({ key: "language", value: language });
        await db.settings.add({ key: "progress", value: snapshot.progress });
        if (snapshot.entries.length) await db.entries.bulkAdd(snapshot.entries);
        if (snapshot.instances.length) await db.instances.bulkAdd(snapshot.instances);
        if (snapshot.attempts.length) await db.attempts.bulkAdd(snapshot.attempts);
        if (snapshot.events?.length) await db.events.bulkAdd(snapshot.events);
      });
    },
    async reset() {
      await db.transaction("rw", [db.settings, db.entries, db.instances, db.attempts, db.events], async () => {
        const language = await db.settings.get("language");
        await Promise.all([db.settings.clear(), db.entries.clear(), db.instances.clear(), db.attempts.clear(), db.events.clear()]);
        if (language) await db.settings.add(language);
      });
    },
  };
}
