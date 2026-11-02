export type SectorId = "creative" | "shop" | "hospitality";
export type EntrySide = "debit" | "credit";
export type AccountType = "asset" | "liability" | "equity" | "revenue" | "expense";
export type ScenarioMode = "tutorial" | "daily" | "practice";
export type ExerciseSource = "self-made" | "imported";

export interface SectorDefinition {
  id: SectorId;
  label: string;
  shortLabel: string;
  description: string;
  image: string;
  offerings: Array<{ id: string; label: string }>;
}
export interface CompanyProfile {
  id: string;
  name: string;
  sectorId: SectorId;
  offeringId: string;
  createdAt: string;
}

export interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  normalSide: EntrySide;
}

export interface JournalLine {
  accountId: string;
  side: EntrySide;
  amountCents: number;
}

export interface ExerciseDraft {
  kicker: string;
  title: string;
  story: string;
  solution: JournalLine[];
}

export interface ExerciseDefinition extends ExerciseDraft {
  id: string;
}

export interface StoredExercise extends ExerciseDefinition {
  storageId: string;
  source: ExerciseSource;
  createdAt: string;
  updatedAt: string;
}

export interface ExerciseExportV1 {
  schemaVersion: 1;
  exportedAt: string;
  exercises: ExerciseDefinition[];
}

export interface ExerciseImportResult {
  added: number;
  updated: number;
}

export interface JournalEntry {
  id: string;
  scenarioInstanceId: string;
  description: string;
  postedAt: string;
  lines: JournalLine[];
}

export interface ScenarioTemplate {
  id: string;
  level: 1 | 2 | 3 | 4;
  concept: string;
  title: string;
  sectorIds?: SectorId[];
  amountOptions: number[];
  buildStory: (amountCents: number, profile: CompanyProfile) => string;
  buildSolution: (amountCents: number) => JournalLine[];
  hint: string;
  explanation: string;
  sceneEffect: string;
}

export interface ScenarioInstance {
  id: string;
  templateId: string;
  mode: ScenarioMode;
  assignedDate: string;
  seed: number;
  amountCents: number;
  title: string;
  story: string;
  solution: JournalLine[];
  hint: string;
  explanation: string;
  sceneEffect: string;
  completedAt?: string;
}

export interface Attempt {
  id: string;
  scenarioInstanceId: string;
  attemptedAt: string;
  correct: boolean;
  attemptNumber: number;
}

export interface Progress {
  id: "progress";
  unlockedLevel: 1 | 2 | 3 | 4;
  successfulScenarios: number;
  completedTemplateIds: string[];
  masteredConcepts: string[];
  growthDays: number;
  reputation: number;
  lastDailyDate?: string;
}

export interface AppSnapshot {
  profile: CompanyProfile | null;
  progress: Progress;
  entries: JournalEntry[];
  instances: ScenarioInstance[];
  attempts: Attempt[];
}

export interface FinancialSnapshot {
  balances: Record<string, number>;
  assets: number;
  liabilities: number;
  equity: number;
  revenue: number;
  expenses: number;
  result: number;
  bank: number;
}
