import { useState } from "react";
import { ArrowLeft, Check } from "lucide-react";
import type { BusinessEvent } from "../domain/types";
import { useI18n } from "../i18n";
import styles from "./components.module.css";

const questions = [
  {
    prompt: "De bankrekening neemt toe. Aan welke zijde boek je dat?",
    choices: ["Debet", "Credit", "Niet boeken"],
    answer: 0,
    explanation: "Bank is een bezit. Een toename van bezit boek je debet.",
  },
  {
    prompt: "Je maakt bedrijfskosten. Aan welke zijde boek je de kosten?",
    choices: ["Credit", "Debet", "Niet boeken"],
    answer: 1,
    explanation: "Kosten nemen toe aan de debetzijde.",
  },
  {
    prompt: "Er ontstaat een schuld aan een leverancier. Aan welke zijde boek je de schuld?",
    choices: ["Debet", "Niet boeken", "Credit"],
    answer: 2,
    explanation: "Een nieuwe leveranciersschuld neemt toe aan de creditzijde.",
  },
] as const;

export function AccountantEvent({ event, onBack, onAnswer, onComplete }: {
  event: BusinessEvent;
  onBack: () => void;
  onAnswer: (number: number) => Promise<void>;
  onComplete: () => Promise<void>;
}) {
  const { t } = useI18n();
  const [feedback, setFeedback] = useState("");
  const [finished, setFinished] = useState(false);
  const [saving, setSaving] = useState(false);
  const question = questions[event.answeredQuestions];

  async function choose(index: number) {
    if (!question || saving) return;
    if (index !== question.answer) {
      setFeedback(t(question.explanation));
      return;
    }
    setSaving(true);
    setFeedback("");
    await onAnswer(event.answeredQuestions + 1);
    if (event.answeredQuestions + 1 === questions.length) {
      await onComplete();
      setFinished(true);
    }
    setSaving(false);
  }

  if (finished || event.completedAt || !question) return <main className={styles.challengeShell}><section className={styles.successCard} aria-live="polite"><div className={styles.successIcon}><Check size={32} /></div><span className={styles.kicker}>{t("Accountantsbezoek")}</span><h1>{t("Alle vragen beantwoord!")}</h1><p>{t("De accountant heeft zijn antwoorden. Je bedrijfscijfers blijven gelijk.")}</p>{finished || event.completedAt
    ? <button className={styles.primaryButton} onClick={onBack}>{t("Terug naar Bedrijf")}</button>
    : <button className={styles.primaryButton} disabled={saving} onClick={async () => { setSaving(true); try { await onComplete(); setFinished(true); } finally { setSaving(false); } }}>{t(saving ? "Bezoek afronden…" : "Rond bezoek af")}</button>}
  </section></main>;

  return <main className={styles.challengeShell}>
    <header className={styles.challengeHeader}><button className={styles.iconButton} onClick={onBack} aria-label={t("Terug")}><ArrowLeft size={22} /></button><div><span>{t("Accountantsbezoek")}</span><strong>{t("Vraag {{number}} van 3", { number: event.answeredQuestions + 1 })}</strong></div></header>
    <section className={styles.storyCard}><span className={styles.kicker}>{t("Bijzonder event")}</span><h1>{t("De accountant komt langs")}</h1><p>{t("Hij heeft een paar vragen over je boekhouding.")}</p></section>
    <section className={styles.bookingCard}><h2>{t(question.prompt)}</h2><div className={styles.quizChoices}>{question.choices.map((choice, index) => <button key={index} disabled={saving} onClick={() => void choose(index)}>{t(choice)}</button>)}</div>{feedback && <p className={styles.hint} role="alert">{feedback}</p>}</section>
  </main>;
}
