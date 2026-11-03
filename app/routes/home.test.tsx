import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { freshProgress } from "../data/repository";
import type { AppSnapshot, StoredExercise } from "../domain/types";
import { PracticeView, ProfileView } from "./home";
import { LanguageProvider } from "../i18n";
import { createPracticeInstanceForTemplate } from "../domain/scenarios";

afterEach(cleanup);

const snapshot: AppSnapshot = {
  profile: {
    id: "company",
    name: "Studio Test",
    sectorId: "creative",
    offeringId: "photography",
    createdAt: "2026-10-29T10:00:00.000Z",
  },
  progress: freshProgress(),
  entries: [],
  instances: [],
  attempts: [],
};

const selfMadeExercise: StoredExercise = {
  storageId: "self-made:11111111-1111-4111-8111-111111111111",
  id: "11111111-1111-4111-8111-111111111111",
  source: "self-made",
  kicker: "Mijn basis",
  title: "Mijn oefening",
  story: "Boek de storting.",
  solution: [
    { accountId: "bank", side: "debit", amountCents: 10_000 },
    { accountId: "capital", side: "credit", amountCents: 10_000 },
  ],
  createdAt: "2026-10-29T10:00:00.000Z",
  updatedAt: "2026-10-29T10:00:00.000Z",
};

describe("profielbeheer", () => {
  it("toont twee onafhankelijke gesloten panelen en houdt wissen afzonderlijk", async () => {
    const user = userEvent.setup();
    render(
      <ProfileView
        snapshot={snapshot}
        exercises={[]}
        exerciseReturn={null}
        onExerciseReturnConsumed={vi.fn()}
        onExport={vi.fn()}
        onImport={vi.fn()}
        onReset={vi.fn()}
        onExerciseExport={vi.fn()}
        onExerciseImport={vi.fn()}
        onOpenEditor={vi.fn()}
      />,
    );
    const localPanel = screen.getByText("Lokale gegevens").closest("details");
    const exercisePanel = screen.getByText("Oefeningen").closest("details");
    expect(localPanel).not.toHaveAttribute("open");
    expect(exercisePanel).not.toHaveAttribute("open");
    expect(screen.getByRole("button", { name: "Wis mijn bedrijf" }).closest("details")).toBeNull();

    await user.click(within(localPanel!).getByText("Lokale gegevens"));
    expect(localPanel).toHaveAttribute("open");
    expect(exercisePanel).not.toHaveAttribute("open");
    await user.click(within(exercisePanel!).getByText("Oefeningen"));
    expect(localPanel).toHaveAttribute("open");
    expect(exercisePanel).toHaveAttribute("open");
    expect(screen.getByRole("button", { name: /Exporteer oefeningen/ })).toBeDisabled();
  });

  it("opent Oefeningen na terugkeer uit de editor en toont de melding", () => {
    const consumed = vi.fn();
    render(
      <ProfileView
        snapshot={snapshot}
        exercises={[selfMadeExercise]}
        exerciseReturn={{ id: "return", message: "Oefening opgeslagen." }}
        onExerciseReturnConsumed={consumed}
        onExport={vi.fn()}
        onImport={vi.fn()}
        onReset={vi.fn()}
        onExerciseExport={vi.fn()}
        onExerciseImport={vi.fn()}
        onOpenEditor={vi.fn()}
      />,
    );
    expect(screen.getByText("Oefeningen").closest("details")).toHaveAttribute("open");
    expect(screen.getByRole("status")).toHaveTextContent("Oefening opgeslagen.");
    expect(consumed).toHaveBeenCalledOnce();
  });
});

