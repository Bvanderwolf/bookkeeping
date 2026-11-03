import { expect, test, type Page } from "@playwright/test";

async function fillShownSolution(page: Page) {
  const solution = page.locator("details");
  await solution.locator("summary").click();
  const rows = solution.locator("p");
  const rowCount = await rows.count();

  for (let index = 2; index < rowCount; index += 1) {
    await page.getByRole("button", { name: /voeg boekingsregel toe/i }).click();
  }

  for (let index = 0; index < rowCount; index += 1) {
    const row = rows.nth(index);
    const accountName = (await row.locator("strong").innerText()).trim();
    const [sideLabel, amountLabel] = (await row.locator("span").innerText()).split("·");
    const accountSelect = page.locator("select").nth(index * 2);
    const accountId = await accountSelect.locator("option").filter({ hasText: accountName }).first().getAttribute("value");
    if (!accountId) throw new Error(`Geen rekening gevonden voor ${accountName}`);

    await accountSelect.selectOption(accountId);
    await page.locator("select").nth(index * 2 + 1).selectOption(sideLabel.trim() === "Debet" ? "debit" : "credit");
    await page.locator('input[inputmode="decimal"]').nth(index).fill(
      amountLabel.replace(/[^\d,.-]/g, "").replaceAll(".", "").replace(",", "."),
    );
  }
}

async function chooseDutch(page: Page) {
  await page.getByRole("button", { name: /Nederlands/ }).click();
}

test("onboarding, dagelijkse feedback en balans werken op mobiel", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-20T10:00:00+02:00"));
  await page.goto("/");
  await chooseDutch(page);
  await page.getByLabel("Bedrijfsnaam").fill("Studio Spruit");
  await page.getByRole("button", { name: /Kies mijn sector/ }).click();
  await page.getByRole("button", { name: /Webshop/ }).click();
  await page.getByRole("button", { name: /Kies mijn aanbod/ }).click();
  await page.getByRole("button", { name: "Woonaccessoires" }).click();
  await page.getByRole("button", { name: /Open mijn bedrijf/ }).click();

  const selects = page.locator("select");
  await selects.nth(0).selectOption("bank");
  await selects.nth(2).selectOption("capital");
  const amounts = page.locator('input[inputmode="decimal"]');
  await amounts.nth(0).fill("5000");
  await amounts.nth(1).fill("5000");
  await expect(page.getByText("In balans", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Controleer mijn boeking/ }).click();
  await expect(page.getByRole("heading", { name: "De cijfers kloppen!" })).toBeVisible();
  await page.getByRole("button", { name: "Bekijk mijn bedrijf" }).click();

  await expect(page.getByText("€ 5.000,00").first()).toBeVisible();

  await page.clock.setFixedTime(new Date("2026-10-21T10:00:00+02:00"));
  await page.getByRole("button", { name: "Overzicht" }).click();
  await page.getByRole("button", { name: "Bedrijf" }).click();

  await page.getByRole("button", { name: "Open scenario" }).click();
  const checkBooking = page.getByRole("button", { name: /Controleer mijn boeking/ });
  await checkBooking.click();
  await expect(page.getByRole("alert")).toContainText(/Debet en credit zijn nog niet gelijk/);
  await checkBooking.click();
  await checkBooking.click();
  await expect(page.getByText("Bekijk de uitgewerkte oplossing")).toBeVisible();

  await fillShownSolution(page);
  await checkBooking.click();
  await expect(page.getByRole("heading", { name: "De cijfers kloppen!" })).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.getByText("Bekijk de uitgewerkte oplossing")).toHaveCount(0);
  await expect(page.getByRole("button")).toHaveCount(1);
  await page.getByRole("button", { name: "Terug naar Bedrijf" }).click();

  await expect(page.getByText("Klaar voor vandaag")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Studio Spruit" })).toBeVisible();
  await page.getByRole("button", { name: "Overzicht" }).click();
  await expect(page.getByText("Schulden + vermogen + resultaat")).toBeVisible();
  await expect(page.getByText("Je eerste startkapitaal")).toBeVisible();
  expect(await page.locator("html").evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
});

