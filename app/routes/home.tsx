import { useEffect, useRef, useState } from "react";
import {
  ArrowRight, BarChart3, BookOpen, Briefcase, Building2, CalendarDays, Camera,
  CheckCircle2, ChevronDown, Coffee, Download, FileJson, Lamp, Lock, Monitor,
  Package, PencilLine, RotateCcw, ShoppingBag, Sparkles, Star, TrendingUp,
  Upload, User, WalletCards,
} from "lucide-react";
import type { Route } from "./+types/home";
import { ACCOUNTS, accountName, formatMoney, localDateKey, sectorsForLanguage } from "../domain/accounts";
import { calculateFinancials } from "../domain/accounting";
import { localizeScenarioInstance, scenarioConcept, scenarioTemplateTitle, standardPracticeTemplates } from "../domain/scenarios";
import type {
  AppSnapshot,
  AppLanguage,
  ExerciseExportV1,
  ExerciseImportResult,
  ScenarioInstance,
  SectorId,
  StoredExercise,
} from "../domain/types";
import { useAppModel } from "../hooks/useAppModel";
import { BusinessScene } from "../components/BusinessScene";
import { BookingChallenge, type BookingChallengePresentation } from "../components/BookingChallenge";
import { ExerciseEditor } from "../components/ExerciseEditor";
import styles from "./home.module.css";
import { LanguageProvider, translate, useI18n } from "../i18n";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Mijn Bedrijf — spelenderwijs boekhouden" },
    { name: "description", content: "Bouw iedere dag aan je bedrijf en leer spelenderwijs boekhouden." },
    { property: "og:title", content: "Mijn Bedrijf" },
    { property: "og:description", content: "Spelenderwijs leren boekhouden" },
    { property: "og:image", content: `${import.meta.env.BASE_URL}og.png` },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: "Mijn Bedrijf" },
    { name: "twitter:description", content: "Spelenderwijs leren boekhouden" },
    { name: "twitter:image", content: `${import.meta.env.BASE_URL}og.png` },
  ];
}

type MainView = "company" | "practice" | "overview" | "profile";
type ActiveScreen =
  | { type: "challenge"; scenario: ScenarioInstance; tracked: true }
  | {
      type: "challenge";
      scenario: ScenarioInstance;
      tracked: false;
      presentation: BookingChallengePresentation;
    }
  | { type: "exercise-editor" }
  | null;

interface ProfileReturnState {
  id: string;
  message?: string;
}

const exerciseToScenario = (exercise: StoredExercise, language: AppLanguage): ScenarioInstance => ({
  id: `exercise-run-${crypto.randomUUID()}`,
  templateId: exercise.storageId,
  mode: "practice",
  assignedDate: localDateKey(),
  seed: 0,
  amountCents: exercise.solution
    .filter((line) => line.side === "debit")
    .reduce((total, line) => total + line.amountCents, 0),
  title: exercise.title,
  story: exercise.story,
  solution: exercise.solution,
  hint: translate(language, "Controleer welke rekeningen toenemen of afnemen en aan welke zijde ze horen."),
  explanation: translate(language, "Je boeking komt overeen met de opgeslagen oplossing."),
  sceneEffect: translate(language, "Goed gedaan. Deze oefening verandert je bedrijf en leerprogressie niet."),
});

export default function Home() {
  const app = useAppModel();
  const language = app.snapshot.language ?? "nl";
  return <LanguageProvider language={language}><HomeContent app={app} /></LanguageProvider>;
}

