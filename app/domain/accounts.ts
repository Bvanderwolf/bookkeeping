import type { Account, AppLanguage, SectorDefinition, SectorId } from "./types";

export const SECTORS: SectorDefinition[] = [
  {
    id: "creative",
    label: "Creatieve dienstverlening",
    shortLabel: "Creatieve studio",
    description: "Werk vanuit een eigen studio en stuur facturen naar klanten.",
    image: `${import.meta.env.BASE_URL}assets/creative-studio.png`,
    offerings: [
      { id: "webdesign", label: "Webdesign" },
      { id: "photography", label: "Fotografie" },
    ],
  },
  {
    id: "shop",
    label: "Webshop",
    shortLabel: "Webshop",
    description: "Koop voorraad in, pak bestellingen in en laat je omzet groeien.",
    image: `${import.meta.env.BASE_URL}assets/webshop-stockroom.png`,
    offerings: [
      { id: "stationery", label: "Kantoorartikelen" },
      { id: "interior", label: "Woonaccessoires" },
    ],
  },
  {
    id: "hospitality",
    label: "Horeca",
    shortLabel: "Koffie & lunch",
    description: "Run een knusse zaak met dagelijkse verkopen en inkopen.",
    image: `${import.meta.env.BASE_URL}assets/coffee-bar.png`,
    offerings: [
      { id: "coffee", label: "Koffiebar" },
      { id: "lunch", label: "Lunchroom" },
    ],
  },
];

export const ACCOUNTS: Account[] = [
  { id: "bank", code: "1000", name: "Bank", type: "asset", normalSide: "debit" },
  { id: "cash", code: "1010", name: "Kas", type: "asset", normalSide: "debit" },
  { id: "receivables", code: "1300", name: "Debiteuren", type: "asset", normalSide: "debit" },
  { id: "inventory", code: "3000", name: "Voorraad", type: "asset", normalSide: "debit" },
  { id: "equipment", code: "0200", name: "Inventaris", type: "asset", normalSide: "debit" },
  { id: "vat-receivable", code: "1520", name: "Te vorderen btw", type: "asset", normalSide: "debit" },
  { id: "payables", code: "1600", name: "Crediteuren", type: "liability", normalSide: "credit" },
  { id: "vat-payable", code: "1610", name: "Te betalen btw", type: "liability", normalSide: "credit" },
  { id: "capital", code: "0700", name: "Eigen vermogen", type: "equity", normalSide: "credit" },
  { id: "revenue", code: "8000", name: "Omzet", type: "revenue", normalSide: "credit" },
  { id: "purchases", code: "7000", name: "Inkoopkosten", type: "expense", normalSide: "debit" },
  { id: "general-costs", code: "4000", name: "Algemene kosten", type: "expense", normalSide: "debit" },
  { id: "rent", code: "4100", name: "Huurkosten", type: "expense", normalSide: "debit" },
  { id: "marketing", code: "4200", name: "Marketingkosten", type: "expense", normalSide: "debit" },
];

const ENGLISH_ACCOUNT_NAMES: Record<string, string> = {
  bank: "Bank",
  cash: "Cash",
  receivables: "Accounts receivable",
  inventory: "Inventory",
  equipment: "Equipment",
  "vat-receivable": "VAT receivable",
  payables: "Accounts payable",
  "vat-payable": "VAT payable",
  capital: "Equity",
  revenue: "Revenue",
  purchases: "Purchases",
  "general-costs": "General expenses",
  rent: "Rent expense",
  marketing: "Marketing expense",
};

const ENGLISH_SECTORS: Record<SectorId, Pick<SectorDefinition, "label" | "shortLabel" | "description" | "offerings">> = {
  creative: {
    label: "Creative services",
    shortLabel: "Creative studio",
    description: "Work from your own studio and send invoices to clients.",
    offerings: [
      { id: "webdesign", label: "Web design" },
      { id: "photography", label: "Photography" },
    ],
  },
  shop: {
    label: "Online shop",
    shortLabel: "Online shop",
    description: "Buy inventory, pack orders and grow your revenue.",
    offerings: [
      { id: "stationery", label: "Stationery" },
      { id: "interior", label: "Home accessories" },
    ],
  },
  hospitality: {
    label: "Hospitality",
    shortLabel: "Coffee & lunch",
    description: "Run a cosy business with daily sales and purchases.",
    offerings: [
      { id: "coffee", label: "Coffee bar" },
      { id: "lunch", label: "Lunchroom" },
    ],
  },
};

export const accountName = (account: Account, language: AppLanguage) =>
  language === "en" ? ENGLISH_ACCOUNT_NAMES[account.id] ?? account.name : account.name;

export const sectorsForLanguage = (language: AppLanguage): SectorDefinition[] =>
  language === "nl"
    ? SECTORS
    : SECTORS.map((sector) => ({ ...sector, ...ENGLISH_SECTORS[sector.id] }));

export const accountById = (id: string) => ACCOUNTS.find((account) => account.id === id);

export const formatMoney = (cents: number, showSign = false, language: AppLanguage = "nl") =>
  new Intl.NumberFormat(language === "en" ? "en-GB" : "nl-NL", {
    style: "currency",
    currency: "EUR",
    signDisplay: showSign ? "auto" : "never",
  }).format(cents / 100);

export const localDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
