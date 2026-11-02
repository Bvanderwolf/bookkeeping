import { z } from "zod";
import { formatMoney } from "./accounts";
import { isBalanced } from "./accounting";
import type {
  CompanyProfile,
  Progress,
  ScenarioInstance,
  ScenarioMode,
  ScenarioTemplate,
} from "./types";

const line = (accountId: string, side: "debit" | "credit", amountCents: number) => ({
  accountId,
  side,
  amountCents,
});
const vat = (netCents: number, rate: number) => Math.round(netCents * rate);
const gross = (netCents: number, rate: number) => netCents + vat(netCents, rate);

const commonHint = "Denk eerst na: wat komt het bedrijf binnen en wat gaat eruit? Bezittingen nemen meestal toe aan de debetzijde.";

export const SCENARIO_TEMPLATES: ScenarioTemplate[] = [
  {
    id: "start-capital",
    level: 1,
    concept: "eigen-vermogen",
    title: "Je eerste startkapitaal",
    amountOptions: [500_000],
    buildStory: (amount, profile) =>
      `Je stort ${formatMoney(amount)} van je privégeld op de zakelijke bankrekening van ${profile.name}. Boek de toename van de bank en het eigen vermogen.`,
    buildSolution: (amount) => [line("bank", "debit", amount), line("capital", "credit", amount)],
    hint: "De bank is een bezit en neemt toe. Daartegenover staat jouw inbreng als eigen vermogen.",
    explanation: "De zakelijke bank neemt toe aan debet. Het eigen vermogen neemt met hetzelfde bedrag toe aan credit.",
    sceneEffect: "De sleutel is omgedraaid: je onderneming is officieel gestart!",
  },
  {
    id: "buy-equipment",
    level: 1,
    concept: "bezittingen",
    title: "Een goede werkplek",
    amountOptions: [60_000, 75_000, 90_000],
    buildStory: (amount) => `Je koopt zonder btw-oefening inventaris voor ${formatMoney(amount)} en betaalt direct via de bank.`,
    buildSolution: (amount) => [line("equipment", "debit", amount), line("bank", "credit", amount)],
    hint: commonHint,
    explanation: "Inventaris is een bezit en neemt toe aan debet. Het banksaldo neemt af aan credit.",
    sceneEffect: "Er verschijnt nieuwe inventaris in je zaak.",
  },
  {
    id: "office-costs",
    level: 2,
    concept: "kosten",
    title: "Kleine benodigdheden",
    amountOptions: [4_500, 6_000, 7_500],
    buildStory: (amount) => `Je betaalt ${formatMoney(amount)} aan algemene bedrijfskosten vanaf de bank. Btw laten we in dit scenario buiten beschouwing.`,
    buildSolution: (amount) => [line("general-costs", "debit", amount), line("bank", "credit", amount)],
    hint: "Kosten verlagen je resultaat, maar worden in de boeking aan debet verwerkt.",
    explanation: "De kosten nemen toe aan debet; je bank neemt met hetzelfde bedrag af aan credit.",
    sceneEffect: "De werkplek ziet er een stuk beter georganiseerd uit.",
  },
  {
    id: "cash-sale",
    level: 2,
    concept: "omzet",
    title: "Je eerste verkoop",
    amountOptions: [12_000, 18_000, 24_000],
    buildStory: (amount, profile) => `Een klant koopt jouw ${profile.offeringId === "webdesign" ? "dienst" : "aanbod"} voor ${formatMoney(amount)} en betaalt direct op de bank. Btw laten we nog buiten beschouwing.`,
    buildSolution: (amount) => [line("bank", "debit", amount), line("revenue", "credit", amount)],
    hint: "Geld komt binnen op de bank. De tegenrekening is omzet.",
    explanation: "De bank neemt toe aan debet. Omzet neemt toe aan credit en verhoogt je resultaat.",
    sceneEffect: "Een tevreden klant laat de kassa rinkelen.",
  },
  {
    id: "pay-rent",
    level: 2,
    concept: "kosten",
    title: "De huur is betaald",
    amountOptions: [65_000, 80_000, 95_000],
    buildStory: (amount) => `De maandelijkse huur van ${formatMoney(amount)} wordt van de bank afgeschreven.`,
    buildSolution: (amount) => [line("rent", "debit", amount), line("bank", "credit", amount)],
    hint: "Huur is geen bezit dat je houdt, maar een kostenpost voor deze periode.",
    explanation: "Huurkosten nemen toe aan debet en de bank neemt af aan credit.",
    sceneEffect: "De lampen kunnen weer een maand blijven branden.",
  },
  {
    id: "customer-invoice",
    level: 3,
    concept: "debiteuren",
    title: "Factuur naar een klant",
    amountOptions: [45_000, 70_000, 95_000],
    buildStory: (amount) => `Je verstuurt een factuur van ${formatMoney(amount)}. De klant betaalt later; btw laten we hier buiten beschouwing.`,
    buildSolution: (amount) => [line("receivables", "debit", amount), line("revenue", "credit", amount)],
    hint: "Je hebt het geld nog niet, maar wel een vordering op de klant.",
    explanation: "Debiteuren neemt toe aan debet. De verdiende omzet boek je aan credit.",
    sceneEffect: "De eerste factuur ligt klaar voor verzending.",
  },
  {
    id: "customer-payment",
    level: 3,
    concept: "debiteuren",
    title: "Klant betaalt factuur",
    amountOptions: [45_000, 70_000, 95_000],
    buildStory: (amount) => `Een klant betaalt een openstaande factuur van ${formatMoney(amount)} op je bankrekening.`,
    buildSolution: (amount) => [line("bank", "debit", amount), line("receivables", "credit", amount)],
    hint: "De omzet is al geboekt toen de factuur werd verstuurd; boek hem nu niet opnieuw.",
    explanation: "Bank neemt toe aan debet en de vordering op de klant neemt af aan credit.",
    sceneEffect: "Een openstaande factuur krijgt een groene vink.",
  },
  {
    id: "supplier-invoice",
    level: 3,
    concept: "crediteuren",
    title: "Rekening van een leverancier",
    amountOptions: [22_000, 30_000, 42_000],
    buildStory: (amount) => `Je ontvangt een leveranciersfactuur voor algemene kosten van ${formatMoney(amount)}. Je betaalt volgende week; btw laten we buiten beschouwing.`,
    buildSolution: (amount) => [line("general-costs", "debit", amount), line("payables", "credit", amount)],
    hint: "Je hebt wel kosten, maar nog geen geld uitgegeven. Er ontstaat een schuld.",
    explanation: "Kosten nemen toe aan debet en crediteuren (de schuld aan de leverancier) aan credit.",
    sceneEffect: "De leveranciersmap heeft er een bon bij.",
  },
  {
    id: "pay-supplier",
    level: 3,
    concept: "crediteuren",
    title: "Leverancier betaald",
    amountOptions: [22_000, 30_000, 42_000],
    buildStory: (amount) => `Je betaalt een openstaande leveranciersfactuur van ${formatMoney(amount)} via de bank.`,
    buildSolution: (amount) => [line("payables", "debit", amount), line("bank", "credit", amount)],
    hint: "De kosten zijn al geboekt bij ontvangst van de factuur. Nu verdwijnt alleen de schuld.",
    explanation: "Crediteuren neemt af aan debet en de bank neemt af aan credit.",
    sceneEffect: "Je leverancier is op tijd betaald.",
  },
  {
    id: "marketing-campaign",
    level: 2,
    concept: "kosten",
    title: "Je bedrijf in de schijnwerpers",
    amountOptions: [15_000, 20_000, 25_000],
    buildStory: (amount) => `Je betaalt ${formatMoney(amount)} voor een kleine advertentiecampagne. Btw laten we buiten beschouwing.`,
    buildSolution: (amount) => [line("marketing", "debit", amount), line("bank", "credit", amount)],
    hint: "Een advertentie levert mogelijk later omzet op, maar is nu een kostenpost.",
    explanation: "Marketingkosten nemen toe aan debet en de bank neemt af aan credit.",
    sceneEffect: "Meer mensen weten jouw zaak te vinden.",
  },
  {
    id: "creative-camera-vat",
    level: 4,
    concept: "btw-inkoop",
    title: "Nieuwe creatieve apparatuur",
    sectorIds: ["creative"],
    amountOptions: [100_000, 150_000, 200_000],
    buildStory: (net) => `Je koopt apparatuur voor ${formatMoney(net)} exclusief 21% btw. Je betaalt ${formatMoney(gross(net, .21))} via de bank.`,
    buildSolution: (net) => [line("equipment", "debit", net), line("vat-receivable", "debit", vat(net, .21)), line("bank", "credit", gross(net, .21))],
    hint: "Splits de nettowaarde van de apparatuur en de terug te vragen btw over twee debetregels.",
    explanation: "Inventaris en te vorderen btw komen debet; het volledige betaalde bedrag gaat credit van de bank.",
    sceneEffect: "Professionele apparatuur geeft je studio een upgrade.",
  },
  {
    id: "creative-invoice-vat",
    level: 4,
    concept: "btw-verkoop",
    title: "Project opgeleverd",
    sectorIds: ["creative"],
    amountOptions: [100_000, 180_000, 250_000],
    buildStory: (net) => `Je factureert ${formatMoney(net)} exclusief 21% btw. De klant moet in totaal ${formatMoney(gross(net, .21))} betalen.`,
    buildSolution: (net) => [line("receivables", "debit", gross(net, .21)), line("revenue", "credit", net), line("vat-payable", "credit", vat(net, .21))],
    hint: "De klant is het brutobedrag verschuldigd; jouw omzet is exclusief btw.",
    explanation: "Debiteuren komt voor het brutobedrag debet. Omzet en af te dragen btw komen afzonderlijk credit.",
    sceneEffect: "Een groot project is met succes opgeleverd.",
  },
  {
    id: "shop-inventory-vat",
    level: 4,
    concept: "btw-inkoop",
    title: "Voorraad aangevuld",
    sectorIds: ["shop"],
    amountOptions: [50_000, 80_000, 120_000],
    buildStory: (net) => `Je ontvangt voorraad ter waarde van ${formatMoney(net)} exclusief 21% btw. De factuur van ${formatMoney(gross(net, .21))} betaal je later.`,
    buildSolution: (net) => [line("inventory", "debit", net), line("vat-receivable", "debit", vat(net, .21)), line("payables", "credit", gross(net, .21))],
    hint: "De voorraad en terug te vragen btw zijn bezittingen; de onbetaalde factuur is een schuld.",
    explanation: "Voorraad en te vorderen btw komen debet. Crediteuren komt voor het brutobedrag credit.",
    sceneEffect: "De schappen staan weer vol met nieuwe producten.",
  },
  {
    id: "shop-sale-vat",
    level: 4,
    concept: "btw-verkoop",
    title: "Een mooie webshopbestelling",
    sectorIds: ["shop"],
    amountOptions: [10_000, 20_000, 30_000],
    buildStory: (net) => `Een klant betaalt direct ${formatMoney(gross(net, .21))}. Daarvan is ${formatMoney(net)} omzet en ${formatMoney(vat(net, .21))} 21% btw.`,
    buildSolution: (net) => [line("bank", "debit", gross(net, .21)), line("revenue", "credit", net), line("vat-payable", "credit", vat(net, .21))],
    hint: "Boek het hele ontvangen bedrag op bank en splits omzet en btw aan credit.",
    explanation: "Bank komt bruto debet; omzet exclusief btw en te betalen btw komen credit.",
    sceneEffect: "Een nieuw pakketje kan naar de klant.",
  },
  {
    id: "hospitality-sale-vat",
    level: 4,
    concept: "btw-verkoop",
    title: "Drukke lunch",
    sectorIds: ["hospitality"],
    amountOptions: [20_000, 30_000, 40_000],
    buildStory: (net) => `Je ontvangt ${formatMoney(gross(net, .09))} op de bank voor eten en niet-alcoholische dranken: ${formatMoney(net)} omzet en 9% btw.`,
    buildSolution: (net) => [line("bank", "debit", gross(net, .09)), line("revenue", "credit", net), line("vat-payable", "credit", vat(net, .09))],
    hint: "Het ontvangen brutobedrag bestaat uit omzet en btw die je later afdraagt.",
    explanation: "Bank komt bruto debet. De omzet en 9% te betalen btw staan afzonderlijk credit.",
    sceneEffect: "De lunchtafels zaten gezellig vol.",
  },
  {
    id: "hospitality-purchase-vat",
    level: 4,
    concept: "btw-inkoop",
    title: "Verse ingrediënten",
    sectorIds: ["hospitality"],
    amountOptions: [10_000, 20_000, 30_000],
    buildStory: (net) => `Je koopt ingrediënten voor ${formatMoney(net)} exclusief 9% btw en betaalt ${formatMoney(gross(net, .09))} direct via de bank.`,
    buildSolution: (net) => [line("purchases", "debit", net), line("vat-receivable", "debit", vat(net, .09)), line("bank", "credit", gross(net, .09))],
    hint: "Splits de inkoopkosten en de terug te vragen btw over twee debetregels.",
    explanation: "Inkoopkosten en te vorderen btw komen debet; de volledige betaling gaat credit van de bank.",
    sceneEffect: "De keuken is klaar voor een nieuwe dag.",
  },
];

