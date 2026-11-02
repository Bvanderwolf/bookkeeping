# Mijn Bedrijf

Een mobile-first PWA waarin beginnende ondernemers spelenderwijs dubbele boekhouding leren. Gebruikers richten een virtuele zaak in, lossen dagelijks een boekhoudscenario op en zien de financiële en visuele gevolgen.

## Functionaliteit

- Onboarding met drie sectoren en twee aanbodkeuzes per sector.
- Zestien gevalideerde, deterministische scenariotemplates in vier leerniveaus.
- Begeleide invoer van debet-, credit- en btw-boekingen.
- Dashboard met pixelzaak, bank, resultaat, reputatie en groeidagen.
- Aparte oefenzandbak zonder invloed op de echte bedrijfsadministratie.
- Balans, winst-en-verliesrekening en journaaloverzicht.
- Lokale IndexedDB-opslag met export, import en volledige reset.
- Installeerbare en na het eerste bezoek offline bruikbare PWA.
- Nederlandse en Engelse interface en standaardoefeningen, met een taalkeuze bij de eerste start en in het profiel.

> De app is een educatieve simulatie en geen boekhoudkundig of fiscaal advies.

## Ontwikkelen

Vereist Node.js 24.x. Met `nvm use` activeer je de versie uit `.nvmrc`.

```bash
npm install
npm run dev
```

De ontwikkelserver opent standaard op `http://localhost:5173`.

## Controleren en bouwen

```bash
npm run typecheck
npm test
npm run build
```

De statische productieversie komt in `build/client`.

## Publiceren op GitHub Pages

De workflow in `.github/workflows/deploy-pages.yml` test, controleert en bouwt de app bij iedere push naar `main`. Tijdens de build wordt het pad van de repository automatisch als basispad gebruikt, zodat assets, de router en de PWA onder `/<repositorynaam>/` werken.

Selecteer eenmalig **GitHub Actions** bij **Settings → Pages → Build and deployment → Source**. Daarna wordt de app gepubliceerd op:

```text
https://<gebruikersnaam>.github.io/<repositorynaam>/
```

Een Pages-build lokaal nabootsen kan met:

```bash
BASE_PATH=/bookkeeping/ npm run build
```

## Inhoud bijwerken

Scenario's staan in `app/domain/scenarios.ts`. Elke template bevat niveau, concept, variabele bedragen, sectorscope, correcte journaalregels, hints en uitleg. De buildvalidatie controleert onder meer unieke id's en gelijke debet- en credittotalen.

Interfacevertalingen staan in `app/i18n.tsx`; Engelse rekening-, sector- en standaardscenario-inhoud staat bij de bijbehorende domeindata. Zelfgemaakte en geïmporteerde oefeningen worden niet automatisch vertaald.

De herbruikbare acceptatiecriteria en onderhoudsregels voor meertaligheid en GitHub Pages staan in [`specs/0003-meertaligheid-en-github-pages.md`](specs/0003-meertaligheid-en-github-pages.md). Werk die spec bij wanneer taalondersteuning, standaardoefeningen, routes, assets of PWA-gedrag verandert.

Laat Nederlandse fiscale scenario's vóór publiek gebruik controleren door een boekhouder en actualiseer btw-regels wanneer de Belastingdienst die wijzigt.
