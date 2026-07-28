# Eskilscupen – bussresor

Mobilanpassad reseplanerare för cupbussarna under Eskilscupen i Helsingborg.
Välj startplan, målplan, datum och tid — appen räknar ut bästa resvägen, även
när den kräver ett eller flera byten.

All tidtabellsdata kommer från cupens officiella PDF
(`data/busslinjer2026eskilscupen.pdf`). Inga avgångar är påhittade, och inga
externa API:er eller betaltjänster används.

## Kom igång

```bash
cd apps/eskilscupen-bussar
npm install
npm run dev            # http://localhost:5173
```

Övriga kommandon:

```bash
npm test               # kör alla tester (vitest)
npm run lint           # typkontroll av app, tester och skript
npm run build          # produktionsbygge till dist/
npm run preview        # serva dist/ lokalt
npm run import         # läs om PDF:en och skriv om JSON-filerna
```

## Publicera som statisk webbplats

`npm run build` lägger en helt statisk webbplats i `dist/`. `base` är satt till
`./` i `vite.config.ts`, så bygget fungerar både från domänroten och från en
underkatalog.

| Tjänst | Inställning |
| --- | --- |
| GitHub Pages | Publicera innehållet i `dist/` (t.ex. via `actions/deploy-pages`) |
| Netlify | Base directory `apps/eskilscupen-bussar`, build `npm run build`, publish `dist` |
| Vercel | Root directory `apps/eskilscupen-bussar`, framework **Vite** |

## Projektstruktur

```
data/busslinjer2026eskilscupen.pdf   originalet — ändras aldrig
data/import-report.json              rapport över allt som avvisats eller sett konstigt ut
scripts/pdf-text.mjs                 textutvinning ur PDF (utan externa beroenden)
scripts/stop-config.mjs              hållplatser, alias, fotbollsplaner, trafikdygn
scripts/import-timetable.mjs         PDF -> normaliserad JSON + rapport
src/data/timetable.json              genererad tidtabell (linjer, hållplatser, turer)
src/data/venues.json                 genererad koppling fotbollsplan -> hållplats
src/data/timetable.ts                inläsning och validering av data
src/planner/findJourneys.ts          reseplaneraren (helt fristående från gränssnittet)
src/planner/time.ts                  tidsparsning och formatering
src/App.tsx, src/components/         gränssnittet
tests/                               tester för algoritm, import och riktig data
```

## Så importeras tidtabellen

Varje tidtabellssida i PDF:en är ett rutnät: **en rad per hållplats, en kolumn
per avgång**. Importen bevarar just den strukturen, eftersom en bytesplanerare
behöver hållplatsernas ordningsföljd *per enskild tur* — inte bara en lista med
avgångstider.

1. `scripts/pdf-text.mjs` plockar ut varje textbit ur PDF:en tillsammans med
   dess x- och y-koordinat. Ingen extern PDF-modul behövs; PDF:en använder
   FlateDecode och WinAnsiEncoding, vilket Node klarar med inbyggda `zlib`.
2. Textbitar med samma y grupperas till rader. Rader som bara innehåller `//`
   delar sidan i block — ett block är en utskriven deltabell.
3. Inom ett block klustras alla klockslag på x-koordinat. Varje kluster är en
   kolumn, och **varje kolumn blir en tur** (`tripId`) med hållplatserna i
   ordning. Tomma celler betyder att turen hoppar över hållplatsen.
4. Hållplatsnamn slås upp i `scripts/stop-config.mjs` och normaliseras till
   stabila id:n.
5. Tiderna valideras: fel format avvisas, och en tur där en tid går bakåt
   avvisas — utom när hoppet är större än 12 timmar, vilket tolkas som passage
   över midnatt (`24:10` betyder 00:10 dagen efter).
6. Identiska turer (samma linje, trafikdygn, hållplatser och tider) tas bort som
   dubbletter.
7. Allt som avvisats, saknats eller sett konstigt ut hamnar i
   `data/import-report.json`.

