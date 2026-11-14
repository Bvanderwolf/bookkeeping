# 0006 — Events na actieve speeldagen

Status: geïmplementeerd

## Doel

Als gebruiker wil ik tijdens het opbouwen van mijn bedrijf af en toe een bijzondere boekhoudsituatie tegenkomen. Naast mijn dagelijkse scenario kan ik een maandafsluiting verwerken, vragen van de accountant beantwoorden of een factuur zonder bestelling voorlopig boeken. Via een ontwikkelaarsoptie kan ik deze events herhaaldelijk oefenen.

## Reikwijdte

Een **event** is een afzonderlijke opdracht op **Bedrijf**, naast de eerste boeking, het dagelijkse scenario en de oefeningen. Events volgen de lokale voortgang van het bedrijf. De normale eventcyclus is gebaseerd op actieve speeldagen, niet op appstarts of het aantal scenario's.

## Acceptatiecriteria

### Planning en keuze

1. Een actieve speeldag is een lokale kalenderdatum waarop de eerste boeking of minstens één dagelijks bedrijfsscenario correct is afgerond. Een geopende app, fout antwoord, onafgerond scenario of oefening telt niet mee. Meerdere afgeronde bedrijfsscenario's op dezelfde datum tellen als één dag.
2. Direct na de zesde verschillende actieve speeldag verschijnt één event op **Bedrijf**. Het normale dagscenario blijft daarnaast beschikbaar.
3. Het eerste event wordt willekeurig gekozen uit **Maandafsluiting**, **Accountantsbezoek** en **Factuur zonder bestelling**, met gelijke kans. Een volgend event wordt willekeurig gekozen uit de twee andere types; hetzelfde type komt nooit direct opnieuw.
4. Er kan maximaal één event openstaan. Een onafgerond event blijft ook na een nieuwe kalenderdag of herladen beschikbaar. Terwijl het openstaat, wordt geen nieuw event aangemaakt.
5. Na afronding tellen alleen actieve speeldagen met een datum ná de lokale afrondingsdatum mee voor het volgende event. Zes van zulke dagen leveren het volgende event op. Eerdere actieve dagen en de afrondingsdag zelf tellen daarvoor niet opnieuw.
6. Bij bestaande lokale voortgang zonder events tellen reeds opgeslagen actieve speeldagen mee. Als er al minstens zes zijn, wordt hoogstens één event aangemaakt; er ontstaat geen achterstand of wachtrij.

### Maandafsluiting

7. De speler krijgt een ontvangen dienst te zien waarvan de leveranciersfactuur nog ontbreekt. Het bedrag wordt bij het aanmaken van het event gekozen uit € 150, € 300 of € 450 en blijft voor dit event vast.
8. De juiste boeking is **Algemene kosten debet** en **Nog te ontvangen facturen credit** voor hetzelfde bedrag. De nieuwe schuldrekening is zichtbaar in de bestaande boekingsinvoer en in het overzicht.
9. De boekingsinvoer geeft bij fouten de bestaande feedback en laat na drie fouten de uitgewerkte oplossing zien. Alleen een correcte boeking rondt het event af.
10. Afronding maakt precies één journaalpost aan, verhoogt de schuld en verlaagt het resultaat met het eventbedrag. Herhaald afronden maakt geen tweede journaalpost. De latere ontvangst of betaling van de factuur is geen onderdeel van deze spec.

### Factuur zonder bestelling

11. De speler ontvangt een nog onbetaalde leveranciersfactuur zonder terug te vinden bestelling. Niemand weet bij welke kostenpost de factuur hoort. Het bedrag wordt bij het aanmaken gekozen uit € 150, € 300 of € 450 en blijft vast.
12. De juiste voorlopige boeking is **Tussenrekening debet** en **Crediteuren credit** voor hetzelfde bedrag. De tussenrekening staat als tijdelijke bezitting op de balans; het resultaat verandert nog niet.
13. De eventkaart en scenario-omschrijving beschrijven de ontbrekende bestelling en onbekende kostensoort zonder rekeningen of boekingszijden te noemen. De hint helpt na een fout met de redenering, maar noemt de oplossing niet. Na drie fouten is de uitgewerkte oplossing beschikbaar. Alleen een correcte boeking rondt het event af.
14. Afronding maakt precies één journaalpost aan. De latere indeling van de kosten en betaling van de factuur vallen buiten deze spec; het bedrag blijft tot dan op de tussenrekening en bij de crediteuren staan.

### Accountantsbezoek

