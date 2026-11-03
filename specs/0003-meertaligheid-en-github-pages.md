# 0003 — Meertaligheid en GitHub Pages-compatibiliteit

Status: geïmplementeerd

## Doel

Als gebruiker wil ik bij de eerste start Nederlands of Engels kiezen en die keuze later in mijn profiel kunnen wijzigen, zodat ik de interface en de meegeleverde oefeningen in mijn voorkeurstaal kan gebruiken.

Als beheerder wil ik dat iedere wijziging aan de applicatie onder het repositorysubpad van GitHub Pages blijft werken, zodat nieuwe functionaliteit de gepubliceerde app, navigatie, assets of offlinewerking niet breekt.

## Reikwijdte

De taalkeuze geldt voor:

- alle navigatie, knoppen, labels, meldingen en overige interfacekopij;
- sector- en aanbodnamen en hun beschrijvingen;
- rekeningnamen, debet/credit-termen, bedragen en datumweergave;
- titels, conceptnamen, verhalen, hints, uitleg en bedrijfseffecten van alle standaardoefeningen;
- de HTML-taalaanduiding, documenttitel en paginabeschrijving nadat de app is geladen.
- de toegankelijke aanduiding van het globale versienummer, dat verder is vastgelegd in spec 0004.

De taalkeuze geldt niet voor:

- bedrijfsnamen en andere tekst die de gebruiker zelf invoert;
- zelfgemaakte oefeningen;
- geïmporteerde oefeningen;
- de inhoud van eerder geïmporteerde externe bestanden.

GitHub Pages-compatibiliteit geldt voor de volledige productieapp, inclusief router, assets, PWA-manifest, service worker, offlinecache en deelafbeeldingen.

## Ondersteunde talen

| Code | Taal | Interface-locale |
| --- | --- | --- |
| `nl` | Nederlands | `nl-NL` |
| `en` | Engels | `en-GB` |

Engels is een volledige gebruikstaal, geen gedeeltelijke of experimentele vertaling. Euro blijft in beide talen de munteenheid.

## Acceptatiecriteria

### Eerste start

1. Wanneer nog geen taalvoorkeur is opgeslagen, verschijnt vóór de bedrijfsonboarding een afzonderlijk taalkeuzescherm.
2. Het taalkeuzescherm biedt precies de ondersteunde talen Nederlands en Engels aan en is zonder voorkennis van één taal begrijpelijk.
3. Na een keuze wordt de taalvoorkeur lokaal opgeslagen en gaat de gebruiker direct door naar de bedrijfsonboarding in de gekozen taal.
4. Bij volgende bezoeken wordt het taalkeuzescherm overgeslagen en wordt de opgeslagen taal direct gebruikt.
5. Een bestaande installatie zonder taalvoorkeur krijgt het taalkeuzescherm eenmaal bij de eerstvolgende opening te zien.

### Taal wijzigen in Profiel

1. Profiel bevat een zichtbare instelling **Taal / Language** met Nederlands en Engels als opties.
2. De actieve taal is herkenbaar geselecteerd.
3. Een andere taal kiezen werkt direct, zonder herladen van de pagina en zonder verlies van de actieve bedrijfsgegevens.
4. Na de wijziging worden navigatie, profielinhoud, rekeningnamen, bedragen en standaardoefeningen in dezelfde taal weergegeven.
5. Het wissen van het bedrijf met **Wis mijn bedrijf / Delete my business** bewaart de taalvoorkeur.
6. Een reservekopie bevat de taalvoorkeur. Bij import van een oudere reservekopie zonder taalveld blijft de huidige taalvoorkeur behouden.

### Interfacevertaling

