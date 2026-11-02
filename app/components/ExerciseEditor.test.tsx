import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ExerciseEditor } from "./ExerciseEditor";

afterEach(cleanup);

describe("oefeningeditor", () => {
  it("start leeg met de afgesproken placeholders en een uitgeschakelde opslaanknop", () => {
    render(<ExerciseEditor onBack={vi.fn()} onSave={vi.fn()} />);
    expect(screen.getByPlaceholderText("Example 1")).toBeVisible();
    expect(screen.getByPlaceholderText("Example 2")).toBeVisible();
    expect(screen.getByPlaceholderText("Example 3")).toBeVisible();
    expect(screen.getAllByText(/Boekingsregel/)).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Sla oefening op" })).toBeDisabled();
  });

  it("slaat alleen een volledige, gebalanceerde oefening op", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<ExerciseEditor onBack={vi.fn()} onSave={onSave} />);

    await user.type(screen.getByPlaceholderText("Example 1"), "Basis");
    await user.type(screen.getByPlaceholderText("Example 2"), "Startkapitaal");
    await user.type(screen.getByPlaceholderText("Example 3"), "Boek de storting.");
    const selects = screen.getAllByRole("combobox");
    const amounts = screen.getAllByRole("textbox").filter((element) => element.getAttribute("inputmode") === "decimal");
    await user.selectOptions(selects[0], "bank");
    await user.selectOptions(selects[2], "capital");
    await user.type(amounts[0], "100");
    await user.type(amounts[1], "99");
    const save = screen.getByRole("button", { name: "Sla oefening op" });
    expect(save).toBeDisabled();

    await user.clear(amounts[1]);
    await user.type(amounts[1], "100");
    expect(save).toBeEnabled();
    await user.click(save);

    expect(onSave).toHaveBeenCalledWith({
      kicker: "Basis",
      title: "Startkapitaal",
      story: "Boek de storting.",
      solution: [
        { accountId: "bank", side: "debit", amountCents: 10_000 },
        { accountId: "capital", side: "credit", amountCents: 10_000 },
      ],
    });
  });

  it("verlaat de editor zonder op te slaan", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    const onSave = vi.fn();
    render(<ExerciseEditor onBack={onBack} onSave={onSave} />);
    await user.type(screen.getByPlaceholderText("Example 1"), "Niet bewaren");
    await user.click(screen.getByRole("button", { name: "Terug naar Profiel" }));
    expect(onBack).toHaveBeenCalledOnce();
    expect(onSave).not.toHaveBeenCalled();
  });
});
