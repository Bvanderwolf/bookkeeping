import { useMemo, useState } from "react";
import { ArrowLeft, Scale } from "lucide-react";
import { isBalanced } from "../domain/accounting";
import { exerciseDraftSchema } from "../domain/exercises";
import type { ExerciseDraft } from "../domain/types";
import {
  BookingLinesEditor,
  createDraftBookingLines,
  draftLinesToJournalLines,
  type DraftBookingLine,
} from "./BookingLinesEditor";
import styles from "./components.module.css";

export function ExerciseEditor({
  onBack,
  onSave,
}: {
  onBack: () => void;
  onSave: (draft: ExerciseDraft) => Promise<void>;
}) {
  const [kicker, setKicker] = useState("");
  const [title, setTitle] = useState("");
  const [story, setStory] = useState("");
  const [lines, setLines] = useState<DraftBookingLine[]>(createDraftBookingLines);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const solution = useMemo(() => draftLinesToJournalLines(lines), [lines]);
  const draft = useMemo(() => ({ kicker, title, story, solution }), [kicker, solution, story, title]);
  const valid = exerciseDraftSchema.safeParse(draft).success;
  const balanced = isBalanced(solution);

  const save = async () => {
    const parsed = exerciseDraftSchema.safeParse(draft);
    if (!parsed.success || saving) return;
    setSaving(true);
    setError("");
    try {
      await onSave(parsed.data);
    } catch {
      setError("De oefening kon niet worden opgeslagen. Probeer het opnieuw.");
      setSaving(false);
    }
  };

  return (
    <main className={styles.challengeShell}>
      <header className={styles.challengeHeader}>
        <button className={styles.iconButton} onClick={onBack} aria-label="Terug naar Profiel">
          <ArrowLeft size={22} />
        </button>
        <div>
          <span>Oefeningeditor</span>
          <strong>Nieuwe oefening</strong>
        </div>
      </header>

      <section className={`${styles.storyCard} ${styles.editorStory}`} aria-labelledby="editor-title">
        <label>
          Klein kopje
          <input
            value={kicker}
            onChange={(event) => setKicker(event.target.value)}
            placeholder="Example 1"
            autoFocus
          />
        </label>
        <label>
          Hoofdkop
          <input
            id="editor-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Example 2"
          />
        </label>
        <label>
          Scenario
          <textarea
            value={story}
            onChange={(event) => setStory(event.target.value)}
            placeholder="Example 3"
            rows={4}
          />
        </label>
      </section>

      <section className={styles.bookingCard} aria-labelledby="editor-solution-title">
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.stepBadge}>1</span>
            <h2 id="editor-solution-title">Vul de oplossing in</h2>
          </div>
          <span className={balanced ? styles.balanceGood : styles.balanceOpen}>
            <Scale size={16} /> {balanced ? "In balans" : "Nog niet in balans"}
          </span>
        </div>

        <BookingLinesEditor lines={lines} onChange={setLines} />
        {error && <p className={styles.editorError} role="alert">{error}</p>}
        <button className={styles.primaryButton} onClick={save} disabled={!valid || saving}>
          {saving ? "Oefening opslaan…" : "Sla oefening op"}
        </button>
      </section>
    </main>
  );
}