test("na wissen kan in dezelfde sessie een nieuw fotografiebedrijf worden aangemaakt", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto("/");
  await chooseDutch(page);

  await page.getByLabel("Bedrijfsnaam").fill("Eerste bedrijf");
  await page.getByRole("button", { name: /Kies mijn sector/ }).click();
  await page.getByRole("button", { name: /Kies mijn aanbod/ }).click();
  await page.getByRole("button", { name: /Open mijn bedrijf/ }).click();
  await page.getByRole("button", { name: "Terug" }).click();
  await page.getByRole("button", { name: "Profiel", exact: true }).click();

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Wis mijn bedrijf" }).click();
  await expect(page.getByRole("heading", { name: "Hoe heet jouw bedrijf?" })).toBeVisible();

  await page.getByLabel("Bedrijfsnaam").fill("Nieuwe fotostudio");
  await page.getByRole("button", { name: /Kies mijn sector/ }).click();
  await page.getByRole("button", { name: /Kies mijn aanbod/ }).click();
  await page.getByRole("button", { name: "Fotografie" }).click();
  await page.getByRole("button", { name: /Open mijn bedrijf/ }).click();

  await expect(page.getByText("Eerste boeking")).toBeVisible();
  expect(pageErrors).toEqual([]);
});

test("Een goede werkplek ontgrendelt niveau 1 en toont de appversie", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByLabel("Versie / Version 0.1.2")).toBeVisible();
  await chooseDutch(page);
  await page.getByLabel("Bedrijfsnaam").fill("Oefenbedrijf");
  await page.getByRole("button", { name: /Kies mijn sector/ }).click();
  await page.getByRole("button", { name: /Kies mijn aanbod/ }).click();
  await page.getByRole("button", { name: /Open mijn bedrijf/ }).click();

  await page.locator("select").nth(0).selectOption("bank");
  await page.locator("select").nth(2).selectOption("capital");
  await page.locator('input[inputmode="decimal"]').nth(0).fill("5000");
  await page.locator('input[inputmode="decimal"]').nth(1).fill("5000");
  await page.getByRole("button", { name: /Controleer mijn boeking/ }).click();
  await page.getByRole("button", { name: "Bekijk mijn bedrijf" }).click();

  await page.getByRole("button", { name: "Oefenen" }).click();
  const level0Panel = page.locator("details").filter({ has: page.locator("summary", { hasText: "Niveau 0" }) });
  const level1Panel = page.locator("details").filter({ has: page.locator("summary", { hasText: "Niveau 1" }) });
  await expect(level0Panel).toHaveAttribute("open", "");
  await expect(level0Panel.getByRole("heading")).toHaveCount(1);
  await expect(level1Panel).not.toHaveAttribute("open", "");
  await level1Panel.locator("summary").click();
  const level1Exercise = page.getByRole("heading", { name: "Kleine benodigdheden" }).locator("..").locator("..");
  await expect(level1Exercise.getByRole("button", { name: "Niveau 1" })).toBeDisabled();
  const workspaceExercise = page.getByRole("heading", { name: "Een goede werkplek" }).locator("..").locator("..");
  await expect(workspaceExercise.getByRole("img", { name: "Nog niet geopend" })).toBeVisible();
  await workspaceExercise.getByRole("button", { name: "Start" }).click();
  await page.getByRole("button", { name: "Terug" }).click();
  await expect(workspaceExercise.getByRole("img", { name: "Geopend, nog niet afgerond" })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Oefenen" }).click();
  await expect(workspaceExercise.getByRole("img", { name: "Geopend, nog niet afgerond" })).toBeVisible();
  await workspaceExercise.getByRole("button", { name: "Start" }).click();

  const story = await page.getByText(/Je koopt zonder btw-oefening inventaris/).innerText();
  const amount = story.match(/€\s*([\d.]+,\d{2})/)?.[1];
  expect(amount).toBeTruthy();
  await page.locator("select").nth(0).selectOption("equipment");
  await page.locator("select").nth(2).selectOption("bank");
  await page.locator('input[inputmode="decimal"]').nth(0).fill(amount!);
  await page.locator('input[inputmode="decimal"]').nth(1).fill(amount!);
  await page.getByRole("button", { name: /Controleer mijn boeking/ }).click();
  await page.getByRole("button", { name: "Verder oefenen" }).click();

  await expect(level1Panel).toHaveAttribute("open", "");
  await expect(level1Exercise.getByRole("button", { name: "Start" })).toBeEnabled();
  await expect(page.getByText("Niveau 1", { exact: true }).first()).toBeVisible();
  await level0Panel.locator("summary").click();
  await expect(workspaceExercise.getByRole("img", { name: "Afgerond" })).toBeVisible();
  await workspaceExercise.getByRole("button", { name: "Start" }).click();
  await page.getByRole("button", { name: "Terug" }).click();
  await level0Panel.locator("summary").click();
  await expect(workspaceExercise.getByRole("img", { name: "Afgerond" })).toBeVisible();
});

