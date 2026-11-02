# 0002 — Oefeningen beheren

Status: klaar voor implementatie

## Doel

Als gebruiker wil ik op mijn profiel oefeningen kunnen maken, importeren en exporteren, zodat ik naast de ingebouwde oefeningen ook mijn eigen en gedeelde boekhoudvragen in de Oefenruimte kan gebruiken.

## Reikwijdte

Deze feature voegt uitklapbare beheerpanelen toe aan **Profiel**, introduceert een oefeningeditor en deelt de Oefenruimte in op oefenbron: **Standaard**, **Zelfgemaakt** en **Geïmporteerd**.

Een oefening bestaat in deze versie uit:

- een klein kopje (`kicker`);
- een hoofdkop (`title`);
- de scenariotekst (`story`);
- twee tot vier boekingsregels die samen de juiste oplossing vormen.

Het bewerken en verwijderen van opgeslagen oefeningen valt buiten deze versie.

## Acceptatiecriteria

### Profiel

1. Het bestaande paneel **Lokale gegevens** is uitklapbaar.
2. De kop van **Lokale gegevens** blijft altijd zichtbaar; de bestaande uitleg en acties voor de bedrijfsreservekopie staan in de uitklapbare inhoud.
3. Direct onder **Lokale gegevens** staat een tweede uitklapbaar paneel met de naam **Oefeningen**.
4. De panelen zijn onafhankelijk van elkaar te openen en zijn bij het openen van Profiel standaard ingeklapt.
5. In **Oefeningen** staan de acties **Exporteer oefeningen**, **Importeer oefeningen** en **Open oefeningeditor**.
6. Status- en foutmeldingen van importeren, exporteren en opslaan worden bij het paneel **Oefeningen** getoond en zijn toegankelijk als live statusmelding.

### Oefeningeditor

1. **Open oefeningeditor** opent een afzonderlijk editorscherm in de visuele stijl van een scenario, met een terugknop naar Profiel.
2. Bovenaan staan bewerkbare velden voor het kleine kopje, de hoofdkop en de scenariotekst.
3. Lege velden tonen respectievelijk de placeholders **Example 1**, **Example 2** en **Example 3**; placeholders gelden niet als ingevulde waarden.
4. Onder de vraagtekst staat een bewerkbare oplossing met dezelfde rekening-, debet/credit- en bedraginvoer als een scenario.
5. De editor start met twee boekingsregels. De gebruiker kan regels toevoegen en verwijderen tot minimaal twee en maximaal vier regels.
6. Onderaan staat **Sla oefening op** in plaats van **Controleer mijn boeking**.
7. **Sla oefening op** is alleen beschikbaar wanneer:
   - alle drie tekstvelden na trimmen een waarde bevatten;
   - iedere boekingsregel een bestaande rekening, een zijde en een positief bedrag bevat;
   - de totale debet- en creditbedragen groter dan nul en aan elkaar gelijk zijn.
8. Opslaan maakt een nieuwe oefening met oefenbron **Zelfgemaakt**, bewaart deze lokaal en keert terug naar Profiel met het paneel **Oefeningen** geopend en een succesmelding.
9. Teruggaan zonder opslaan verwerpt de wijzigingen van de huidige editorsessie.

### Exporteren

1. **Exporteer oefeningen** maakt één JSON-bestand met uitsluitend oefeningen die in de editor zijn gemaakt.
2. Standaardoefeningen en geïmporteerde oefeningen worden niet opgenomen in de export.
3. De exportactie is uitgeschakeld wanneer er geen zelfgemaakte oefeningen zijn.
4. Het bestand heet `mijn-bedrijf-oefeningen-YYYY-MM-DD.json` en gebruikt het volgende versieerbare formaat:

```json
{
  "schemaVersion": 1,
  "exportedAt": "2026-10-29T12:00:00.000Z",
  "exercises": [
    {
      "id": "een-stabiele-uuid",
      "kicker": "Example 1",
      "title": "Example 2",
      "story": "Example 3",
      "solution": [
        { "accountId": "bank", "side": "debit", "amountCents": 10000 },
        { "accountId": "capital", "side": "credit", "amountCents": 10000 }
      ]
    }
  ]
}
```

5. De bestaande reservekopie onder **Lokale gegevens** blijft een bedrijfsreservekopie en bevat geen oefenbibliotheek.

### Importeren

1. **Importeer oefeningen** accepteert uitsluitend een lokaal `.json`-bestand.
2. Het bestand moet `schemaVersion: 1` en een array `exercises` bevatten volgens hetzelfde formaat als de export.
3. Iedere geïmporteerde oefening moet niet-lege tekstvelden, twee tot vier geldige boekingsregels, bestaande rekening-ID's, positieve bedragen in hele centen en een gebalanceerde oplossing bevatten.
4. De import is atomair: als het bestand of één oefening ongeldig is, wordt niets geïmporteerd en ziet de gebruiker een begrijpelijke foutmelding.
5. Geldige oefeningen worden lokaal opgeslagen met oefenbron **Geïmporteerd**, ook wanneer het bestand oorspronkelijk uit deze app is geëxporteerd.
6. Opnieuw importeren van dezelfde oefening-ID werkt de bestaande geïmporteerde oefening bij en maakt geen duplicaat.
7. Een geïmporteerde oefening overschrijft nooit een zelfgemaakte oefening met dezelfde ID; beide blijven als afzonderlijke oefeningen bestaan.
8. Na een geslaagde import vermeldt de statusmelding hoeveel oefeningen zijn toegevoegd en hoeveel zijn bijgewerkt.

