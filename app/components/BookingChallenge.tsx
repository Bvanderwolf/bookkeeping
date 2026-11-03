import { useMemo, useState } from "react";
import { ArrowLeft, Check, Lightbulb, Scale } from "lucide-react";
import { accountById, accountName, formatMoney } from "../domain/accounts";
import { useI18n } from "../i18n";
import { SCENARIO_TEMPLATES } from "../domain/scenarios";
import { isBalanced, sameBooking } from "../domain/accounting";
import type { ScenarioInstance } from "../domain/types";
import {
  BookingLinesEditor,
  createDraftBookingLines,
  draftLinesToJournalLines,
  type DraftBookingLine,
} from "./BookingLinesEditor";
import styles from "./components.module.css";

export interface BookingChallengePresentation {
  headerLabel?: string;
  metaLabel?: string;
  kicker?: string;
  disclaimer?: string;
}

export function BookingChallenge({
  scenario,
  onBack,
  onSuccessContinue,
  onAttempt,
  onComplete,
  presentation,
}: {
  scenario: ScenarioInstance;
  onBack: () => void;
  onSuccessContinue: () => void;
  onAttempt: (correct: boolean, attempt: number) => Promise<void>;
  onComplete: () => Promise<void>;
  presentation?: BookingChallengePresentation;
}) {
  const { language, t } = useI18n();
  const [lines, setLines] = useState<DraftBookingLine[]>(createDraftBookingLines);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [saving, setSaving] = useState(false);

  const booking = useMemo(() => draftLinesToJournalLines(lines), [lines]);
  const balanced = isBalanced(booking);

  const submit = async () => {
    const nextAttempt = failedAttempts + 1;
    const correct = sameBooking(booking, scenario.solution);
    await onAttempt(correct, nextAttempt);
    if (!correct) {
      setFailedAttempts(nextAttempt);
      setFeedback(
        !balanced
          ? t("Debet en credit zijn nog niet gelijk. Controleer je bedragen en regels.")
          : scenario.mode === "daily"
            ? t("De boeking is in balans, maar een rekening of zijde klopt nog niet. {{hint}}", { hint: scenario.hint })
            : nextAttempt === 1
              ? scenario.hint
              : t("De boeking is in balans, maar een rekening of zijde klopt nog niet. Kijk naar wat toeneemt en afneemt."),
      );
      return;
    }
    setSaving(true);
    await onComplete();
    setSaving(false);
    setCompleted(true);
  };

  if (completed) {
    return (
      <main className={styles.challengeShell}>
        <section className={styles.successCard} aria-live="polite">
          <div className={styles.successIcon}><Check size={32} /></div>
          <span className={styles.kicker}>{t("Goed geboekt")}</span>
          <h1>{t("De cijfers kloppen!")}</h1>
          <p>{scenario.explanation}</p>
          <div className={styles.effectCard}>{scenario.sceneEffect}</div>
          <button className={styles.primaryButton} onClick={onSuccessContinue}>
            {scenario.mode === "daily"
              ? t("Terug naar Bedrijf")
              : scenario.mode === "practice"
                ? t("Verder oefenen")
                : t("Bekijk mijn bedrijf")}
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.challengeShell}>
      <header className={styles.challengeHeader}>
        <button className={styles.iconButton} onClick={onBack} aria-label={t("Terug")}>
          <ArrowLeft size={22} />
        </button>
        <div>
          <span>{presentation?.headerLabel ?? (scenario.mode === "practice" ? t("Oefenscenario") : scenario.mode === "tutorial" ? t("Eerste boeking") : t("Scenario van vandaag"))}</span>
          <strong>{presentation?.metaLabel ?? t("Niveau {{level}}", { level: SCENARIO_TEMPLATES.find((template) => template.id === scenario.templateId)?.level ?? 0 })}</strong>
        </div>
      </header>

      <section className={styles.storyCard}>
        <span className={styles.kicker}>{presentation?.kicker ?? (scenario.mode === "practice" ? t("Zandbak") : t("Vandaag in je zaak"))}</span>
        <h1>{scenario.title}</h1>
        <p>{scenario.story}</p>
        {scenario.mode === "practice" && <small>{presentation?.disclaimer ?? t("Deze oefening verandert je echte bedrijfscijfers niet.")}</small>}
      </section>

      <section className={styles.bookingCard} aria-labelledby="booking-title">
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.stepBadge}>1</span>
            <h2 id="booking-title">{t("Maak de boeking")}</h2>
          </div>
          <span className={balanced ? styles.balanceGood : styles.balanceOpen}>
            <Scale size={16} /> {balanced ? t("In balans") : t("Nog niet in balans")}
          </span>
        </div>

        <BookingLinesEditor lines={lines} onChange={setLines} />

        {feedback && <div className={styles.hint} role="alert"><Lightbulb size={20} /><p>{feedback}</p></div>}

        {failedAttempts >= 3 && (
          <details className={styles.solution}>
            <summary>{t("Bekijk de uitgewerkte oplossing")}</summary>
            {scenario.solution.map((item) => { const account = accountById(item.accountId); return <p key={`${item.accountId}-${item.side}`}><strong>{account ? accountName(account, language) : item.accountId}</strong><span>{item.side === "debit" ? t("Debet") : t("Credit")} · {formatMoney(item.amountCents, false, language)}</span></p>; })}
          </details>
        )}

        <button className={styles.primaryButton} onClick={submit} disabled={saving}>{saving ? t("Boeking verwerken…") : t("Controleer mijn boeking")}</button>
      </section>
    </main>
  );
}