test("zelfgemaakte en geïmporteerde oefeningen blijven buiten de leerprogressie", async ({ page }) => {
  await page.goto("/");
  await chooseDutch(page);
  await page.getByLabel("Bedrijfsnaam").fill("Oefenstudio");
  await page.getByRole("button", { name: /Kies mijn sector/ }).click();
  await page.getByRole("button", { name: /Kies mijn aanbod/ }).click();
  await page.getByRole("button", { name: /Open mijn bedrijf/ }).click();
  await page.getByRole("button", { name: "Terug" }).click();
  await page.getByRole("button", { name: "Profiel", exact: true }).click();
  await page.getByText("Oefeningen", { exact: true }).click();
  await page.getByRole("button", { name: /Open oefeningeditor/ }).click();

  await page.getByLabel("Klein kopje").fill("Eigen basis");
  await page.getByLabel("Hoofdkop").fill("Privéstorting");
  await page.getByLabel("Scenario").fill("Je stort honderd euro op de zakelijke bank.");
  const editorSelects = page.locator("select");
  await editorSelects.nth(0).selectOption("bank");
  await editorSelects.nth(2).selectOption("capital");
  const editorAmounts = page.locator('input[inputmode="decimal"]');
  await editorAmounts.nth(0).fill("100");
  await editorAmounts.nth(1).fill("100");
  await page.getByRole("button", { name: "Sla oefening op" }).click();
  await expect(page.getByRole("status")).toHaveText("Oefening opgeslagen.");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /Exporteer oefeningen/ }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^mijn-bedrijf-oefeningen-\d{4}-\d{2}-\d{2}\.json$/);

  await page.getByRole("button", { name: "Oefenen" }).click();
  const selfMadeCard = page.getByRole("heading", { name: "Privéstorting" }).locator("..").locator("..");
  await selfMadeCard.getByRole("button", { name: "Start" }).click();
  await expect(page.getByText("Eigen basis", { exact: true })).toBeVisible();
  const playSelects = page.locator("select");
  await playSelects.nth(0).selectOption("bank");
  await playSelects.nth(2).selectOption("capital");
  const playAmounts = page.locator('input[inputmode="decimal"]');
  await playAmounts.nth(0).fill("100");
  await playAmounts.nth(1).fill("100");
  await page.getByRole("button", { name: /Controleer mijn boeking/ }).click();
  await expect(page.getByText("Je boeking komt overeen met de opgeslagen oplossing.")).toBeVisible();
  await page.getByRole("button", { name: "Verder oefenen" }).click();
  const practiceHero = page.getByRole("heading", { name: "Blijf je boekhoudspieren trainen" }).locator("..").locator("..");
  await expect(practiceHero).toContainText(/0\s*onderwerpen/);

  await page.getByRole("button", { name: "Profiel", exact: true }).click();
  await page.getByText("Oefeningen", { exact: true }).click();
  await page.locator('input[type="file"]').nth(1).setInputFiles({
    name: "gedeelde-oefening.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({
      schemaVersion: 1,
      exportedAt: "2026-10-29T12:00:00.000Z",
      exercises: [{
        id: "77777777-7777-4777-8777-777777777777",
        kicker: "Gedeeld",
        title: "Geïmporteerde storting",
        story: "Boek nog een storting.",
        solution: [
          { accountId: "bank", side: "debit", amountCents: 5_000 },
          { accountId: "capital", side: "credit", amountCents: 5_000 },
        ],
      }],
    })),
  });
  await expect(page.getByRole("status")).toHaveText("1 toegevoegd en 0 bijgewerkt.");
  await page.getByRole("button", { name: "Oefenen" }).click();
  await expect(page.getByRole("heading", { name: "Geïmporteerde storting" })).toBeVisible();
});

test("Engels kan bij de eerste start worden gekozen en later in Profiel worden aangepast", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /English/ }).click();
  await expect(page.getByRole("heading", { name: "What is your business called?" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");

  await page.getByLabel("Business name").fill("Bright Studio");
  await page.getByRole("button", { name: /Choose my sector/ }).click();
  await page.getByRole("button", { name: /Choose my offering/ }).click();
  await page.getByRole("button", { name: /Open my business/ }).click();
  await expect(page.getByRole("heading", { name: "Your first starting capital" })).toBeVisible();

  await page.getByRole("button", { name: "Back" }).click();
  await page.getByRole("button", { name: "Profile", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();
  await page.getByRole("button", { name: "Nederlands" }).click();
  await expect(page.getByRole("heading", { name: "Profiel" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "nl");
});
