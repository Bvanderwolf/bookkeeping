import { z } from "zod";
import { formatMoney } from "./accounts";
import { isBalanced } from "./accounting";
import type {
  CompanyProfile,
  AppLanguage,
  Progress,
  ScenarioInstance,
  ScenarioMode,
  ScenarioTemplate,
  SectorId,
} from "./types";

const line = (accountId: string, side: "debit" | "credit", amountCents: number) => ({
  accountId,
  side,
  amountCents,
});
const vat = (netCents: number, rate: number) => Math.round(netCents * rate);
const gross = (netCents: number, rate: number) => netCents + vat(netCents, rate);

const commonHint = "Denk eerst na: wat komt het bedrijf binnen en wat gaat eruit? Bezittingen nemen meestal toe aan de debetzijde.";

interface ScenarioTranslation {
  title: string;
  buildStory: (amountCents: number, profile: CompanyProfile) => string;
  hint: string;
  explanation: string;
  sceneEffect: string;
}

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

const enMoney = (cents: number) => formatMoney(cents, false, "en");
const englishCommonHint = "First consider what comes into the business and what leaves it. Assets generally increase on the debit side.";

const ENGLISH_SCENARIOS: Record<string, ScenarioTranslation> = {
  "start-capital": {
    title: "Your first starting capital",
    buildStory: (amount, profile) => `You deposit ${enMoney(amount)} of your personal money into ${profile.name}'s business bank account. Record the increase in bank and equity.`,
    hint: "The bank account is an asset and increases. Your contribution increases equity by the same amount.",
    explanation: "The business bank account increases on the debit side. Equity increases by the same amount on the credit side.",
    sceneEffect: "The key has turned: your business has officially opened!",
  },
  "buy-equipment": {
    title: "A good workspace",
    buildStory: (amount) => `You buy equipment for ${enMoney(amount)} and pay immediately from the bank. Ignore VAT in this exercise.`,
    hint: englishCommonHint,
    explanation: "Equipment is an asset and increases on the debit side. The bank balance decreases on the credit side.",
    sceneEffect: "New equipment appears in your business.",
  },
  "office-costs": {
    title: "Small supplies",
    buildStory: (amount) => `You pay ${enMoney(amount)} in general business expenses from the bank. Ignore VAT in this scenario.`,
    hint: "Expenses reduce your profit, but are recorded on the debit side.",
    explanation: "Expenses increase on the debit side; your bank decreases by the same amount on the credit side.",
    sceneEffect: "The workspace looks much better organised.",
  },
  "cash-sale": {
    title: "Your first sale",
    buildStory: (amount, profile) => `A customer buys your ${profile.offeringId === "webdesign" ? "service" : "offering"} for ${enMoney(amount)} and pays directly into the bank. Ignore VAT for now.`,
    hint: "Money enters the bank account. The corresponding account is revenue.",
    explanation: "The bank increases on the debit side. Revenue increases on the credit side and raises your profit.",
    sceneEffect: "A happy customer makes the till ring.",
  },
  "pay-rent": {
    title: "The rent is paid",
    buildStory: (amount) => `The monthly rent of ${enMoney(amount)} is deducted from the bank account.`,
    hint: "Rent is not an asset you retain, but an expense for this period.",
    explanation: "Rent expense increases on the debit side and the bank decreases on the credit side.",
    sceneEffect: "The lights can stay on for another month.",
  },
  "customer-invoice": {
    title: "Invoice to a customer",
    buildStory: (amount) => `You send an invoice for ${enMoney(amount)}. The customer will pay later; ignore VAT here.`,
    hint: "You do not have the money yet, but you do have a receivable from the customer.",
    explanation: "Accounts receivable increases on the debit side. Record earned revenue on the credit side.",
    sceneEffect: "The first invoice is ready to send.",
  },
  "customer-payment": {
    title: "Customer pays an invoice",
    buildStory: (amount) => `A customer pays an outstanding invoice of ${enMoney(amount)} into your bank account.`,
    hint: "Revenue was already recorded when the invoice was sent; do not record it again now.",
    explanation: "The bank increases on the debit side and the receivable decreases on the credit side.",
    sceneEffect: "An outstanding invoice gets a green check mark.",
  },
  "supplier-invoice": {
    title: "A supplier's invoice",
    buildStory: (amount) => `You receive a supplier invoice for ${enMoney(amount)} in general expenses. You will pay next week; ignore VAT.`,
    hint: "You have incurred an expense but have not paid any money yet. A liability is created.",
    explanation: "Expenses increase on the debit side and accounts payable (the amount owed to the supplier) increases on the credit side.",
    sceneEffect: "Another receipt appears in the supplier folder.",
  },
  "pay-supplier": {
    title: "Supplier paid",
    buildStory: (amount) => `You pay an outstanding supplier invoice of ${enMoney(amount)} through the bank.`,
    hint: "The expense was already recorded when the invoice arrived. Now only the liability disappears.",
    explanation: "Accounts payable decreases on the debit side and the bank decreases on the credit side.",
    sceneEffect: "Your supplier has been paid on time.",
  },
  "marketing-campaign": {
    title: "Your business in the spotlight",
    buildStory: (amount) => `You pay ${enMoney(amount)} for a small advertising campaign. Ignore VAT.`,
    hint: "An advert may generate revenue later, but it is an expense now.",
    explanation: "Marketing expense increases on the debit side and the bank decreases on the credit side.",
    sceneEffect: "More people know how to find your business.",
  },
  "creative-camera-vat": {
    title: "New creative equipment",
    buildStory: (net) => `You buy equipment for ${enMoney(net)} excluding 21% VAT. You pay ${enMoney(gross(net, .21))} through the bank.`,
    hint: "Split the equipment's net value and recoverable VAT across two debit lines.",
    explanation: "Equipment and VAT receivable are debited; the full amount paid is credited to the bank.",
    sceneEffect: "Professional equipment gives your studio an upgrade.",
  },
  "creative-invoice-vat": {
    title: "Project delivered",
    buildStory: (net) => `You invoice ${enMoney(net)} excluding 21% VAT. The customer owes ${enMoney(gross(net, .21))} in total.`,
    hint: "The customer owes the gross amount; your revenue excludes VAT.",
    explanation: "Accounts receivable is debited for the gross amount. Revenue and VAT payable are credited separately.",
    sceneEffect: "A major project has been delivered successfully.",
  },
  "shop-inventory-vat": {
    title: "Inventory replenished",
    buildStory: (net) => `You receive inventory worth ${enMoney(net)} excluding 21% VAT. You will pay the ${enMoney(gross(net, .21))} invoice later.`,
    hint: "Inventory and recoverable VAT are assets; the unpaid invoice is a liability.",
    explanation: "Inventory and VAT receivable are debited. Accounts payable is credited for the gross amount.",
    sceneEffect: "The shelves are full of new products again.",
  },
  "shop-sale-vat": {
    title: "A nice online order",
    buildStory: (net) => `A customer immediately pays ${enMoney(gross(net, .21))}. This consists of ${enMoney(net)} revenue and ${enMoney(vat(net, .21))} in 21% VAT.`,
    hint: "Record the full amount received in the bank and split revenue and VAT on the credit side.",
    explanation: "The bank is debited for the gross amount; revenue excluding VAT and VAT payable are credited.",
    sceneEffect: "A new parcel is ready for the customer.",
  },
  "hospitality-sale-vat": {
    title: "Busy lunch",
    buildStory: (net) => `You receive ${enMoney(gross(net, .09))} in the bank for food and non-alcoholic drinks: ${enMoney(net)} revenue and 9% VAT.`,
    hint: "The gross amount received consists of revenue and VAT that you will remit later.",
    explanation: "The bank is debited for the gross amount. Revenue and 9% VAT payable are credited separately.",
    sceneEffect: "The lunch tables were pleasantly full.",
  },
  "hospitality-purchase-vat": {
    title: "Fresh ingredients",
    buildStory: (net) => `You buy ingredients for ${enMoney(net)} excluding 9% VAT and immediately pay ${enMoney(gross(net, .09))} through the bank.`,
    hint: "Split the purchase expense and recoverable VAT across two debit lines.",
    explanation: "Purchases and VAT receivable are debited; the full payment is credited to the bank.",
    sceneEffect: "The kitchen is ready for a new day.",
  },
};

