# 0001 — Feedback en afronding dagelijks scenario

Status: geïmplementeerd

## Doel

Als gebruiker wil ik na iedere controle van het dagelijkse scenario duidelijke feedback krijgen en na een correcte boeking worden teruggeleid naar het startscherm van de tab **Bedrijf**.

## Reikwijdte

Deze verandering geldt uitsluitend voor het dagelijkse scenario (`scenario.mode === "daily"`). De eerste boeking/tutorial en oefenscenario's behouden hun bestaande gedrag.

## Acceptatiecriteria

### Onjuiste boeking

1. Na een onjuiste controle blijft de gebruiker in het scenario en blijven de ingevulde boekingsregels behouden.
2. Onderaan het boekingspaneel verschijnt precies één relevante hint, na het balansoverzicht en boven de knop **Controleer mijn boeking**.
3. Bij een onvolledige of niet-sluitende boeking legt de hint uit dat debet en credit nog niet gelijk zijn.
4. Bij een gebalanceerde maar inhoudelijk onjuiste boeking benoemt de hint dat een rekening of zijde niet klopt en wordt de scenariohint uit `scenario.hint` toegevoegd.
5. De succes-uitleg uit `scenario.explanation` wordt bij een fout antwoord niet getoond.
6. Alleen foutieve inzendingen tellen mee voor het vrijgeven van de oplossing.
7. Vóór de derde foutieve inzending is **Bekijk de uitgewerkte oplossing** niet zichtbaar of toegankelijk.
8. Direct na de derde foutieve inzending verschijnt deze actie ingeklapt tussen de hint en de controleknop.
9. De uitgewerkte oplossing toont de juiste rekeningen, zijden en bedragen, maar vult niets automatisch in en rondt het scenario niet af.
10. Na het bekijken van de oplossing kan de gebruiker zelf verdergaan en opnieuw een boeking indienen.
11. De teller geldt per geopende scenariosessie en begint opnieuw nadat het scenario is verlaten of de pagina is herladen.

### Correcte boeking

1. De scenario-afronding wordt opgeslagen voordat het succes-eindscherm verschijnt.
2. Het boekingsscherm wordt vervangen door een afzonderlijk succes-eindscherm met de scenario-specifieke uitleg uit `scenario.explanation`.
3. Op het eindscherm zijn geen hint, uitgewerkte oplossing of boekingsvelden zichtbaar.
4. De bestaande positieve titel en het effect op het bedrijf blijven zichtbaar.
5. De enige interactieve actie is **Terug naar Bedrijf**; er is geen terug- of sluitactie naar het afgeronde scenario.
6. **Terug naar Bedrijf** sluit het actieve scenario, activeert de tab **Bedrijf** en toont de bijgewerkte bedrijfsgegevens met de status **Klaar voor vandaag**.

## Implementatieafspraken

- `scenario.hint` is uitsluitend corrigerende hulp na een fout; `scenario.explanation` is uitsluitend uitleg na succes.
- Het aantal foutpogingen en de zichtbaarheid van de oplossing zijn lokale schermstatus en worden niet uit opgeslagen pogingen hersteld.
- Het verlaten van een onafgerond scenario en doorgaan na succes gebruiken afzonderlijke componentcallbacks.
- De bestaande hoofdroute blijft behouden; de terugkeer naar Bedrijf verloopt via de lokale hoofdweergave.
- Gedragswijzigingen worden op `scenario.mode === "daily"` begrensd om tutorial- en oefenflows te behouden.

## Testscenario's

- Een ongebalanceerde fout toont de balanshint, verbergt de succes-uitleg en behoudt de invoer.
- Een gebalanceerde fout toont de inhoudelijke foutmelding en de scenariohint op de afgesproken positie.
- De oplossing ontbreekt na één en twee fouten en verschijnt na de derde fout.
- Het openen van de oplossing vult of voltooit het scenario niet.
- Een nieuwe scenariosessie begint zonder vrijgegeven oplossing.
- Een correcte boeking toont uitleg, verbergt hint en oplossing en biedt uitsluitend **Terug naar Bedrijf**.
- De succesactie toont het Bedrijf-startscherm met bijgewerkte cijfers en **Klaar voor vandaag**.
- De bestaande tutorial- en oefenflows blijven werken.

## Aannames

- Het succes-eindscherm is een afzonderlijke schermstatus met een visuele succeskaart, geen afsluitbare modal.
- Het verbod op terugkeren naar het afgeronde scenario betreft navigatie binnen de applicatie; browserbediening valt buiten deze specificatie.
- Voorbeeldteksten beschrijven het gewenste type feedback en hoeven niet voor ieder scenario letterlijk gelijk te zijn.
