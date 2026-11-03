# 0004 — Oefenen, leerprogressie en appversie

Status: geïmplementeerd

## Doel

Als gebruiker wil ik in **Oefenen** beschikbare boekhoudoefeningen kunnen kiezen en zien welk leerniveau ik heb bereikt, zodat ik zonder gevolgen voor mijn bedrijf verder kan leren.

## Reikwijdte

Deze spec beschrijft de pagina achter de navigatieknop **Oefenen**, het spelen van standaardoefeningen en de regels voor leerprogressie en ontgrendeling. Het maken, importeren en exporteren van oefeningen is gespecificeerd in [0002 — Oefeningen beheren](0002-oefeningen-beheren.md). De dagelijkse opdracht en de eerste boeking zijn afzonderlijke scenario's; hun afronding wordt geregistreerd, maar ontgrendeling volgt de afgeronde standaardoefeningen per niveau.

De app toont op ieder scherm een klein, ingetogen versienummer rechtsonder. Dezelfde regels gelden in de Nederlandse en Engelse interface van spec 0003.

## Acceptatiecriteria

### Pagina en oefenaanbod

1. Na het aanmaken van een bedrijf is **Oefenen** bereikbaar via de hoofdnavigatie en toont de pagina het huidige niveau en het aantal unieke beheerste onderwerpen.
2. De pagina toont de secties **Standaard**, **Zelfgemaakt** en **Geïmporteerd**, in die volgorde, zoals vastgelegd in spec 0002.
3. **Standaard** toont de meegeleverde oefeningen die passen bij de gekozen sector, gegroepeerd in afzonderlijk uitklapbare panelen van niveau 0 tot en met 3. Het huidige niveau staat bij openen van de pagina uitgeklapt; de andere niveaus zijn ingeklapt. Niveau 0 bevat alleen **Een goede werkplek** (`buy-equipment`). De eerste boeking (`start-capital`) staat niet in de oefenlijst.
4. Een standaardoefening met een niveau hoger dan het ontgrendelde niveau heeft een uitgeschakelde startknop met het vereiste niveau. Een beschikbare standaardoefening kan opnieuw worden gestart.
5. Zelfgemaakte en geïmporteerde oefeningen zijn direct speelbaar en volgen geen niveau- of sectorontgrendeling.

### Voortgang en ontgrendeling

6. De app bewaart de leerprogressie lokaal als één `Progress`-record in IndexedDB. Bij een nieuw bedrijf begint dat record op niveau 0, met nul geslaagde scenario's en lege lijsten van afgeronde standaardoefeningen en beheerste onderwerpen.
7. Een correcte afronding van de eerste boeking, een dagelijks scenario of een standaardoefening verhoogt `successfulScenarios` met één. Foute pogingen verhogen deze teller niet.
8. Niveau 1 wordt beschikbaar na een correcte afronding van **Een goede werkplek** (`buy-equipment`). De eerste boeking alleen ontgrendelt niveau 1 niet.
9. Niveau 2 wordt beschikbaar zodra alle vier verschillende standaardoefeningen van niveau 1 minstens eenmaal correct zijn afgerond. Niveau 3 volgt nadat alle vier verschillende standaardoefeningen van niveau 2 zijn afgerond.
10. Herhaling van een standaardoefening verhoogt `successfulScenarios` opnieuw, maar versnelt de ontgrendeling niet. Dagelijkse scenario's kunnen een standaardoefening afronden en tellen dan mee voor de ontgrendeling van die specifieke oefening.
11. Bij een correcte afronding worden de template-ID en het concept aan respectievelijk `completedTemplateIds` en `masteredConcepts` toegevoegd, zonder duplicaten. Het getal **onderwerpen onder de knie** is de lengte van `masteredConcepts`.
12. Een zelfgemaakte of geïmporteerde oefening slaat geen poging of afronding op en verandert de leerprogressie niet.
13. Een standaardoefening verandert geen bedrijfsboekingen, groeidagen, reputatie of datum van het dagelijkse scenario. De eerste boeking en dagelijkse scenario's veranderen die gegevens wel.
14. Na een correcte afronding wordt het bijgewerkte niveau op de pagina **Oefenen** zichtbaar en worden standaardoefeningen van dat niveau startbaar, mits ze bij de sector passen. Dezelfde niveaucontrole geldt ook bij het starten in de applicatielaag.
15. Bij het laden wordt `unlockedLevel` opnieuw bepaald uit `completedTemplateIds`, zodat bestaande lokale voortgang en geïmporteerde bedrijfsreservekopieën dezelfde ontgrendelregels volgen.
16. De leerprogressie blijft na herladen beschikbaar en maakt deel uit van de bedrijfsreservekopie. **Wis mijn bedrijf** zet haar terug naar de beginstand; de aparte bibliotheek met zelfgemaakte en geïmporteerde oefeningen blijft behouden.

