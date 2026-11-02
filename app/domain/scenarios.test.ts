import { describe, expect, it } from "vitest";
import { freshProgress } from "../data/repository";
import type { CompanyProfile } from "./types";
import {
  SCENARIO_TEMPLATES,
  createPracticeInstanceForTemplate,
  createScenarioInstance,
  standardPracticeTemplates,
  validateScenarioTemplates,
} from "./scenarios";

const profile: CompanyProfile = {
  id: "test-company",
  name: "Studio Test",
  sectorId: "creative",
  offeringId: "webdesign",
  createdAt: "2026-10-19T09:00:00.000Z",
};

describe("scenario-engine", () => {
  it("bevat zestien geldige en gebalanceerde templates", () => {
    expect(SCENARIO_TEMPLATES).toHaveLength(16);
    expect(validateScenarioTemplates()).toBe(true);
  });

  it("genereert hetzelfde dagscenario met dezelfde invoer", () => {
    const progress = { ...freshProgress(), unlockedLevel: 4 as const };
    expect(createScenarioInstance(profile, progress, "daily", "2026-10-19"))
      .toEqual(createScenarioInstance(profile, progress, "daily", "2026-10-19"));
  });

  it("selecteert geen scenario uit een andere sector", () => {
    const progress = {
      ...freshProgress(),
      unlockedLevel: 4 as const,
      completedTemplateIds: SCENARIO_TEMPLATES.filter((item) => !item.sectorIds?.includes("creative")).map((item) => item.id),
    };
    const scenario = createScenarioInstance(profile, progress, "practice", "2026-10-19", "sector-test");
    expect(scenario.templateId.startsWith("creative-")).toBe(true);
  });

  it("maakt een oefenscenario van de expliciet gekozen standaardtemplate", () => {
    expect(standardPracticeTemplates(profile).some((template) => template.id === "shop-sale-vat")).toBe(false);
    const scenario = createPracticeInstanceForTemplate(
      profile,
      "buy-equipment",
      "2026-10-19",
      "selected-template",
    );
    expect(scenario.templateId).toBe("buy-equipment");
    expect(scenario.mode).toBe("practice");
    expect(() => createPracticeInstanceForTemplate(profile, "shop-sale-vat", "2026-10-19", "wrong-sector"))
      .toThrow(/niet beschikbaar/);
  });
});