const ENGLISH_CONCEPTS: Record<string, string> = {
  "eigen-vermogen": "equity",
  bezittingen: "assets",
  kosten: "expenses",
  omzet: "revenue",
  debiteuren: "accounts receivable",
  crediteuren: "accounts payable",
  "btw-inkoop": "purchase VAT",
  "btw-verkoop": "sales VAT",
};

export function scenarioTemplateTitle(template: ScenarioTemplate, language: AppLanguage) {
  return language === "en" ? ENGLISH_SCENARIOS[template.id]?.title ?? template.title : template.title;
}

export function scenarioConcept(concept: string, language: AppLanguage) {
  return language === "en" ? ENGLISH_CONCEPTS[concept] ?? concept : concept.replaceAll("-", " ");
}

function localizedScenarioFields(template: ScenarioTemplate, amountCents: number, profile: CompanyProfile, language: AppLanguage) {
  const translation = language === "en" ? ENGLISH_SCENARIOS[template.id] : undefined;
  return translation ? {
    title: translation.title,
    story: translation.buildStory(amountCents, profile),
    hint: translation.hint,
    explanation: translation.explanation,
    sceneEffect: translation.sceneEffect,
  } : {
    title: template.title,
    story: template.buildStory(amountCents, profile),
    hint: template.hint,
    explanation: template.explanation,
    sceneEffect: template.sceneEffect,
  };
}