Resultatet av senaste importen: **846 turer, 5 330 förbindelser, 9 linjer,
27 hållplatser, 0 fel, 8 varningar** (samtliga varningar är borttagna
dubblettkolumner).

`src/data/timetable.json` innehåller turer med hållplatsföljd. Förbindelserna
(`BusConnection`, en per hållplatspar) byggs i webbläsaren av
`buildConnections()` — det håller JSON-filen liten utan att ändra datamodellen.

## Så fungerar reseplaneraren

`findJourneys()` i `src/planner/findJourneys.ts` behandlar bussnätet som en
**tidsberoende graf** — ingen geografisk kortaste väg, utan faktiska avgångs-
och ankomsttider.

```ts
findJourneys({
  connections,               // BusConnection[]
  originStop,                // hållplats-id
  destinationStop,
  earliestDeparture,         // "HH:MM"
  minimumTransferMinutes,    // standard 5
  maxTransfers,              // standard 3
  serviceId,                 // "fre-lor" | "sondag"
  maxResults,                // standard 3
})
```

Algoritmen är en *connection scan* med profilsökning:

* Alla förbindelser sorteras på avgångstid och gås igenom en gång.
* En förbindelse får användas om resenären antingen **sitter kvar på samma
  buss** eller har hunnit fram minst `minimumTransferMinutes` innan avgång.
  Från startplatsen krävs ingen bytestid.
* Att sitta kvar spåras per `tripId`, inte per hållplats. Två efterföljande
  sträckor med samma `tripId` är alltså aldrig ett byte, hur många hållplatser
  bussen än passerar. Ett byte uppstår först vid ett nytt `tripId`.
* Varje hållplats håller en Pareto-mängd av deloptimala resor. En resa slås ut
  bara av en resa som är minst lika bra på **alla** tre punkter: ankommer inte
  senare, byter inte fler gånger och avgår inte tidigare.
* Resultatet sorteras med tidigast ankomst först, därefter färst byten, därefter
  senast avgång och kortast väntetid. De tre bästa returneras.

Att avgångstiden ingår i jämförelsen är viktigt: en resa som avgår 13:11 och
ankommer 14:06 är bättre än en som avgår 13:00 och ankommer 14:06, och den
sämre visas därför inte som alternativ.

En sökning på hela dagens trafik tar ungefär 10–20 ms.

## Antaganden

* **Trafikdygn väljs på veckodag.** PDF:en innehåller inga kalenderdatum, bara
  "fredag & lördag" respektive "söndag". Appen matchar därför valt datum mot
  veckodag: fredag och lördag ger `fre-lor`, söndag ger `sondag`, och måndag–
  torsdag ger ett tydligt meddelande om att cupbussarna inte kör. Vill man låsa
  appen till cupens faktiska datum sätts det i `SERVICES` i
  `scripts/stop-config.mjs`.
* **Hållplatser med flera stavningar är samma hållplats.** Se nedan.
* **Ingen gångtid mellan hållplatser.** Appen planerar bara bussresor. Byten
  sker vid samma hållplats, och en resa mellan två planer som delar hållplats
  avvisas med ett meddelande i stället för att visa en buss.
* **Inga koordinater eller adresser** har lagts in, eftersom PDF:en inte
  innehåller några. Fälten finns kvar i `Venue`-typen.
* **Minsta bytestid 5 minuter**, justerbar i appens inställningar (0–20 min).

## Kända oklarheter i underlaget

Dessa är hittade vid importen och hanterade — men värda att stämma av med
arrangören inför nästa år:

1. **Harlyckan har tre olika namn.** "Elinebergsplatsen Harlyckan IP" (linje 11),
   "Elinebergskyrkan Harlyckan IP" (linje 12 och 21) och
   "Elinebergsplansen / Harlyckan IP" (linje 13, 14 och 17). Den tredje är en
   uppenbar felstavning av den första. Elinebergsplatsen och Elinebergskyrkan är
   däremot två olika landmärken. Alla tre behandlas som **en** hållplats, vilket
   är rimligt eftersom samtliga är märkta "Harlyckan IP" — men det betyder att
   ett byte där antas ske utan gångtid.