### Oefenruimte

1. De Oefenruimte toont drie afzonderlijke secties in deze volgorde: **Standaard**, **Zelfgemaakt** en **Geïmporteerd**.
2. **Standaard** bevat de bestaande, met de app meegeleverde oefeningen en behoudt de bestaande niveau- en sectorbeperkingen.
3. **Zelfgemaakt** bevat uitsluitend oefeningen die met de editor zijn opgeslagen.
4. **Geïmporteerd** bevat uitsluitend oefeningen die via een JSON-bestand zijn geïmporteerd.
5. Iedere sectie toont de hoofdkop van de oefening als herkenbare naam en maakt de afzonderlijke oefeningen selecteerbaar.
6. Een lege sectie blijft zichtbaar en toont een passende lege status met, waar relevant, een verwijzing naar Profiel om oefeningen te maken of importeren.
7. Het openen van een zelfgemaakte of geïmporteerde oefening gebruikt de bestaande oefenscenario-interface en verandert geen bedrijfscijfers of leerprogressie.
8. Voor zelfgemaakte en geïmporteerde oefeningen gebruikt het speelscherm generieke fout- en succesfeedback; hint, extra toelichting en bedrijfseffect zijn in deze versie niet bewerkbaar.

## Gegevens en validatie

- Standaardoefeningen blijven onderdeel van de applicatiecode en worden niet naar lokale opslag gekopieerd.
- Zelfgemaakte en geïmporteerde oefeningen worden als afzonderlijke lokale oefenrecords in IndexedDB bewaard met een stabiele ID en oefenbron.
- De JSON-inhoud wordt bij import als onbetrouwbare invoer behandeld en volledig gevalideerd voordat opslag plaatsvindt.
- Bedragen worden opgeslagen als positieve gehele centen; de editor mag een lokaal geformatteerd eurobedrag tonen.
- De bestaande rekeningenlijst is de enige toegestane bron voor `accountId`.
- HTML of scripts in tekstvelden worden als gewone tekst weergegeven.

## Testscenario's

- Profiel opent met beide panelen ingeklapt; ieder paneel kan onafhankelijk worden geopend en gesloten.
- **Lokale gegevens** bevat na uitklappen de bestaande backupfunctionaliteit; **Wis mijn bedrijf** blijft als afzonderlijk veiligheidspaneel zichtbaar.
- De oefeningeditor toont de drie placeholders en twee lege boekingsregels.
- De opslaanknop blijft uitgeschakeld bij een leeg tekstveld, onvolledige regel, nulbedrag of ongebalanceerde oplossing.
- Een volledige gebalanceerde oefening wordt opgeslagen als **Zelfgemaakt** en verschijnt direct in die sectie van de Oefenruimte.
- Export bevat alle en alleen zelfgemaakte oefeningen in het vastgelegde schema.
- Een geldig JSON-bestand wordt geïmporteerd en de oefeningen verschijnen onder **Geïmporteerd**.
- Een gedeeltelijk ongeldig bestand importeert geen enkele oefening en toont een foutmelding.
- Herimport van dezelfde ID werkt de geïmporteerde oefening bij zonder duplicaat.
- Een geïmporteerde ID die gelijk is aan een zelfgemaakte ID overschrijft de zelfgemaakte oefening niet.
- Standaard-, zelfgemaakte en geïmporteerde oefeningen verschijnen uitsluitend in hun eigen sectie.
- Een zelfgemaakte of geïmporteerde oefening kan worden afgerond zonder bedrijfs- of leerprogressie te wijzigen.
- Zelfgemaakte en geïmporteerde oefeningen blijven beschikbaar na herladen en na **Wis mijn bedrijf**.

## Aannames

- Beide profielpanelen zijn standaard ingeklapt om de pagina compact te houden.
- **Wis mijn bedrijf** wist profiel, voortgang en boekingen, maar bewaart zelfgemaakte en geïmporteerde oefeningen.
- Alle zelfgemaakte en geïmporteerde oefeningen zijn direct speelbaar; alleen standaardoefeningen volgen de bestaande ontgrendeling per niveau en sector.
- Opslaan maakt altijd een nieuwe oefening; bewerken, dupliceren en verwijderen worden later gespecificeerd.
- De editor beheert in deze versie geen niveau, concept, sector, hint, succes-uitleg of visueel bedrijfseffect.
- Importeren voegt oefeningen samen met de bestaande bibliotheek en vervangt de bibliotheek niet volledig.
