import { createContext, useContext, useEffect, type ReactNode } from "react";
import type { AppLanguage } from "./domain/types";

const english: Record<string, string> = {
  "Mijn Bedrijf": "My Business",
  "Je zaak wordt geopend…": "Opening your business…",
  "Kies je taal": "Choose your language",
  "Je kunt dit later altijd aanpassen in je profiel.": "You can always change this later in your profile.",
  "Nederlands": "Dutch",
  "Engels": "English",
  "Taal": "Language",
  "De interface en standaardoefeningen worden in deze taal getoond.": "The interface and standard exercises are shown in this language.",
  "Jouw droomzaak\nbegint vandaag.": "Your dream business\nstarts today.",
  "Boekhouden leer je stap voor stap.": "Learn bookkeeping one step at a time.",
  "Jouw zaak, jouw verhaal": "Your business, your story",
  "Hoe heet jouw bedrijf?": "What is your business called?",
  "Geef je virtuele onderneming een naam. Je gegevens blijven veilig op dit apparaat.": "Name your virtual business. Your data stays safely on this device.",
  "Bedrijfsnaam": "Business name",
  "Bijvoorbeeld: Studio Spruit": "For example: Bright Studio",
  "Kies mijn sector": "Choose my sector",
  "Stap {{step}} van 3": "Step {{step}} of 3",
  "Stap 2": "Step 2",
  "Waar ga je ondernemen?": "What kind of business will you run?",
  "Deze keuze bepaalt de sfeer en een deel van je dagelijkse situaties.": "This choice determines the setting and some of your daily scenarios.",
  "Terug": "Back",
  "Kies mijn aanbod": "Choose my offering",
  "Bijna klaar": "Almost there",
  "Wat ga je aanbieden?": "What will you offer?",
  "Kies waarmee {{name}} klanten blij gaat maken.": "Choose what {{name}} will offer its customers.",
  "Voorbeeld van {{sector}}": "Example of {{sector}}",
  "Zaak openen…": "Opening business…",
  "Open mijn bedrijf": "Open my business",
  "Geen account nodig · voortgang wordt lokaal opgeslagen": "No account needed · progress is stored locally",
  "Bedrijf": "Business",
  "Oefenen": "Practice",
  "Overzicht": "Overview",
  "Profiel": "Profile",
  "Hoofdnavigatie": "Main navigation",
  "Goedemorgen": "Good morning",
  "Kerncijfers": "Key figures",
  "Bank": "Bank",
  "Resultaat": "Profit",
  "Reputatie": "Reputation",
  "Je eerste boeking": "Your first entry",
  "Klaar voor vandaag": "Done for today",
  "Scenario van vandaag": "Today's scenario",
  "Stort je startkapitaal": "Deposit your starting capital",
  "Je bedrijf groeit rustig verder": "Your business keeps growing",
  "Er is iets gebeurd in je zaak": "Something happened in your business",
  "Leer meteen hoe debet en credit samenwerken.": "Learn how debit and credit work together.",
  "Oefen gerust verder in de zandbak.": "Feel free to keep practising in the sandbox.",
  "Los de boeking op en zie wat er verandert.": "Complete the entry and see what changes.",
  "Open scenario": "Open scenario",
  "Groeipad": "Growth path",
  "{{count}} groeidagen": "{{count}} growth days",
  "Nog {{count}} dagen tot een volledig uitgegroeide zaak": "{{count}} days until your business is fully grown",
  "Educatieve simulatie · geen boekhoudkundig of fiscaal advies": "Educational simulation · not accounting or tax advice",
  "Zonder gevolgen oefenen": "Practice without consequences",
  "Oefenruimte": "Practice room",
  "Niveau {{level}}": "Level {{level}}",
  "Blijf je boekhoudspieren trainen": "Keep your bookkeeping skills sharp",
  "Standaardoefeningen tellen mee voor je leerprogressie. Andere oefeningen staan daar los van.": "Standard exercises count towards your learning progress. Other exercises do not.",
  "onderwerpen onder de knie": "topics mastered",
  "Standaard": "Standard",
  "Oefeningen die met Mijn Bedrijf worden meegeleverd.": "Exercises included with My Business.",
  "Start": "Start",
  "Zelfgemaakt": "Self-made",
  "Oefeningen die je zelf in de editor hebt gemaakt.": "Exercises you created in the editor.",
  "Je hebt nog geen eigen oefeningen gemaakt.": "You have not created any exercises yet.",
  "Geïmporteerd": "Imported",
  "Oefeningen uit gedeelde JSON-bestanden.": "Exercises from shared JSON files.",
  "Je hebt nog geen oefeningen geïmporteerd.": "You have not imported any exercises yet.",
  "Beheer oefeningen in Profiel": "Manage exercises in Profile",
  "Actuele cijfers": "Current figures",
  "Balans": "Balance sheet",
  "Winst & verlies": "Profit & loss",
  "Momentopname": "Snapshot",
  "Sinds de start": "Since the start",
  "Totaal aan bezittingen": "Total assets",
  "Cumulatief resultaat": "Cumulative profit",
  "Bezittingen": "Assets",
  "Schulden + vermogen + resultaat": "Liabilities + equity + profit",
  "Laatste boekingen": "Latest entries",
  "Nog geen boekingen. Je eerste scenario vult dit overzicht.": "No entries yet. Your first scenario will fill this overview.",
  "Jouw gegevens": "Your details",
  "Lokale gegevens": "Local data",
  "Je voortgang staat alleen in deze browser. Download een reservekopie om hem veilig te bewaren of op een ander apparaat te importeren.": "Your progress is stored only in this browser. Download a backup to keep it safe or import it on another device.",
  "Exporteer reservekopie": "Export backup",
  "Download als JSON-bestand": "Download as a JSON file",
  "Importeer reservekopie": "Import backup",
  "Vervangt de huidige voortgang": "Replaces current progress",
  "Reservekopie gedownload.": "Backup downloaded.",
  "Reservekopie geïmporteerd.": "Backup imported.",
  "Dit bestand is geen geldige reservekopie.": "This file is not a valid backup.",
  "Oefeningen": "Exercises",
  "Maak je eigen oefeningen of deel ze als JSON-bestand.": "Create your own exercises or share them as a JSON file.",
  "Exporteer oefeningen": "Export exercises",
  "{{count}} zelfgemaakt": "{{count}} self-made",
  "Nog geen zelfgemaakte oefeningen": "No self-made exercises yet",
  "Importeer oefeningen": "Import exercises",
  "Selecteer een JSON-bestand": "Select a JSON file",
  "Open oefeningeditor": "Open exercise editor",
  "Maak een nieuwe boekhoudvraag": "Create a new bookkeeping question",
  "{{added}} toegevoegd en {{updated}} bijgewerkt.": "{{added}} added and {{updated}} updated.",
  "Dit bestand bevat geen geldige oefeningen. Er is niets geïmporteerd.": "This file does not contain valid exercises. Nothing was imported.",
  "Oefening opgeslagen.": "Exercise saved.",
  "Zelfgemaakte oefeningen geëxporteerd.": "Self-made exercises exported.",
  "Opnieuw beginnen": "Start over",
  "Verwijdert je bedrijf en alle boekingen": "Deletes your business and all entries",
  "Wis mijn bedrijf": "Delete my business",
  "Weet je zeker dat je alle lokale voortgang wilt verwijderen?": "Are you sure you want to delete all local progress?",
  "Mijn Bedrijf v1 · Educatieve simulatie": "My Business v1 · Educational simulation",
  "Zelfgemaakte oefening": "Self-made exercise",
  "Geïmporteerde oefening": "Imported exercise",
  "Zonder voortgang": "Without progress",
  "Deze oefening verandert je bedrijfscijfers en leerprogressie niet.": "This exercise does not change your business figures or learning progress.",
  "Controleer welke rekeningen toenemen of afnemen en aan welke zijde ze horen.": "Check which accounts increase or decrease and which side they belong on.",
  "Je boeking komt overeen met de opgeslagen oplossing.": "Your entry matches the saved solution.",
  "Goed gedaan. Deze oefening verandert je bedrijf en leerprogressie niet.": "Well done. This exercise does not change your business or learning progress.",
  "Goed geboekt": "Correct entry",
  "De cijfers kloppen!": "The figures match!",
  "Terug naar Bedrijf": "Back to Business",
  "Verder oefenen": "Keep practising",
  "Bekijk mijn bedrijf": "View my business",
  "Oefenscenario": "Practice scenario",
  "Eerste boeking": "First entry",
  "Vandaag in je zaak": "Today in your business",
  "Zandbak": "Sandbox",
  "Deze oefening verandert je echte bedrijfscijfers niet.": "This exercise does not change your actual business figures.",
  "Maak de boeking": "Create the entry",
  "In balans": "Balanced",
  "Nog niet in balans": "Not balanced yet",
  "Debet en credit zijn nog niet gelijk. Controleer je bedragen en regels.": "Debit and credit are not equal yet. Check your amounts and lines.",
  "De boeking is in balans, maar een rekening of zijde klopt nog niet. {{hint}}": "The entry is balanced, but an account or side is still incorrect. {{hint}}",
  "De boeking is in balans, maar een rekening of zijde klopt nog niet. Kijk naar wat toeneemt en afneemt.": "The entry is balanced, but an account or side is still incorrect. Look at what increases and decreases.",
  "Bekijk de uitgewerkte oplossing": "View the worked solution",
  "Debet": "Debit",
  "Credit": "Credit",
  "Boeking verwerken…": "Processing entry…",
  "Controleer mijn boeking": "Check my entry",
  "Boekingsregel {{number}}": "Entry line {{number}}",
  "Rekening": "Account",
  "Kies een rekening": "Choose an account",
  "Zijde": "Side",
  "Bedrag": "Amount",
  "Verwijder regel {{number}}": "Delete line {{number}}",
  "Voeg boekingsregel toe": "Add entry line",
  "Terug naar Profiel": "Back to Profile",
  "Oefeningeditor": "Exercise editor",
  "Nieuwe oefening": "New exercise",
  "Klein kopje": "Eyebrow",
  "Hoofdkop": "Heading",
  "Scenario": "Scenario",
  "Vul de oplossing in": "Enter the solution",
  "De oefening kon niet worden opgeslagen. Probeer het opnieuw.": "The exercise could not be saved. Please try again.",
  "Oefening opslaan…": "Saving exercise…",
  "Sla oefening op": "Save exercise",
  "Pixelinterieur van {{sector}}": "Pixel interior of {{sector}}",
  "Groeifase {{tier}} van 3": "Growth stage {{tier}} of 3",
};

type Variables = Record<string, string | number>;

export function translate(language: AppLanguage, text: string, variables: Variables = {}) {
  const template = language === "en" ? english[text] ?? text : text;
  return template.replace(/{{(\w+)}}/g, (_, key: string) => String(variables[key] ?? ""));
}

interface LanguageContextValue {
  language: AppLanguage;
  t: (text: string, variables?: Variables) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: "nl",
  t: (text, variables) => translate("nl", text, variables),
});

export function LanguageProvider({ language, children }: { language: AppLanguage; children: ReactNode }) {
  useEffect(() => {
    document.documentElement.lang = language;
    document.title = language === "en"
      ? "My Business — learn bookkeeping through play"
      : "Mijn Bedrijf — spelenderwijs boekhouden";
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (description) {
      description.content = language === "en"
        ? "Build your business every day and learn bookkeeping through play."
        : "Bouw iedere dag aan je bedrijf en leer spelenderwijs boekhouden.";
    }
  }, [language]);
  return (
    <LanguageContext.Provider value={{ language, t: (text, variables) => translate(language, text, variables) }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useI18n() {
  return useContext(LanguageContext);
}