15. De accountant stelt drie meerkeuzevragen, achtereenvolgens over een toename van bankbezit, het boeken van bedrijfskosten en het ontstaan van een leveranciersschuld. De juiste zijden zijn respectievelijk debet, debet en credit.
16. Een fout antwoord toont uitleg en laat de speler dezelfde vraag opnieuw beantwoorden. Ieder correct antwoord wordt opgeslagen, zodat herladen doorgaat bij de eerstvolgende vraag.
17. Na het derde correcte antwoord verschijnt een afrondingsscherm. Als de antwoorden al zijn opgeslagen maar de eventafronding nog niet, kan de speler die afronding na herladen hervatten. Het scherm probeert dan geen vierde vraag te tonen.
18. Het accountantsbezoek maakt geen journaalpost en verandert de bedrijfscijfers niet.

### Voortgang, opslag en interface

19. Alle drie eventtypes krijgen een eigen kaart en speelbaar scherm in het Nederlands en Engels. De kaart verdwijnt na afronding; de gebruiker kan terug naar **Bedrijf**.
20. Een event verhoogt geen groeidagen, reputatie, leerniveau of teller voor geslaagde scenario's. De journaalposten van de maandafsluiting en factuur zonder bestelling beïnvloeden de balans; alleen de maandafsluiting beïnvloedt het resultaat.
21. Eventtype, bedrag, beantwoorde vragen en afronding worden lokaal in IndexedDB bewaard en opgenomen in de bedrijfsreservekopie. Import van een oudere reservekopie zonder `events` blijft mogelijk. **Wis mijn bedrijf** wist ook de events.
22. De functie blijft volledig client-side en werkt na herladen, offline en onder het GitHub Pages-basispad `/<repository-name>/`.

### Ontwikkelaarsoptie

23. **Profiel** toont onder **Ontwikkelaarsopties** de aparte schakelaar **Onbeperkt events oefenen**. Deze staat standaard uit, blijft na herladen in dezelfde browser behouden, staat buiten de bedrijfsreservekopie en wordt bij **Wis mijn bedrijf** uitgezet.
24. Met de optie aan toont **Bedrijf** zonder open event de actie **Nieuw event**, ook vóór zes actieve speeldagen. Die maakt direct een nieuwe, opgeslagen eventinstantie met een uniek ID. Na afronding kan meteen weer een event worden gestart.
25. Als er al een event openstaat, blijft alleen **Open event** beschikbaar. Uitschakelen verbergt **Nieuw event**, maar wist een al geopend event niet.
26. Extra events volgen dezelfde loting zonder directe herhaling en dezelfde verwerking als gewone events. Ook de afronding van een extra event start een nieuwe reeks van zes actieve speeldagen.

## Huidig gegevensmodel

- `BusinessEvent` bewaart `id`, `type`, `triggeredAt`, `amountCents` voor beide boekingsevents, `answeredQuestions`, `completedAt` en `completedDate`.
- `AppSnapshot.events` is optioneel voor achterwaartse compatibiliteit met oudere reservekopieën. De actuele opslag bevat een afzonderlijke `events`-tabel.
- De voorkeur voor onbeperkt oefenen staat in lokale browseropslag, los van `Progress` en de bedrijfsreservekopie.
- Actieve speeldagen worden afgeleid uit de `assignedDate` van afgeronde `tutorial`- en `daily`-scenario-instanties.

## Testscenario's

- Vijf unieke actieve dagen tonen geen event; de zesde dag doet dat direct. De eerste boeking telt mee, een oefening en een extra scenario op dezelfde datum niet.
- Een open event blijft na herladen staan en verhindert een tweede event. Na afronding zijn zes nieuwe actieve speeldagen nodig.
- Het eerste type kan elk van de drie waarden krijgen; een volgend type is willekeurig een van de twee andere.
- De maandafsluiting toont foutfeedback, boekt het juiste bedrag één keer en verandert geen leer- of groeivoortgang.
- Een factuur zonder bestelling gebruikt de tussenrekening en crediteuren, houdt het resultaat gelijk en boekt bij herhaalde afronding geen tweede keer.
- Het accountantsbezoek bewaart correcte antwoorden, laat een fout antwoord opnieuw proberen en toont ook bij drie opgeslagen antwoorden zonder `completedAt` een hervatbare afronding.
- Export en import behouden een open event; een oudere reservekopie zonder events is geldig; reset wist events en de ontwikkelaarsvoorkeur.
- Met de ontwikkelaarsoptie aan kunnen meerdere events na elkaar worden afgerond. Na uitschakelen verdwijnt **Nieuw event**, terwijl een open event speelbaar blijft.
- Nederlandse en Engelse schermen, browserflow en `BASE_PATH=/bookkeeping/ npm run build` werken.