function HomeContent({ app }: { app: ReturnType<typeof useAppModel> }) {
  const { language, t } = useI18n();
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>(null);
  const [view, setView] = useState<MainView>("company");
  const [profileReturn, setProfileReturn] = useState<ProfileReturnState | null>(null);

  if (app.loading) return <LoadingScreen />;
  if (!app.snapshot.language) return <LanguageSetup onSelect={app.setLanguage} />;
  if (activeScreen?.type === "exercise-editor") {
    return (
      <ExerciseEditor
        onBack={() => {
          setView("profile");
          setActiveScreen(null);
        }}
        onSave={async (draft) => {
          await app.createExercise(draft);
          setView("profile");
          setProfileReturn({ id: crypto.randomUUID(), message: t("Oefening opgeslagen.") });
          setActiveScreen(null);
        }}
      />
    );
  }
  if (activeScreen?.type === "challenge") {
    const scenario = app.snapshot.profile
      ? localizeScenarioInstance(activeScreen.scenario, app.snapshot.profile, language)
      : activeScreen.scenario;
    return (
      <BookingChallenge
        scenario={scenario}
        presentation={activeScreen.tracked ? undefined : activeScreen.presentation}
        onBack={() => setActiveScreen(null)}
        onSuccessContinue={() => {
          setView(scenario.mode === "practice" ? "practice" : "company");
          setActiveScreen(null);
        }}
        onAttempt={activeScreen.tracked
          ? (correct, attempt) => app.recordAttempt(scenario, correct, attempt)
          : async () => undefined}
        onComplete={activeScreen.tracked
          ? () => app.completeScenario(scenario)
          : async () => undefined}
      />
    );
  }
  if (!app.snapshot.profile) {
    return <Onboarding onCreate={async (name, sector, offering) => setActiveScreen({ type: "challenge", scenario: await app.createCompany(name, sector, offering), tracked: true })} />;
  }

  return (
    <AppShell view={view} setView={setView}>
      {view === "company" && <CompanyView snapshot={app.snapshot} onOpenScenario={async () => {
        const tutorial = app.snapshot.instances.find((instance) => instance.mode === "tutorial" && !instance.completedAt);
        setActiveScreen({ type: "challenge", scenario: tutorial ?? (await app.getOrCreateScenario("daily")), tracked: true });
      }} />}
      {view === "practice" && (
        <PracticeView
          snapshot={app.snapshot}
          exercises={app.exercises}
          onStartStandard={async (templateId) => {
            setActiveScreen({
              type: "challenge",
              scenario: await app.startStandardPractice(templateId),
              tracked: true,
            });
          }}
          onStartExercise={(exercise) => {
            const sourceLabel = exercise.source === "self-made" ? t("Zelfgemaakte oefening") : t("Geïmporteerde oefening");
            setActiveScreen({
              type: "challenge",
              scenario: exerciseToScenario(exercise, language),
              tracked: false,
              presentation: {
                headerLabel: sourceLabel,
                metaLabel: t("Zonder voortgang"),
                kicker: exercise.kicker,
                disclaimer: t("Deze oefening verandert je bedrijfscijfers en leerprogressie niet."),
              },
            });
          }}
          onManageExercises={() => {
            setView("profile");
            setProfileReturn({ id: crypto.randomUUID() });
          }}
        />
      )}
      {view === "overview" && <OverviewView snapshot={app.snapshot} />}
      {view === "profile" && (
        <ProfileView
          snapshot={app.snapshot}
          exercises={app.exercises}
          exerciseReturn={profileReturn}
          onExerciseReturnConsumed={() => setProfileReturn(null)}
          onExport={app.exportData}
          onImport={app.importData}
          onReset={app.reset}
          onExerciseExport={app.exportExercises}
          onExerciseImport={app.importExercises}
          onOpenEditor={() => setActiveScreen({ type: "exercise-editor" })}
          onLanguageChange={app.setLanguage}
        />
      )}
    </AppShell>
  );
}

function LoadingScreen() {
  const { t } = useI18n();
  return <main className={styles.loading}><span><Building2 size={28} /></span><p>{t("Je zaak wordt geopend…")}</p></main>;
}

