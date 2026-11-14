# 0005 — Ontwikkelaarsopties: onbeperkt scenario's oefenen

Status: geïmplementeerd

## Doel

Als gebruiker wil ik met **Onbeperkt scenario's oefenen** alle niveaus in **Oefenen** kunnen starten en op **Bedrijf** meerdere scenario's op dezelfde dag kunnen oplossen, ook nadat het dagscenario is afgerond.

## Acceptatiecriteria

### Instelling

1. **Profiel** toont na onboarding onder **Ontwikkelaarsopties** de schakelaar **Onbeperkt scenario's oefenen**. De schakelaar staat standaard uit en is toegankelijk met toetsenbord en schermlezer.
2. De keuze blijft na herladen in dezelfde browser behouden. Zij staat buiten de bedrijfsreservekopie en wordt bij **Wis mijn bedrijf** uitgeschakeld.
3. De instelling en de nieuwe bediening werken in de Nederlandse en Engelse interface.

### Oefenen

4. Met de optie aan zijn alle sectorpassende standaardoefeningen van niveau 0 tot en met 3 startbaar, ook als het normale leerniveau lager is. De niveaupanelen staan dan open en tonen geen vergrendeling. Er verschijnt geen apart paneel **Onbeperkt oefenen**.
5. Dezelfde niveauvrijstelling geldt bij het starten in de applicatielaag. Sectorvreemde templates en de eerste boeking (`start-capital`) blijven buiten de standaardlijst.
6. Het werkelijk behaalde niveau in `Progress` verandert niet door het inschakelen van de optie. Een correct afgeronde standaardoefening telt volgens de bestaande leerregels mee; het opnieuw starten van dezelfde oefening blijft mogelijk.
7. Na uitschakelen zijn niveaus boven het werkelijk behaalde niveau weer vergrendeld, zonder opgeslagen voortgang te wissen.

### Bedrijf

8. Na de eerste boeking kan de gebruiker met de optie aan op **Bedrijf** steeds een nieuw dagscenario openen, ook wanneer de kaart **Klaar voor vandaag** toont. De actie heet dan **Nieuw scenario**.
9. Iedere start met de optie aan maakt een nieuwe `daily`-instantie met een uniek ID. De lokale datum blijft de toewijzingsdatum, maar beperkt het aantal scenario's niet. Eerder opgeloste templates en bedragen mogen terugkomen.
10. Correct opgeloste extra dagscenario's worden opgeslagen en verwerkt als gewone dagscenario's: pogingen, journaalpost, leerprogressie, groeidagen, reputatie en `lastDailyDate` worden bijgewerkt. Daardoor kan de gebruiker de groei van het bedrijf herhaaldelijk testen.
11. Na iedere afronding keert de gebruiker via **Terug naar Bedrijf** terug en kan daar meteen **Nieuw scenario** kiezen. Ook na twee of meer afgeronde scenario's op dezelfde dag blijft de actie beschikbaar zolang de optie aanstaat.
12. Met de optie uit geldt de normale daglimiet. Het bestaande dagscenario houdt zijn vaste ID `daily-YYYY-MM-DD`; extra instanties uit ontwikkelaarsmodus worden niet per ongeluk als dat vaste dagscenario hergebruikt.

## Implementatieafspraken

- Bewaar de voorkeur lokaal buiten `Progress`; een ontbrekende waarde betekent uit.
- Gebruik voor extra dagscenario's een UUID als nonce en onderdeel van het instantie-ID. Het normale dagscenario behoudt zijn bestaande vaste ID en deterministische inhoud.
- Maak geen server of extra route; de functie werkt offline en onder het GitHub Pages-basispad.

## Testscenario's

- De schakelaar is standaard uit, blijft na herladen aan en gaat bij reset uit; export bevat de voorkeur niet.
- Een niveau 3 standaardoefening is bij werkelijk niveau 0 eerst vergrendeld, met de optie aan startbaar en na uitschakelen weer vergrendeld.
- Na twee opgeloste bedrijfsscenario's op dezelfde datum blijft **Nieuw scenario** zichtbaar en opent een derde unieke instantie.
- Extra dagscenario's krijgen eigen journaalposten en beïnvloeden de normale bedrijfs- en leerprogressie.
- Het normale dagscenario blijft zonder de optie één vaste instantie per datum gebruiken.
- Nederlandse en Engelse teksten, offline gedrag en `BASE_PATH=/bookkeeping/ npm run build` werken.