### Versienummer

17. Het versienummer staat rechtsonder op alle schermen, inclusief taalkeuze, onboarding en scenario's, in een kleine, rustige kleur.
18. De zichtbare waarde komt uit één `APP_VERSION`-constante in `app/version.ts`. Bij iedere appwijziging wordt de patchversie verhoogd; die afspraak staat in `AGENTS.md`.

## Huidig gegevensmodel

- `Progress` bevat `successfulScenarios`, `unlockedLevel`, `completedTemplateIds` en `masteredConcepts`, naast bedrijfsvoortgang.
- `ScenarioInstance` bewaart een concrete poging als speelbaar scenario; `Attempt` bewaart iedere gecontroleerde inzending van een bijgehouden scenario.
- `successfulScenarios` is een totaal over eerste boeking, dagelijkse scenario's en standaardoefeningen. `completedTemplateIds` registreert welke verschillende standaardoefeningen zijn afgerond en bepaalt de ontgrendeling. Er is geen afzonderlijke teller per oefening en geen percentage voor de volledige oefenlijst.
- `completedTemplateIds` beïnvloedt ook de keuze van het volgende willekeurige dagelijkse scenario: nog niet afgeronde templates krijgen voorrang binnen het beschikbare niveau en de gekozen sector.

## Testscenario's

- Een nieuw bedrijf ziet niveau 0; oefeningen op hogere niveaus zijn zichtbaar maar niet startbaar.
- Na **Een goede werkplek** komt niveau 1 beschikbaar, ook als dit pas het tweede succes inclusief de eerste boeking is.
- Na alle vier verschillende niveau 1 oefeningen komt niveau 2 beschikbaar; drie van de vier zijn onvoldoende. Hetzelfde geldt voor niveau 2 en niveau 3.
- Een fout antwoord verandert de progressieteller niet; het nogmaals correct afronden van dezelfde standaardoefening verhoogt de teller zonder een nieuw niveau vrij te geven.
- Een correcte standaardoefening verhoogt de leerprogressie zonder een bedrijfsboeking of groeidag toe te voegen.
- Een zelfgemaakte of geïmporteerde oefening verandert de leerprogressie niet.
- Een oefening voor een andere sector verschijnt niet in de standaardlijst en kan niet als standaardoefening worden gestart.
- Na herladen en na export en import van de bedrijfsreservekopie is de leerprogressie gelijk; na **Wis mijn bedrijf** begint zij opnieuw.
- Het versienummer is op de taalkeuze en in de Nederlandse en Engelse app zichtbaar, zonder navigatieknoppen te blokkeren.

## Aannames

- Voor niveau 3 geldt hetzelfde leerpad als voor niveau 2: alle oefeningen van het vorige niveau moeten zijn afgerond.
- Het vink-icoon op een beschikbare standaardkaart betekent in de huidige interface **beschikbaar**, niet **afgerond**.
- Het maximum blijft niveau 3 zolang de meegeleverde templates maximaal niveau 3 hebben.