function LanguageSetup({ onSelect }: { onSelect: (language: AppLanguage) => Promise<void> }) {
  return (
    <main className={styles.onboardingShell}>
      <section className={styles.onboarding} aria-labelledby="language-title">
        <header className={styles.brand}><span className={styles.logo}><Building2 size={23} /></span><span>Mijn Bedrijf / My Business</span></header>
        <div className={styles.step}>
          <span className={styles.eyebrow}>Welkom · Welcome</span>
          <h1 id="language-title">Kies je taal<br /><small>Choose your language</small></h1>
          <p>Je kunt dit later aanpassen in je profiel.<br />You can change this later in your profile.</p>
          <div className={styles.choiceGrid}>
            <button className={styles.choice} onClick={() => onSelect("nl")}><span>NL</span><strong>Nederlands</strong><small>Interface en standaardoefeningen</small></button>
            <button className={styles.choice} onClick={() => onSelect("en")}><span>EN</span><strong>English</strong><small>Interface and standard exercises</small></button>
          </div>
        </div>
      </section>
    </main>
  );
}

function Onboarding({ onCreate }: { onCreate: (name: string, sector: SectorId, offering: string) => Promise<void> }) {
  const { language, t } = useI18n();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [sectorId, setSectorId] = useState<SectorId>("creative");
  const [offeringId, setOfferingId] = useState("webdesign");
  const [saving, setSaving] = useState(false);
  const sectors = sectorsForLanguage(language);
  const sector = sectors.find((item) => item.id === sectorId) ?? sectors[0];
  const icons = { creative: Briefcase, shop: ShoppingBag, hospitality: Coffee };
  const chooseSector = (id: SectorId) => {
    const next = sectors.find((item) => item.id === id) ?? sectors[0];
    setSectorId(id);
    setOfferingId(next.offerings[0].id);
  };

  return (
    <main className={styles.onboardingShell}>
      <section className={styles.onboarding} aria-labelledby="onboarding-title">
        <header className={styles.brand}><span className={styles.logo}><Building2 size={23} /></span><span>{t("Mijn Bedrijf")}</span></header>
        <div className={styles.progress} aria-label={t("Stap {{step}} van 3", { step })}>{[1, 2, 3].map((number) => <span className={number <= step ? styles.progressActive : ""} key={number} />)}</div>
        {step === 1 && (
          <form className={styles.step} onSubmit={(event) => { event.preventDefault(); if (name.trim()) setStep(2); }}>
            <div className={styles.welcomeVisual}><Sparkles size={34} /><strong>{t("Jouw droomzaak\nbegint vandaag.").split("\n").map((line, index) => <span key={line}>{index > 0 && <br />}{line}</span>)}</strong><small>{t("Boekhouden leer je stap voor stap.")}</small></div>
            <span className={styles.eyebrow}>{t("Jouw zaak, jouw verhaal")}</span>
            <h1 id="onboarding-title">{t("Hoe heet jouw bedrijf?")}</h1>
            <p>{t("Geef je virtuele onderneming een naam. Je gegevens blijven veilig op dit apparaat.")}</p>
            <label>{t("Bedrijfsnaam")}<input value={name} onChange={(event) => setName(event.target.value)} placeholder={t("Bijvoorbeeld: Studio Spruit")} autoFocus maxLength={40} /></label>
            <button className={styles.primaryButton} disabled={!name.trim()}>{t("Kies mijn sector")} <ArrowRight size={20} /></button>
          </form>
        )}
        {step === 2 && (
          <div className={styles.step}>
            <span className={styles.eyebrow}>{t("Stap 2")}</span><h1 id="onboarding-title">{t("Waar ga je ondernemen?")}</h1><p>{t("Deze keuze bepaalt de sfeer en een deel van je dagelijkse situaties.")}</p>
            <div className={styles.choiceGrid}>{sectors.map((item) => { const Icon = icons[item.id]; return <button key={item.id} className={sectorId === item.id ? styles.choiceActive : styles.choice} onClick={() => chooseSector(item.id)}><span><Icon size={24} /></span><strong>{item.label}</strong><small>{item.description}</small>{sectorId === item.id && <CheckCircle2 size={20} />}</button>; })}</div>
            <div className={styles.actions}><button className={styles.secondaryButton} onClick={() => setStep(1)}>{t("Terug")}</button><button className={styles.primaryButton} onClick={() => setStep(3)}>{t("Kies mijn aanbod")} <ArrowRight size={20} /></button></div>
          </div>
        )}
        {step === 3 && (
          <div className={styles.step}>
            <span className={styles.eyebrow}>{t("Bijna klaar")}</span><h1 id="onboarding-title">{t("Wat ga je aanbieden?")}</h1><p>{t("Kies waarmee {{name}} klanten blij gaat maken.", { name })}</p>
            <div className={styles.previewImage}><img src={sector.image} alt={t("Voorbeeld van {{sector}}", { sector: sector.shortLabel })} /></div>
            <div className={styles.offeringGrid}>{sector.offerings.map((offering, index) => { const Icon = sectorId === "creative" ? (index ? Camera : Monitor) : sectorId === "shop" ? (index ? Lamp : Package) : Coffee; return <button key={offering.id} className={offeringId === offering.id ? styles.offeringActive : styles.offering} onClick={() => setOfferingId(offering.id)}><Icon size={22} /><span>{offering.label}</span></button>; })}</div>
            <div className={styles.actions}><button className={styles.secondaryButton} onClick={() => setStep(2)}>{t("Terug")}</button><button className={styles.primaryButton} disabled={saving} onClick={async () => { setSaving(true); await onCreate(name, sectorId, offeringId); }}>{saving ? t("Zaak openen…") : t("Open mijn bedrijf")} <Sparkles size={19} /></button></div>
          </div>
        )}
        <p className={styles.footnote}>{t("Geen account nodig · voortgang wordt lokaal opgeslagen")}</p>
      </section>
    </main>
  );
}