1. Iedere voor de gebruiker zichtbare systeemtekst in de normale appflows heeft Nederlandse en Engelse kopij.
2. Rekeningnamen en sectorinformatie worden op basis van stabiele interne ID's vertaald; opgeslagen boekingsregels blijven taalneutraal.
3. Geldbedragen gebruiken euro en de conventies van de actieve locale.
4. Datums gebruiken de conventies van de actieve locale.
5. `document.documentElement.lang` is gelijk aan de actieve taalcode.
6. De documenttitel en meta-omschrijving worden na het laden in de actieve taal gezet.
7. Zelfgemaakte en geïmporteerde tekst wordt exact in de opgeslagen taal getoond en nooit automatisch vertaald.

### Standaardoefeningen

1. Alle zestien standaardoefeningen hebben volledige Nederlandse en Engelse inhoud.
2. Per standaardoefening zijn minimaal titel, scenariotekst, hint, succes-uitleg en bedrijfseffect vertaald.
3. Conceptnamen in de Oefenruimte worden in de actieve taal weergegeven.
4. Een nieuw tutorial-, dag- of oefenscenario wordt in de actieve taal aangemaakt.
5. Een reeds opgeslagen standaardscenario wordt bij weergave opnieuw uit template-ID en bedrag gelokaliseerd, zodat een taalwissel ook bestaande scenario's vertaalt.
6. De journaalomschrijving van een standaardscenario wordt bij weergave in de actieve taal afgeleid wanneer de bijbehorende scenario-instance beschikbaar is.
7. Oplossingen blijven taalneutraal opgeslagen met rekening-ID, zijde en bedrag; alleen de presentatie wordt vertaald.

### GitHub Pages

1. De productieapp blijft volledig statisch en vereist geen applicatieserver of server-side API.
2. De Vite-build gebruikt `BASE_PATH` als basis voor zowel Vite als React Router.
3. Routes, JavaScript, CSS, afbeeldingen, manifest en service worker werken onder `/<repositorynaam>/` en veronderstellen niet dat de app op `/` staat.
4. PWA-URLs worden opgebouwd via `import.meta.env.BASE_URL` of relatief aan de service-workerscope.
5. Een directe opening en herlading van de Pages-root toont de SPA.
6. Na een eerste online bezoek blijft de app offline te openen.
7. De GitHub Actions-workflow bouwt met `BASE_PATH=/${{ github.event.repository.name }}/` en publiceert `build/client`.

## Gegevensmodel en opslag

- De taalcode is `AppLanguage = "nl" | "en"`.
- De taalvoorkeur staat als afzonderlijke instelling in IndexedDB en is niet afhankelijk van het bestaan van een bedrijfsprofiel.
- `AppSnapshot.language` maakt de voorkeur onderdeel van een bedrijfsreservekopie, maar blijft optioneel voor achterwaartse compatibiliteit met oudere backups.
- Domeingegevens gebruiken stabiele ID's. Vertaalde labels worden niet als boekhoudkundige brongegevens opgeslagen.
- Opgeslagen scenario-inhoud mag voor compatibiliteit tekstvelden bevatten; de weergave van standaardscenario's wordt opnieuw opgebouwd uit template, profiel, bedrag en actieve taal.

## Implementatieafspraken

- Algemene interfacekopij en de vertaalcontext staan in `app/i18n.tsx`.
- Nederlandse rekening- en sectordata blijven de bestaande basis; Engelse varianten en localehelpers staan in `app/domain/accounts.ts`.
- Nederlandse standaardscenario's en hun Engelse varianten blijven samen gekoppeld aan dezelfde template-ID in `app/domain/scenarios.ts`.
- Componenten vragen de actieve taal op via de taalcontext en slaan geen eigen taalvoorkeur op.
- Een ontbrekende vertaling mag tijdens ontwikkeling terugvallen op de Nederlandse brontekst, maar voldoet pas aan deze specificatie wanneer beide talen volledig zijn ingevuld en getest.
- Zelfgemaakte en geïmporteerde oefeningen blijven inhoudelijk los van de interfacevertalingen.
- Repositorybrede GitHub Pages-randvoorwaarden staan ook in `AGENTS.md`, zodat uitvoerende agents ze bij toekomstige wijzigingen automatisch meenemen.