2. **"Norvalla IP" är felstavat** i samtliga tabeller; innehållssidan skriver
   "Norrvalla IP". Appen använder den senare stavningen.
3. **"Vätergård" är felstavat** i "Adolfsberg (Vätergård IP 300m)";
   innehållssidan skriver "Västergård". Notera också att hållplatsen ligger
   ca 300 m från planen — appen visar det som en notis.
4. **"Högasten / Hedens IP" (linje 11) och "Högastensskolan / Hedens IP"**
   (linje 13 och 21) förekommer båda och behandlas som samma hållplats.
5. **Åtta kolumner är exakta dubbletter** av kolumnen bredvid (linje 13, 14 och
   15). Antingen går två bussar samtidigt, eller så är det ett skrivfel. De
   påverkar inte reseplaneringen och har tagits bort — se `duplicate-trip` i
   `data/import-report.json`.
6. **Linje 17 har en snabbtur** (söndag, Norrvalla 07:10 → Mörarp 07:30) som
   hoppar över alla mellanliggande hållplatser. Den är importerad som den står.
7. **Inga kalenderdatum** finns i PDF:en — se antagandena ovan.
8. **Linje 18 och 19 saknas** helt i underlaget; numreringen hoppar från 17 till
   20. Det ser avsiktligt ut, men är värt att kontrollera.

## Byta tidtabell inför nästa års cup

1. Lägg den nya PDF:en i `data/` och peka ut den:

   ```bash
   npm run import -- --pdf data/busslinjer2027eskilscupen.pdf
   ```

2. Läs `data/import-report.json`. Skriptet avslutas med felkod om något inte
   gick att importera.
3. Har nya hållplatser tillkommit listas de under `unknownStopLabels`. Lägg till
   dem i `STOPS` i `scripts/stop-config.mjs`, med varje stavning som PDF:en
   använder i `aliases`. Nya planer läggs till i `VENUES` med rätt `stopId`.
4. Kör om importen tills rapporten är felfri.
5. Ändras trafikdygnen (t.ex. om cupen får en torsdag) uppdateras `SERVICES` och
   `SERVICE_PATTERNS` i samma fil.
6. `npm test` — testerna i `tests/timetable-data.test.ts` kontrollerar bland
   annat att JSON-filen och rapporten kommer från samma PDF (sha256) och att
   varje tur har stigande tider och kända hållplatser. Uppdatera de
   förväntningar som gäller den gamla tidtabellen.
7. `npm run build` och publicera.

Importen fungerar så länge PDF:en behåller samma layout: en rubrik av typen
`LINJE <nr> <NORRUT|SÖDERUT|NORR/SÖDERUT> <FREDAG & LÖRDAG|SÖNDAG>`, en rad per
hållplats, en kolumn per avgång och `//` mellan deltabellerna. Byter arrangören
format får `scripts/import-timetable.mjs` anpassas — men originalfilen ska
fortfarande aldrig ändras.

## Tester

`npm test` kör 44 tester i tre filer:

* `tests/findJourneys.test.ts` — algoritmen mot små, handskrivna nät: direktresa,
  ett byte, två byten, för kort bytestid, senare avgång med tidigare ankomst,
  samma `tripId` genom flera hållplatser, ingen möjlig resa, resa över midnatt,
  samma ankomsttid där färre byten vinner, `maxTransfers`, filtrering på
  trafikdygn samt varje felfall.
* `tests/import-timetable.test.ts` — importens tolkningsregler mot syntetiska
  sidor: kolumn blir tur, överhoppade hållplatser, ankomst före avgång,
  midnattspassage, ogiltiga klockslag, okända hållplatsnamn, rader utan namn,
  ofullständiga kolumner och dubblettborttagning.
* `tests/timetable-data.test.ts` — den riktiga, importerade tidtabellen.

## Vad som medvetet inte finns med

GPS, livepositioner, konton, pushnotiser och kartor. Grundlogiken — korrekta
byten på korrekta tider — går först.