function AppShell({ view, setView, children }: { view: MainView; setView: (view: MainView) => void; children: React.ReactNode }) {
  const { t } = useI18n();
  const nav = [
    { id: "company" as const, label: t("Bedrijf"), icon: Building2 },
    { id: "practice" as const, label: t("Oefenen"), icon: BookOpen },
    { id: "overview" as const, label: t("Overzicht"), icon: BarChart3 },
    { id: "profile" as const, label: t("Profiel"), icon: User },
  ];
  return <div className={styles.appShell}><main className={styles.mainContent}>{children}</main><nav className={styles.bottomNav} aria-label={t("Hoofdnavigatie")}>{nav.map((item) => <button key={item.id} className={view === item.id ? styles.navActive : ""} onClick={() => setView(item.id)}><item.icon size={21} /><span>{item.label}</span></button>)}</nav></div>;
}

function CompanyView({ snapshot, onOpenScenario }: { snapshot: AppSnapshot; onOpenScenario: () => Promise<void> }) {
  const { language, t } = useI18n();
  const profile = snapshot.profile!;
  const financials = calculateFinancials(snapshot.entries);
  const todayComplete = snapshot.progress.lastDailyDate === localDateKey();
  const tutorialOpen = snapshot.instances.some((item) => item.mode === "tutorial" && !item.completedAt);
  const latestCompleted = [...snapshot.instances]
    .reverse()
    .find((item) => item.completedAt && item.mode !== "practice");
  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}><div><span className={styles.eyebrow}>{t("Goedemorgen")}</span><h1>{profile.name}</h1></div><div className={styles.avatar}>{profile.name.slice(0, 1).toUpperCase()}</div></header>
      <BusinessScene profile={profile} growthDays={snapshot.progress.growthDays} message={latestCompleted ? localizeScenarioInstance(latestCompleted, profile, language).sceneEffect : undefined} />
      <section className={styles.metrics} aria-label={t("Kerncijfers")}><div><span><WalletCards size={18} /> {t("Bank")}</span><strong>{formatMoney(financials.bank, false, language)}</strong></div><div><span><TrendingUp size={18} /> {t("Resultaat")}</span><strong className={financials.result < 0 ? styles.negative : ""}>{formatMoney(financials.result, true, language)}</strong></div><div><span><Star size={18} /> {t("Reputatie")}</span><strong>{snapshot.progress.reputation}<small>/100</small></strong></div></section>
      <section className={todayComplete && !tutorialOpen ? styles.dailyDone : styles.dailyCard}><div className={styles.dailyIcon}>{todayComplete && !tutorialOpen ? <CheckCircle2 size={26} /> : <CalendarDays size={26} />}</div><div><span>{tutorialOpen ? t("Je eerste boeking") : todayComplete ? t("Klaar voor vandaag") : t("Scenario van vandaag")}</span><h2>{tutorialOpen ? t("Stort je startkapitaal") : todayComplete ? t("Je bedrijf groeit rustig verder") : t("Er is iets gebeurd in je zaak")}</h2><p>{tutorialOpen ? t("Leer meteen hoe debet en credit samenwerken.") : todayComplete ? t("Oefen gerust verder in de zandbak.") : t("Los de boeking op en zie wat er verandert.")}</p></div>{(!todayComplete || tutorialOpen) && <button onClick={onOpenScenario}>{t("Open scenario")} <ArrowRight size={19} /></button>}</section>
      <section className={styles.growthCard}><div><span>{t("Groeipad")}</span><strong>{t("{{count}} groeidagen", { count: snapshot.progress.growthDays })}</strong></div><div className={styles.growthTrack}><span style={{ width: `${Math.min(100, snapshot.progress.growthDays / 8 * 100)}%` }} /></div><small>{t("Nog {{count}} dagen tot een volledig uitgegroeide zaak", { count: Math.max(0, 8 - snapshot.progress.growthDays) })}</small></section>
      <p className={styles.disclaimer}>{t("Educatieve simulatie · geen boekhoudkundig of fiscaal advies")}</p>
    </div>
  );
}

