import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BookingChallenge } from "./BookingChallenge";
import type { ScenarioInstance } from "../domain/types";

afterEach(cleanup);

const scenario: ScenarioInstance = {
  id: "tutorial-test",
  templateId: "start-capital",
  mode: "tutorial",
  assignedDate: "2026-10-19",
  seed: 1,
  amountCents: 500_000,
  title: "Je eerste startkapitaal",
  story: "Je stort € 5.000,00.",
  solution: [
    { accountId: "bank", side: "debit", amountCents: 500_000 },
    { accountId: "capital", side: "credit", amountCents: 500_000 },
  ],
  hint: "Bank neemt toe.",
  explanation: "De boeking klopt.",
  sceneEffect: "Je zaak opent.",
};

const dailyScenario: ScenarioInstance = {
  ...scenario,
  id: "daily-test",
  mode: "daily",
};

describe("boekingsscherm", () => {
  it("geeft een begrijpelijke hint na een onjuiste poging", async () => {
    const user = userEvent.setup();
    const onAttempt = vi.fn().mockResolvedValue(undefined);
    render(<BookingChallenge scenario={scenario} onBack={vi.fn()} onSuccessContinue={vi.fn()} onAttempt={onAttempt} onComplete={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: /controleer mijn boeking/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/debet en credit zijn nog niet gelijk/i);
    expect(onAttempt).toHaveBeenCalledWith(false, 1);
  });

  it("geeft gerichte feedback bij een gebalanceerde maar onjuiste dagelijkse boeking", async () => {
    const user = userEvent.setup();
    render(
      <BookingChallenge
        scenario={dailyScenario}
        onBack={vi.fn()}
        onSuccessContinue={vi.fn()}
        onAttempt={vi.fn().mockResolvedValue(undefined)}
        onComplete={vi.fn()}
      />,
    );

    const selects = screen.getAllByRole("combobox");
    const amounts = screen.getAllByRole("textbox");
    await user.selectOptions(selects[0], "bank");
    await user.selectOptions(selects[2], "revenue");
    await user.type(amounts[0], "5000");
    await user.type(amounts[1], "5000");
    await user.click(screen.getByRole("button", { name: /controleer mijn boeking/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /de boeking is in balans, maar een rekening of zijde klopt nog niet/i,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(scenario.hint);
    expect(screen.queryByText(scenario.explanation)).not.toBeInTheDocument();
    expect(amounts[0]).toHaveValue("5000");
    expect(amounts[1]).toHaveValue("5000");
  });

  it("biedt na een correct dagelijks scenario alleen de route terug naar Bedrijf", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    const onSuccessContinue = vi.fn();
    render(
      <BookingChallenge
        scenario={dailyScenario}
        onBack={onBack}
        onSuccessContinue={onSuccessContinue}
        onAttempt={vi.fn().mockResolvedValue(undefined)}
        onComplete={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    const selects = screen.getAllByRole("combobox");
    const amounts = screen.getAllByRole("textbox");
    await user.selectOptions(selects[0], "bank");
    await user.selectOptions(selects[2], "capital");
    await user.type(amounts[0], "5000");
    await user.type(amounts[1], "5000");
    await user.click(screen.getByRole("button", { name: /controleer mijn boeking/i }));

    expect(await screen.findByRole("heading", { name: "De cijfers kloppen!" })).toBeVisible();
    expect(screen.getByText(scenario.explanation)).toBeVisible();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    const actions = screen.getAllByRole("button");
    expect(actions).toHaveLength(1);
    expect(actions[0]).toHaveAccessibleName("Terug naar Bedrijf");

    await user.click(actions[0]);
    expect(onSuccessContinue).toHaveBeenCalledOnce();
    expect(onBack).not.toHaveBeenCalled();
  });

  it("geeft de uitwerking pas na drie dagelijkse fouten vrij zonder de boeking in te vullen", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(
      <BookingChallenge
        scenario={dailyScenario}
        onBack={vi.fn()}
        onSuccessContinue={vi.fn()}
        onAttempt={vi.fn().mockResolvedValue(undefined)}
        onComplete={onComplete}
      />,
    );

    const submit = screen.getByRole("button", { name: /controleer mijn boeking/i });
    await user.click(submit);
    await user.click(submit);
    expect(screen.queryByText("Bekijk de uitgewerkte oplossing")).not.toBeInTheDocument();

    await user.click(submit);
    const solutionToggle = screen.getByText("Bekijk de uitgewerkte oplossing");
    expect(solutionToggle).toBeVisible();
    expect(solutionToggle.closest("details")).not.toHaveAttribute("open");

    await user.click(solutionToggle);
    expect(screen.getByText("Eigen vermogen")).toBeVisible();
    expect(screen.getAllByRole("textbox")[0]).toHaveValue("");
    expect(screen.getAllByRole("textbox")[1]).toHaveValue("");
    expect(onComplete).not.toHaveBeenCalled();
    expect(submit).toBeEnabled();
  });

  it("begint in een nieuwe dagelijkse scenariosessie weer zonder vrijgegeven oplossing", async () => {
    const user = userEvent.setup();
    const props = {
      scenario: dailyScenario,
      onBack: vi.fn(),
      onSuccessContinue: vi.fn(),
      onAttempt: vi.fn().mockResolvedValue(undefined),
      onComplete: vi.fn(),
    };
    const firstSession = render(<BookingChallenge {...props} />);
    const submit = screen.getByRole("button", { name: /controleer mijn boeking/i });
    await user.click(submit);
    await user.click(submit);
    await user.click(submit);
    expect(screen.getByText("Bekijk de uitgewerkte oplossing")).toBeVisible();

    firstSession.unmount();
    render(<BookingChallenge {...props} />);
    expect(screen.queryByText("Bekijk de uitgewerkte oplossing")).not.toBeInTheDocument();
  });
});
