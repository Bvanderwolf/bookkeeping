import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { freshProgress } from "../data/repository";
import type { AppSnapshot, StoredExercise } from "../domain/types";
import { PracticeView, ProfileView } from "./home";

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
  it("toont de drie bronnen, individuele oefeningen en niveauvergrendeling", () => {
    render(
      <PracticeView
        snapshot={snapshot}
        exercises={[selfMadeExercise]}
        onStartStandard={vi.fn()}
        onStartExercise={vi.fn()}
        onManageExercises={vi.fn()}
      />,
    );
    expect(screen.getByRole("heading", { name: "Standaard" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Zelfgemaakt" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Geïmporteerd" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Mijn oefening" })).toBeVisible();
    expect(screen.getByText("Je hebt nog geen oefeningen geïmporteerd.")).toBeVisible();

    const unlocked = screen.getByRole("heading", { name: "Een goede werkplek" }).closest("article");
    const locked = screen.getByRole("heading", { name: "Kleine benodigdheden" }).closest("article");
    expect(within(unlocked!).getByRole("button", { name: /Start/ })).toBeEnabled();
    expect(within(locked!).getByRole("button", { name: "Niveau 2" })).toBeDisabled();
  });
});