export function PracticeView({
  snapshot,
  exercises,
  onStartStandard,
  onStartExercise,
  onManageExercises,
}: {
  snapshot: AppSnapshot;
  exercises: StoredExercise[];
  onStartStandard: (templateId: string) => Promise<void>;
  onStartExercise: (exercise: StoredExercise) => void;
  onManageExercises: () => void;
}) {
  const { language, t } = useI18n();
  const profile = snapshot.profile!;
  const level = snapshot.progress.unlockedLevel;
  const standard = standardPracticeTemplates(profile);
  const selfMade = exercises.filter((exercise) => exercise.source === "self-made");
  const imported = exercises.filter((exercise) => exercise.source === "imported");

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div><span className={styles.eyebrow}>{t("Zonder gevolgen oefenen")}</span><h1>{t("Oefenruimte")}</h1></div>
        <div className={styles.headerIcon}><BookOpen size={24} /></div>
      </header>
      <section className={styles.practiceHero}>
        <div>
          <span>{t("Niveau {{level}}", { level })}</span>
          <h2>{t("Blijf je boekhoudspieren trainen")}</h2>
          <p>{t("Standaardoefeningen tellen mee voor je leerprogressie. Andere oefeningen staan daar los van.")}</p>
        </div>
        <strong>{snapshot.progress.masteredConcepts.length}<small>{t("onderwerpen onder de knie")}</small></strong>
      </section>

      <ExerciseSection title={t("Standaard")} description={t("Oefeningen die met Mijn Bedrijf worden meegeleverd.")}>
        <div className={styles.exerciseList}>
          {standard.map((template) => {
            const locked = template.level > level;
            return (
              <article className={locked ? styles.exerciseCardLocked : styles.exerciseCard} key={template.id}>
                <span className={styles.exerciseIcon}>{locked ? <Lock size={19} /> : <CheckCircle2 size={20} />}</span>
                <div>
                  <h3>{scenarioTemplateTitle(template, language)}</h3>
                  <p>{scenarioConcept(template.concept, language)}</p>
                </div>
                <button disabled={locked} onClick={() => onStartStandard(template.id)}>
                  {locked ? t("Niveau {{level}}", { level: template.level }) : t("Start")}
                  {!locked && <ArrowRight size={17} />}
                </button>
              </article>
            );
          })}
        </div>
      </ExerciseSection>

      <ExerciseSection title={t("Zelfgemaakt")} description={t("Oefeningen die je zelf in de editor hebt gemaakt.")}>
        <ExerciseCards
          exercises={selfMade}
          emptyText={t("Je hebt nog geen eigen oefeningen gemaakt.")}
          onStart={onStartExercise}
          onManage={onManageExercises}
        />
      </ExerciseSection>

      <ExerciseSection title={t("Geïmporteerd")} description={t("Oefeningen uit gedeelde JSON-bestanden.")}>
        <ExerciseCards
          exercises={imported}
          emptyText={t("Je hebt nog geen oefeningen geïmporteerd.")}
          onStart={onStartExercise}
          onManage={onManageExercises}
        />
      </ExerciseSection>
    </div>
  );
}