## Onderhouds- en wijzigingsregels

Deze spec is de bron voor toekomstige wijzigingen aan taal, interfacekopij, standaardoefeningen, routing, assets en PWA-gedrag.

Bij iedere relevante wijziging:

1. Werk eerst de reikwijdte, acceptatiecriteria en eventuele aannames in deze spec bij.
2. Voeg nieuwe systeemkopij in zowel Nederlands als Engels toe.
3. Voeg een nieuwe standaardoefening in beide talen toe en behoud één stabiele template-ID en één taalneutrale oplossing.
4. Breid `AppLanguage`, de taalkeuze, locales en tests gezamenlijk uit wanneer een derde taal wordt toegevoegd.
5. Controleer dat zelfgemaakte en geïmporteerde inhoud niet onbedoeld wordt vertaald.
6. Controleer bij nieuwe routes, assets of PWA-bestanden alle URL-opbouw onder een repositorysubpad.
7. Werk het aantal standaardoefeningen in deze spec bij wanneer templates worden toegevoegd of verwijderd.
8. Houd deze spec op status **geïmplementeerd** wanneer code en tests overeenkomen; wijzig de status wanneer vastgelegde criteria nog niet zijn gebouwd.

## Verificatie

Voer voor een wijziging die onder deze spec valt minimaal uit:

```bash
npm run typecheck
npm test
npm run test:e2e
BASE_PATH=/bookkeeping/ npm run build
```

Voer bij wijzigingen aan manifest, service worker, cache of offlinegedrag ook uit:

```bash
npm run build
npm run test:pwa
```

Controleer in aanvulling op de geautomatiseerde tests:

- eerste start in Nederlands en Engels;
- directe taalwissel in Profiel;
- een bestaande standaardoefening vóór en na een taalwissel;
- rekeningnamen, valuta en datums in beide talen;
- gegenereerde asset- en router-URL's met `/bookkeeping/` als voorbeeldsubpad.

## Testscenario's

- Een lege installatie toont de tweetalige taalkeuze vóór de onboarding.
- Nederlands opent een volledig Nederlandse onboarding; Engels opent een volledig Engelse onboarding.
- Herladen slaat het taalkeuzescherm over en behoudt de gekozen taal.
- Een wissel van Engels naar Nederlands in Profiel past de interface direct aan en zet het HTML `lang`-attribuut op `nl`.
- Een wissel van Nederlands naar Engels vertaalt een al opgeslagen tutorial of standaardoefening.
- Iedere standaardsjabloon heeft in beide talen verschillende, niet-lege titel-, verhaal-, hint-, uitleg- en effecttekst.
- Rekeningnamen en sectorlabels zijn Engels terwijl zelfgemaakte of geïmporteerde oefentekst ongewijzigd blijft.
- **Wis mijn bedrijf** verwijdert bedrijf en boekingen, maar behoudt de taal.
- Import van een oude backup zonder `language` behoudt de huidige taal.
- De app doorloopt onboarding, scenario en profiel onder een mobiel viewport in beide talen.
- De Pages-build bevat het ingestelde repositorysubpad in router-, manifest- en asset-URL's.
- De productie-PWA opent na het eerste online bezoek zonder netwerkverbinding.

## Aannames

- De taalkeuze vertaalt alleen applicatie-inhoud; de boekhoudkundige betekenis en oplossingen zijn in beide talen identiek.
- Er is geen automatische vertaaldienst of netwerkverbinding nodig.
- De statische manifestnaam kan algemeen of tweetalig zijn; de in-app taalvoorkeur blijft leidend voor de geladen interface.
- Het voorbeeldpad `/bookkeeping/` in verificatiecommando's vertegenwoordigt ieder geldig GitHub Pages-repositorysubpad.
