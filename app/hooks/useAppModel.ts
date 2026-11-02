import { useCallback, useEffect, useMemo, useState } from "react";
import { localDateKey } from "../domain/accounts";
import {
  SCENARIO_TEMPLATES,
  createPracticeInstanceForTemplate,
  createScenarioInstance,
} from "../domain/scenarios";
import { parseExerciseDraft } from "../domain/exercises";
import type {
  AppSnapshot,
  AppLanguage,
  CompanyProfile,
  ExerciseDraft,
  JournalEntry,
  ScenarioInstance,
  ScenarioMode,
  SectorId,
  StoredExercise,
} from "../domain/types";
import { createRepository, freshProgress } from "../data/repository";

const emptySnapshot = (language?: AppLanguage): AppSnapshot => ({
  language,
  profile: null,
  progress: freshProgress(),
  entries: [],
  instances: [],
  attempts: [],
});

export function useAppModel() {
  const repository = useMemo(() => createRepository(), []);
  const [snapshot, setSnapshot] = useState<AppSnapshot>(emptySnapshot);
  const [exercises, setExercises] = useState<StoredExercise[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const [nextSnapshot, nextExercises] = await Promise.all([
      repository.load(),
      repository.loadExercises(),
    ]);
    setSnapshot(nextSnapshot);
    setExercises(nextExercises);
    setLoading(false);
  }, [repository]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const createCompany = useCallback(
    async (name: string, sectorId: SectorId, offeringId: string) => {
      const profile: CompanyProfile = {
        id: crypto.randomUUID(),
        name: name.trim(),
        sectorId,
        offeringId,
        createdAt: new Date().toISOString(),
      };
      const progress = freshProgress();
      await Promise.all([repository.saveProfile(profile), repository.saveProgress(progress)]);
      const tutorial = createScenarioInstance(profile, progress, "tutorial", localDateKey(), "", snapshot.language ?? "nl");
      await repository.saveInstance(tutorial);
      await reload();
      return tutorial;
    },
    [reload, repository, snapshot.language],
  );

  const setLanguage = useCallback(async (language: AppLanguage) => {
    await repository.saveLanguage(language);
    setSnapshot((current) => ({ ...current, language }));
  }, [repository]);

  const getOrCreateScenario = useCallback(
    async (mode: ScenarioMode) => {
      if (!snapshot.profile) throw new Error("Maak eerst een bedrijf aan.");
      const date = localDateKey();
      if (mode === "tutorial") {
        const existing = snapshot.instances.find((instance) => instance.mode === "tutorial");
        if (existing) return existing;
      }
      if (mode === "daily") {
        const existing = snapshot.instances.find(
          (instance) => instance.mode === "daily" && instance.assignedDate === date,
        );
        if (existing) return existing;
      }
      const nonce = mode === "practice" ? `${Date.now()}:${snapshot.instances.length}` : "";
      const instance = createScenarioInstance(snapshot.profile, snapshot.progress, mode, date, nonce, snapshot.language ?? "nl");
      await repository.saveInstance(instance);
      setSnapshot((current) => ({ ...current, instances: [...current.instances, instance] }));
      return instance;
    },
    [repository, snapshot],
  );

  const recordAttempt = useCallback(
    async (instance: ScenarioInstance, correct: boolean, attemptNumber: number) => {
      const attempt = {
        id: `${instance.id}-attempt-${attemptNumber}`,
        scenarioInstanceId: instance.id,
        attemptedAt: new Date().toISOString(),
        correct,
        attemptNumber,
      };
      await repository.saveAttempt(attempt);
      setSnapshot((current) => ({ ...current, attempts: [...current.attempts, attempt] }));
    },
    [repository],
  );

  const startStandardPractice = useCallback(
    async (templateId: string) => {
      if (!snapshot.profile) throw new Error("Maak eerst een bedrijf aan.");
      const template = SCENARIO_TEMPLATES.find((item) => item.id === templateId);
      if (!template || template.level > snapshot.progress.unlockedLevel) {
        throw new Error("Deze oefening is nog niet beschikbaar.");
      }
      const instance = createPracticeInstanceForTemplate(
        snapshot.profile,
        templateId,
        localDateKey(),
        `${Date.now()}:${snapshot.instances.length}`,
        snapshot.language ?? "nl",
      );
      await repository.saveInstance(instance);
      setSnapshot((current) => ({ ...current, instances: [...current.instances, instance] }));
      return instance;
    },
    [repository, snapshot],
  );

  const completeScenario = useCallback(
    async (instance: ScenarioInstance) => {
      if (instance.completedAt) return;
      const template = SCENARIO_TEMPLATES.find((item) => item.id === instance.templateId);
      if (!template) throw new Error("Scenario-inhoud ontbreekt.");
      const completedAt = new Date().toISOString();
      const completedInstance = { ...instance, completedAt };
      const successCount = snapshot.progress.successfulScenarios + 1;
      const unlockedLevel = Math.min(4, 1 + Math.floor(successCount / 3)) as 1 | 2 | 3 | 4;
      const changesCompany = instance.mode !== "practice";
      const progress = {
        ...snapshot.progress,
        successfulScenarios: successCount,
        unlockedLevel,
        completedTemplateIds: Array.from(
          new Set([...snapshot.progress.completedTemplateIds, template.id]),
        ),
        masteredConcepts: Array.from(new Set([...snapshot.progress.masteredConcepts, template.concept])),
        growthDays: snapshot.progress.growthDays + (changesCompany ? 1 : 0),
        reputation: Math.min(100, snapshot.progress.reputation + (changesCompany ? 2 : 0)),
        lastDailyDate: changesCompany ? instance.assignedDate : snapshot.progress.lastDailyDate,
      };

      await Promise.all([
        repository.saveInstance(completedInstance),
        repository.saveProgress(progress),
      ]);

      let entry: JournalEntry | null = null;
      if (changesCompany) {
        entry = {
          id: `entry-${instance.id}`,
          scenarioInstanceId: instance.id,
          description: instance.title,
          postedAt: completedAt,
          lines: instance.solution,
        };
        await repository.postEntry(entry);
      }

      setSnapshot((current) => ({
        ...current,
        progress,
        entries: entry && !current.entries.some((item) => item.id === entry?.id)
          ? [...current.entries, entry]
          : current.entries,
        instances: current.instances.map((item) =>
          item.id === instance.id ? completedInstance : item,
        ),
      }));
    },
    [repository, snapshot.progress],
  );

  const reset = useCallback(async () => {
    await repository.reset();
    setSnapshot((current) => emptySnapshot(current.language));
  }, [repository]);

  const createExercise = useCallback(
    async (draft: ExerciseDraft) => {
      const normalized = parseExerciseDraft(draft);
      const exercise = await repository.saveSelfMadeExercise({
        ...normalized,
        id: crypto.randomUUID(),
      });
      setExercises((current) => [...current, exercise]);
      return exercise;
    },
    [repository],
  );

  const exportExercises = useCallback(() => repository.exportExercises(), [repository]);
  const importExercises = useCallback(
    async (data: unknown) => {
      const result = await repository.importExercises(data);
      setExercises(await repository.loadExercises());
      return result;
    },
    [repository],
  );

  const exportData = useCallback(() => repository.exportData(), [repository]);
  const importData = useCallback(
    async (data: AppSnapshot) => {
      await repository.importData(data);
      await reload();
    },
    [reload, repository],
  );

  return {
    loading,
    snapshot,
    exercises,
    setLanguage,
    createCompany,
    getOrCreateScenario,
    startStandardPractice,
    recordAttempt,
    completeScenario,
    reset,
    createExercise,
    exportExercises,
    importExercises,
    exportData,
    importData,
  };
}