function ExerciseSection({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className={styles.exerciseSection} aria-labelledby={`exercise-section-${title}`}>
      <header>
        <h2 id={`exercise-section-${title}`}>{title}</h2>
        <p>{description}</p>
      </header>
      {children}
    </section>
  );
}

function ExerciseCards({
  exercises,
  emptyText,
  onStart,
  onManage,
}: {
  exercises: StoredExercise[];
  emptyText: string;
  onStart: (exercise: StoredExercise) => void;
  onManage: () => void;
}) {
  const { t } = useI18n();
  if (!exercises.length) {
    return (
      <div className={styles.exerciseEmpty}>
        <p>{emptyText}</p>
        <button onClick={onManage}>{t("Beheer oefeningen in Profiel")}</button>
      </div>
    );
  }
  return (
    <div className={styles.exerciseList}>
      {exercises.map((exercise) => (
        <article className={styles.exerciseCard} key={exercise.storageId}>
          <span className={styles.exerciseIcon}><FileJson size={20} /></span>
          <div><h3>{exercise.title}</h3><p>{exercise.kicker}</p></div>
          <button onClick={() => onStart(exercise)}>{t("Start")} <ArrowRight size={17} /></button>
        </article>
      ))}
    </div>
  );
}

function OverviewView({ snapshot }: { snapshot: AppSnapshot }) {
  const { language, t } = useI18n();
  const [tab, setTab] = useState<"balance" | "result">("balance");
  const financials = calculateFinancials(snapshot.entries);
  const rows = ACCOUNTS.filter((account) => tab === "balance" ? ["asset", "liability", "equity"].includes(account.type) : ["revenue", "expense"].includes(account.type));
  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}><div><span className={styles.eyebrow}>{t("Actuele cijfers")}</span><h1>{t("Overzicht")}</h1></div><div className={styles.headerIcon}><BarChart3 size={24} /></div></header>
      <div className={styles.tabs}><button className={tab === "balance" ? styles.tabActive : ""} onClick={() => setTab("balance")}>{t("Balans")}</button><button className={tab === "result" ? styles.tabActive : ""} onClick={() => setTab("result")}>{t("Winst & verlies")}</button></div>
      <section className={styles.statement}>
        <div className={styles.statementIntro}><span>{tab === "balance" ? t("Momentopname") : t("Sinds de start")}</span><strong>{tab === "balance" ? formatMoney(financials.assets, false, language) : formatMoney(financials.result, true, language)}</strong><small>{tab === "balance" ? t("Totaal aan bezittingen") : t("Cumulatief resultaat")}</small></div>
        <div className={styles.statementRows}>{rows.map((account) => <div key={account.id}><span><small>{account.code}</small>{accountName(account, language)}</span><strong>{formatMoney(financials.balances[account.id] ?? 0, true, language)}</strong></div>)}</div>
        {tab === "balance" && <div className={styles.equation}><strong>{t("Bezittingen")}</strong><span>{formatMoney(financials.assets, false, language)}</span><em>=</em><strong>{t("Schulden + vermogen + resultaat")}</strong><span>{formatMoney(financials.liabilities + financials.equity + financials.result, false, language)}</span></div>}
      </section>
      <section className={styles.journal}><h2>{t("Laatste boekingen")}</h2>{snapshot.entries.length ? [...snapshot.entries].reverse().slice(0, 5).map((entry) => { const instance = snapshot.instances.find((item) => item.id === entry.scenarioInstanceId); const description = instance && snapshot.profile ? localizeScenarioInstance(instance, snapshot.profile, language).title : entry.description; return <div key={entry.id}><span>{description}<small>{new Date(entry.postedAt).toLocaleDateString(language === "en" ? "en-GB" : "nl-NL")}</small></span><strong>{formatMoney(entry.lines.find((line) => line.side === "debit")?.amountCents ?? 0, false, language)}</strong></div>; }) : <p>{t("Nog geen boekingen. Je eerste scenario vult dit overzicht.")}</p>}</section>
    </div>
  );
}