const staticTemplateSchema = z.object({
  id: z.string().min(1),
  level: z.number().int().min(1).max(4),
  concept: z.string().min(1),
  title: z.string().min(1),
  amountOptions: z.array(z.number().int().positive()).min(1),
});

export function validateScenarioTemplates() {
  const ids = new Set<string>();
  for (const template of SCENARIO_TEMPLATES) {
    staticTemplateSchema.parse(template);
    if (ids.has(template.id)) throw new Error(`Dubbel scenario-id: ${template.id}`);
    ids.add(template.id);
    for (const amount of template.amountOptions) {
      if (!isBalanced(template.buildSolution(amount))) {
        throw new Error(`Scenario ${template.id} is niet in balans`);
      }
    }
  }
  return true;
}
validateScenarioTemplates();

export function hashSeed(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function createScenarioInstance(
  profile: CompanyProfile,
  progress: Progress,
  mode: ScenarioMode,
  dateKey: string,
  nonce = "",
): ScenarioInstance {
  const seed = hashSeed(`${profile.id}:${dateKey}:${mode}:${nonce}:content-v1`);
  let pool = SCENARIO_TEMPLATES.filter((template) => {
    if (mode === "tutorial") return template.id === "start-capital";
    return (
      template.id !== "start-capital" &&
      template.level <= progress.unlockedLevel &&
      (!template.sectorIds || template.sectorIds.includes(profile.sectorId))
    );
  });

  const unseen = pool.filter((template) => !progress.completedTemplateIds.includes(template.id));
  if (unseen.length) pool = unseen;
  const template = pool[seed % pool.length];
  const amountCents = template.amountOptions[(seed >>> 8) % template.amountOptions.length];

  return {
    id: mode === "daily" ? `daily-${dateKey}` : `${mode}-${dateKey}-${seed}`,
    templateId: template.id,
    mode,
    assignedDate: dateKey,
    seed,
    amountCents,
    title: template.title,
    story: template.buildStory(amountCents, profile),
    solution: template.buildSolution(amountCents),
    hint: template.hint,
    explanation: template.explanation,
    sceneEffect: template.sceneEffect,
  };
}

export function standardPracticeTemplates(profile: CompanyProfile) {
  return SCENARIO_TEMPLATES.filter(
    (template) =>
      template.id !== "start-capital" &&
      (!template.sectorIds || template.sectorIds.includes(profile.sectorId)),
  );
}

export function createPracticeInstanceForTemplate(
  profile: CompanyProfile,
  templateId: string,
  dateKey: string,
  nonce: string,
): ScenarioInstance {
  const template = standardPracticeTemplates(profile).find((item) => item.id === templateId);
  if (!template) throw new Error("Deze standaardoefening is niet beschikbaar voor jouw bedrijf.");
  const seed = hashSeed(`${profile.id}:${dateKey}:practice:${templateId}:${nonce}:content-v1`);
  const amountCents = template.amountOptions[(seed >>> 8) % template.amountOptions.length];
  return {
    id: `practice-${dateKey}-${seed}`,
    templateId: template.id,
    mode: "practice",
    assignedDate: dateKey,
    seed,
    amountCents,
    title: template.title,
    story: template.buildStory(amountCents, profile),
    solution: template.buildSolution(amountCents),
    hint: template.hint,
    explanation: template.explanation,
    sceneEffect: template.sceneEffect,
  };
}