describe("oefenruimte", () => {
  it("toont uitklapbare niveaus vanaf 0, de drie bronnen en niveauvergrendeling", async () => {
    const user = userEvent.setup();
    const onStartStandard = vi.fn();
    render(
      <PracticeView
        snapshot={snapshot}
        exercises={[selfMadeExercise]}
        onStartStandard={onStartStandard}
        onStartExercise={vi.fn()}
        onManageExercises={vi.fn()}
      />,
    );
    expect(screen.getByRole("heading", { name: "Standaard" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Zelfgemaakt" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Geïmporteerd" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Mijn oefening" })).toBeVisible();
    expect(screen.getByText("Je hebt nog geen oefeningen geïmporteerd.")).toBeVisible();

    const panels = document.querySelectorAll("details");
    expect(panels).toHaveLength(4);
    expect([...panels].map((panel) => panel.querySelector("summary")?.textContent)).toEqual([
      "Niveau 0", "Niveau 1", "Niveau 2", "Niveau 3",
    ]);
    expect(panels[0]).toHaveAttribute("open");
    expect(within(panels[0]).getAllByRole("heading")).toHaveLength(1);
    for (const panel of [...panels].slice(1)) expect(panel).not.toHaveAttribute("open");
    expect(screen.queryByRole("heading", { name: "Je eerste startkapitaal" })).not.toBeInTheDocument();
    await user.click(panels[0].querySelector("summary")!);
    expect(panels[0]).not.toHaveAttribute("open");
    await user.click(panels[0].querySelector("summary")!);
    await user.click(panels[1].querySelector("summary")!);
    expect(panels[0]).toHaveAttribute("open");
    expect(panels[1]).toHaveAttribute("open");

    const unlocked = screen.getByRole("heading", { name: "Een goede werkplek" }).closest("article");
    const locked = screen.getByRole("heading", { name: "Kleine benodigdheden" }).closest("article");
    expect(within(unlocked!).getByRole("button", { name: /Start/ })).toBeEnabled();
    expect(within(unlocked!).getByRole("img", { name: "Nog niet geopend" })).toBeVisible();
    expect(within(locked!).getByRole("button", { name: "Niveau 1" })).toBeDisabled();
    expect(within(locked!).getByRole("img", { name: "Nog vergrendeld" })).toBeVisible();
    await user.click(within(unlocked!).getByRole("button", { name: /Start/ }));
    expect(onStartStandard).toHaveBeenCalledWith("buy-equipment");
  });

  it.each([
    { completed: false, label: "Geopend, nog niet afgerond" },
    { completed: true, label: "Afgerond" },
  ])("toont $label na openen, ook bij opnieuw oefenen", ({ completed, label }) => {
    const instance = createPracticeInstanceForTemplate(snapshot.profile!, "buy-equipment", "2026-11-03", "opened");
    render(
      <PracticeView
        snapshot={{
          ...snapshot,
          progress: { ...snapshot.progress, completedTemplateIds: completed ? ["buy-equipment"] : [] },
          instances: [instance],
        }}
        exercises={[]}
        onStartStandard={vi.fn()}
        onStartExercise={vi.fn()}
        onManageExercises={vi.fn()}
      />,
    );
    const exercise = screen.getByRole("heading", { name: "Een goede werkplek" }).closest("article")!;
    expect(within(exercise).getByRole("img", { name: label })).toBeVisible();
    expect(within(exercise).getByRole("button", { name: /Start/ })).toBeEnabled();
  });

  it("toont de interface en standaardoefeningen in het Engels zonder eigen oefeningen te vertalen", () => {
    render(
      <LanguageProvider language="en">
        <PracticeView
          snapshot={{ ...snapshot, language: "en" }}
          exercises={[selfMadeExercise]}
          onStartStandard={vi.fn()}
          onStartExercise={vi.fn()}
          onManageExercises={vi.fn()}
        />
      </LanguageProvider>,
    );
    expect(screen.getByRole("heading", { name: "Standard" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "A good workspace" })).toBeVisible();
    expect(screen.getByText("assets")).toBeVisible();
    expect(screen.getByRole("img", { name: "Not yet opened" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Mijn oefening" })).toBeVisible();
  });
});

describe("taalinstelling", () => {
  it("kan vanuit het profiel naar Engels worden gewijzigd", async () => {
    const onLanguageChange = vi.fn();
    const user = userEvent.setup();
    render(
      <LanguageProvider language="nl">
        <ProfileView
          snapshot={{ ...snapshot, language: "nl" }}
          exercises={[]}
          exerciseReturn={null}
          onExerciseReturnConsumed={vi.fn()}
          onExport={vi.fn()}
          onImport={vi.fn()}
          onReset={vi.fn()}
          onExerciseExport={vi.fn()}
          onExerciseImport={vi.fn()}
          onOpenEditor={vi.fn()}
          onLanguageChange={onLanguageChange}
        />
      </LanguageProvider>,
    );
    await user.click(screen.getByRole("button", { name: "English" }));
    expect(onLanguageChange).toHaveBeenCalledWith("en");
  });
});