export function ProfileView({
  snapshot,
  exercises,
  exerciseReturn,
  onExerciseReturnConsumed,
  onExport,
  onImport,
  onReset,
  onExerciseExport,
  onExerciseImport,
  onOpenEditor,
  onLanguageChange,
}: {
  snapshot: AppSnapshot;
  exercises: StoredExercise[];
  exerciseReturn: ProfileReturnState | null;
  onExerciseReturnConsumed: () => void;
  onExport: () => Promise<AppSnapshot>;
  onImport: (data: AppSnapshot) => Promise<void>;
  onReset: () => Promise<void>;
  onExerciseExport: () => Promise<ExerciseExportV1>;
  onExerciseImport: (data: unknown) => Promise<ExerciseImportResult>;
  onOpenEditor: () => void;
  onLanguageChange?: (language: AppLanguage) => Promise<void>;
}) {
  const { language, t } = useI18n();
  const backupInputRef = useRef<HTMLInputElement>(null);
  const exerciseInputRef = useRef<HTMLInputElement>(null);
  const [localDataOpen, setLocalDataOpen] = useState(false);
  const [exercisesOpen, setExercisesOpen] = useState(Boolean(exerciseReturn));
  const [backupMessage, setBackupMessage] = useState("");
  const [exerciseMessage, setExerciseMessage] = useState(exerciseReturn?.message ?? "");
  const sector = sectorsForLanguage(language).find((item) => item.id === snapshot.profile?.sectorId);
  const offering = sector?.offerings.find((item) => item.id === snapshot.profile?.offeringId);
  const selfMadeCount = exercises.filter((exercise) => exercise.source === "self-made").length;

  useEffect(() => {
    if (!exerciseReturn) return;
    setExercisesOpen(true);
    if (exerciseReturn.message) setExerciseMessage(exerciseReturn.message);
    onExerciseReturnConsumed();
  }, [exerciseReturn, onExerciseReturnConsumed]);

  const downloadJson = (data: unknown, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const downloadBackup = async () => {
    downloadJson(await onExport(), `mijn-bedrijf-${localDateKey()}.json`);
    setBackupMessage(t("Reservekopie gedownload."));
  };

  const downloadExercises = async () => {
    downloadJson(await onExerciseExport(), `mijn-bedrijf-oefeningen-${localDateKey()}.json`);
    setExerciseMessage(t("Zelfgemaakte oefeningen geëxporteerd."));
  };

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div><span className={styles.eyebrow}>{t("Jouw gegevens")}</span><h1>{t("Profiel")}</h1></div>
        <div className={styles.avatar}>{snapshot.profile?.name.slice(0, 1).toUpperCase()}</div>
      </header>
      <section className={styles.profileCard}>
        <BusinessScene profile={snapshot.profile!} growthDays={snapshot.progress.growthDays} compact />
        <div><h2>{snapshot.profile?.name}</h2><p>{sector?.label} · {offering?.label}</p></div>
      </section>

      <section className={styles.languageCard} aria-labelledby="language-setting-title">
        <div><h2 id="language-setting-title">{t("Taal")}</h2><p>{t("De interface en standaardoefeningen worden in deze taal getoond.")}</p></div>
        <div className={styles.languageOptions}>
          <button className={language === "nl" ? styles.languageActive : ""} onClick={() => onLanguageChange?.("nl")}>Nederlands</button>
          <button className={language === "en" ? styles.languageActive : ""} onClick={() => onLanguageChange?.("en")}>English</button>
        </div>
      </section>

      <details
        className={styles.dataCard}
        open={localDataOpen}
        onToggle={(event) => setLocalDataOpen(event.currentTarget.open)}
      >
        <summary><h2>{t("Lokale gegevens")}</h2><ChevronDown size={20} /></summary>
        <div className={styles.panelContent}>
          <p>{t("Je voortgang staat alleen in deze browser. Download een reservekopie om hem veilig te bewaren of op een ander apparaat te importeren.")}</p>
          <button onClick={downloadBackup}><Download size={20} /><span><strong>{t("Exporteer reservekopie")}</strong><small>{t("Download als JSON-bestand")}</small></span></button>
          <button onClick={() => backupInputRef.current?.click()}><Upload size={20} /><span><strong>{t("Importeer reservekopie")}</strong><small>{t("Vervangt de huidige voortgang")}</small></span></button>
          <input
            ref={backupInputRef}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={async (event) => {
              const input = event.currentTarget;
              const file = input.files?.[0];
              if (!file) return;
              try {
                const data = JSON.parse(await file.text()) as AppSnapshot;
                if (!data.progress || !Array.isArray(data.entries)) throw new Error();
                await onImport(data);
                setBackupMessage(t("Reservekopie geïmporteerd."));
              } catch {
                setBackupMessage(t("Dit bestand is geen geldige reservekopie."));
              } finally {
                input.value = "";
              }
            }}
          />
          {backupMessage && <p className={styles.panelStatus} role="status">{backupMessage}</p>}
        </div>
      </details>

      <details
        className={styles.dataCard}
        open={exercisesOpen}
        onToggle={(event) => setExercisesOpen(event.currentTarget.open)}
      >
        <summary><h2>{t("Oefeningen")}</h2><ChevronDown size={20} /></summary>
        <div className={styles.panelContent}>
          <p>{t("Maak je eigen oefeningen of deel ze als JSON-bestand.")}</p>
          <button disabled={!selfMadeCount} onClick={downloadExercises}><Download size={20} /><span><strong>{t("Exporteer oefeningen")}</strong><small>{selfMadeCount ? t("{{count}} zelfgemaakt", { count: selfMadeCount }) : t("Nog geen zelfgemaakte oefeningen")}</small></span></button>
          <button onClick={() => exerciseInputRef.current?.click()}><Upload size={20} /><span><strong>{t("Importeer oefeningen")}</strong><small>{t("Selecteer een JSON-bestand")}</small></span></button>
          <button onClick={onOpenEditor}><PencilLine size={20} /><span><strong>{t("Open oefeningeditor")}</strong><small>{t("Maak een nieuwe boekhoudvraag")}</small></span></button>
          <input
            ref={exerciseInputRef}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={async (event) => {
              const input = event.currentTarget;
              const file = input.files?.[0];
              if (!file) return;
              try {
                const result = await onExerciseImport(JSON.parse(await file.text()));
                setExerciseMessage(t("{{added}} toegevoegd en {{updated}} bijgewerkt.", { added: result.added, updated: result.updated }));
              } catch {
                setExerciseMessage(t("Dit bestand bevat geen geldige oefeningen. Er is niets geïmporteerd."));
              } finally {
                input.value = "";
              }
            }}
          />
          {exerciseMessage && <p className={styles.panelStatus} role="status">{exerciseMessage}</p>}
        </div>
      </details>

      <section className={styles.resetCard}>
        <div><RotateCcw size={21} /><span><strong>{t("Opnieuw beginnen")}</strong><small>{t("Verwijdert je bedrijf en alle boekingen")}</small></span></div>
        <button onClick={async () => { if (window.confirm(t("Weet je zeker dat je alle lokale voortgang wilt verwijderen?"))) await onReset(); }}>{t("Wis mijn bedrijf")}</button>
      </section>
      <p className={styles.disclaimer}>{t("Mijn Bedrijf v1 · Educatieve simulatie")}</p>
    </div>
  );
}
