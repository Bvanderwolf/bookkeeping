import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BusinessEvent } from "../domain/types";
import { AccountantEvent } from "./AccountantEvent";

afterEach(cleanup);

const event: BusinessEvent = { id: "accountant-1", type: "accountant", triggeredAt: "2026-11-06T10:00:00.000Z", answeredQuestions: 0 };

describe("accountantsbezoek", () => {
  it("kan na het derde opgeslagen antwoord renderen en de afronding na herladen hervatten", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn().mockResolvedValue(undefined);
    render(<AccountantEvent event={{ ...event, answeredQuestions: 3 }} onBack={vi.fn()} onAnswer={vi.fn()} onComplete={onComplete} />);
    expect(screen.getByRole("heading", { name: "Alle vragen beantwoord!" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Rond bezoek af" }));
    expect(onComplete).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Terug naar Bedrijf" })).toBeVisible();
  });

  it("geeft feedback op een fout antwoord en bewaart elk correct antwoord", async () => {
    const user = userEvent.setup();
    const onAnswer = vi.fn().mockResolvedValue(undefined);
    const onComplete = vi.fn().mockResolvedValue(undefined);
    const { rerender } = render(<AccountantEvent event={event} onBack={vi.fn()} onAnswer={onAnswer} onComplete={onComplete} />);
    await user.click(screen.getByRole("button", { name: "Credit" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/toename van bezit boek je debet/);
    expect(onAnswer).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Debet" }));
    expect(onAnswer).toHaveBeenCalledWith(1);
    rerender(<AccountantEvent event={{ ...event, answeredQuestions: 1 }} onBack={vi.fn()} onAnswer={onAnswer} onComplete={onComplete} />);
    expect(screen.getByText("Vraag 2 van 3")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Debet" }));
    expect(onAnswer).toHaveBeenCalledWith(2);
    rerender(<AccountantEvent event={{ ...event, answeredQuestions: 2 }} onBack={vi.fn()} onAnswer={onAnswer} onComplete={onComplete} />);
    await user.click(screen.getByRole("button", { name: "Credit" }));
    expect(onAnswer).toHaveBeenCalledWith(3);
    expect(onComplete).toHaveBeenCalledOnce();
    expect(screen.getByText("Alle vragen beantwoord!")).toBeVisible();
  });
});