export function localizeScenarioInstance(instance: ScenarioInstance, profile: CompanyProfile, language: AppLanguage) {
  const template = SCENARIO_TEMPLATES.find((item) => item.id === instance.templateId);
  return template ? { ...instance, ...localizedScenarioFields(template, instance.amountCents, profile, language) } : instance;
}

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
  language: AppLanguage = "nl",
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
  const localized = localizedScenarioFields(template, amountCents, profile, language);

  return {
    id: mode === "daily" ? `daily-${dateKey}` : `${mode}-${dateKey}-${seed}`,
    templateId: template.id,
    mode,
    assignedDate: dateKey,
    seed,
    amountCents,
    ...localized,
    solution: template.buildSolution(amountCents),
  };
}

export function standardPracticeTemplates(profile: CompanyProfile) {
  return SCENARIO_TEMPLATES.filter(
    (template) =>
      template.id !== "start-capital" &&
      (!template.sectorIds || template.sectorIds.includes(profile.sectorId)),
  );
}

export function unlockedLevelFor(completedTemplateIds: string[], sectorId: SectorId): Progress["unlockedLevel"] {
  const completed = new Set(completedTemplateIds);
  const available = SCENARIO_TEMPLATES.filter(
    (template) =>
      template.id !== "start-capital" &&
      (!template.sectorIds || template.sectorIds.includes(sectorId)),
  );
  for (const level of [1, 2, 3] as const) {
    const required = available.filter((template) => template.level === level);
    if (!required.length || required.some((template) => !completed.has(template.id))) return level;
  }
  return 4;
}

export function createPracticeInstanceForTemplate(
  profile: CompanyProfile,
  templateId: string,
  dateKey: string,
  nonce: string,
  language: AppLanguage = "nl",
): ScenarioInstance {
  const template = standardPracticeTemplates(profile).find((item) => item.id === templateId);
  if (!template) throw new Error("Deze standaardoefening is niet beschikbaar voor jouw bedrijf.");
  const seed = hashSeed(`${profile.id}:${dateKey}:practice:${templateId}:${nonce}:content-v1`);
  const amountCents = template.amountOptions[(seed >>> 8) % template.amountOptions.length];
  const localized = localizedScenarioFields(template, amountCents, profile, language);
  return {
    id: `practice-${dateKey}-${seed}`,
    templateId: template.id,
    mode: "practice",
    assignedDate: dateKey,
    seed,
    amountCents,
    ...localized,
    solution: template.buildSolution(amountCents),
  };
}
