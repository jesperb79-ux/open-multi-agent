# Manuell verifiering av busshållplatserna

Appens navigeringslänkar pekar i dag på namngivna platser — skolor, planer och
landmärken. Målet är att de i stället ska peka på **själva busshållplatsen**.

Den här sessionens miljö kommer inte åt någon karttjänst. Proxyn svarar `403`
på CONNECT för Google Maps, `openstreetmap.org`, `overpass-api.de`,
`nominatim.openstreetmap.org`, `query.wikidata.org`, `photon.komoot.io`,
`download.geofabrik.de`, `data.samtrafiken.se`, `api.trafiklab.se`,
`karta.helsingborg.se` och `moovitapp.com`. Koordinater kan därför inte
hämtas maskinellt.

En gissad koordinat är sämre än ingen: den ser exakt ut, öppnar tyst fel punkt
och går inte att ifrågasätta för den som klickar. Därför står fälten tomma tills
någon fyllt i dem för hand.

## Så här fyller du i

1. Klicka på **Sök hållplatsen** i tabellen. Länken söker på hållplatsen, inte
   på skolan eller planen.
2. Jämför träffens läge med den rosa Ⓗ-symbolen i `data/eskilscupen-karta-2025.pdf`,
   i den kartcell som står i tabellen.
3. Stämmer läget: högerklicka på hållplatsen i Google Maps och kopiera
   koordinaten. Fyll i **Status** och **Verifierad länk eller koordinat**.
4. Ligger hållplatsen i två lägen på varsin sida av vägen och kartan inte visar
   vilket som används — skriv `probable` och notera osäkerheten i kommentaren.
   Välj inte sida på måfå.
5. Hittar du ingen registrerad hållplats: skriv `unverified`. Då visas ingen
   Navigera-knapp alls, vilket är det avsedda utfallet.

### Statusvärden

| Status | Betyder | Knapp i appen |
| --- | --- | --- |
| `exact-public-transit-stop` | Registrerad hållplats i ordinarie trafik, läget stämmer mot kartan | Ja |
| `exact-cup-stop` | Cupspecifik hållplats, läget entydigt belagt mot Ⓗ | Ja |
| `probable-cup-stop` | Rätt område, men sida av vägen eller exakt läge oklart | Ja, med ”Följ Eskilscupens skyltning på plats.” |
| `unverified` | Ingen säker matchning | Nej |

### När tabellen är ifylld

Skriv över resultatet i `data/verified-bus-stops.json` och kör:

```bash
npm run stops:apply
```

Skriptet vägrar skriva något alls om en post är ofullständig, så en halvfärdig
fil kan inte förstöra registret.

## Prioriterade hållplatser

De tolv som ska kontrolleras först. Samtliga är ordinarie hållplatser med namn
i den vanliga kollektivtrafiken, så `busshållplats <namn>` bör ge träff.

| stopId | Tidtabellens namn | Kartans Ⓗ | Cell | Nuvarande mål | Sök hållplatsen | Status | Verifierad länk eller koordinat | Kommentar |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `gustavslundsskolan` | Gustavslundsskolan | Gustavslundsskolan | D4 | `Gustavslundsskolan, Helsingborg, Sverige` | [Sök hållplats](https://www.google.com/maps/search/?api=1&query=bussh%C3%A5llplats+Gustavslundsskolan%2C+Helsingborg) | ☐ | | |
| `olympiaskolan` | Olympiaskolan | Olympiaskolan | C4 | `Olympiaskolan, Helsingborg, Sverige` | [Sök hållplats](https://www.google.com/maps/search/?api=1&query=bussh%C3%A5llplats+Olympiaskolan%2C+Helsingborg) | ☐ | | |
| `filborna-ip` | Filbornaskolan / Filborna IP | Filborna IP | C3 D3 | `Filbornaskolan, Helsingborg, Sverige` | [Sök hållplats](https://www.google.com/maps/search/?api=1&query=bussh%C3%A5llplats+Filbornaskolan%2C+Helsingborg) | ☐ | | |
| `hedens-ip` | Högastensskolan / Hedens IP | Hedens IP | C5 | `Högastensskolan, Helsingborg, Sverige` | [Sök hållplats](https://www.google.com/maps/search/?api=1&query=bussh%C3%A5llplats+H%C3%B6gastensskolan%2C+Helsingborg) | ☐ | | |
| `vastra-ramlosa-skola` | Västra Ramlösa Skola | Västra Ramlösa Skola | D4 | `Västra Ramlösa skola, Helsingborg, Sverige` | [Sök hållplats](https://www.google.com/maps/search/?api=1&query=bussh%C3%A5llplats+V%C3%A4stra+Raml%C3%B6sa+Skola%2C+Helsingborg) | ☐ | | |
| `elinebergsplatsen` | Elinebergsplatsen / Harlyckan IP | Elinebergsplatsen | C4 | `Elinebergsplatsen, Helsingborg, Sverige` | [Sök hållplats](https://www.google.com/maps/search/?api=1&query=bussh%C3%A5llplats+Elinebergsplatsen%2C+Helsingborg) | ☐ | | |
| `elinebergskyrkan` | Elinebergskyrkan / Harlyckan IP | Elinebergskyrkan | C4 | `Elinebergskyrkan, Helsingborg, Sverige` | [Sök hållplats](https://www.google.com/maps/search/?api=1&query=bussh%C3%A5llplats+Elinebergskyrkan%2C+Helsingborg) | ☐ | | |
| `wieselgrensskolan` | Wieselgrensskolan | Wieselgrensskolan | C4 | `Wieselgrensskolan, Helsingborg, Sverige` | [Sök hållplats](https://www.google.com/maps/search/?api=1&query=bussh%C3%A5llplats+Wieselgrensskolan%2C+Helsingborg) | ☐ | | |
| `husensjoskolan` | Husensjöskolan | Husensjöskolan | C4 | `Husensjöskolan, Helsingborg, Sverige` | [Sök hållplats](https://www.google.com/maps/search/?api=1&query=bussh%C3%A5llplats+Husensj%C3%B6skolan%2C+Helsingborg) | ☐ | | |
| `tagaborgsskolan` | Tågaborgsskolan | Tågaborgsskolan | C3 | `Tågaborgsskolan, Helsingborg, Sverige` | [Sök hållplats](https://www.google.com/maps/search/?api=1&query=bussh%C3%A5llplats+T%C3%A5gaborgsskolan%2C+Helsingborg) | ☐ | | |
| `ronnowska-skolan` | Rönnowska skolan | Rönnowska skolan | C4 | `Rönnowska skolan, Helsingborg, Sverige` | [Sök hållplats](https://www.google.com/maps/search/?api=1&query=bussh%C3%A5llplats+R%C3%B6nnowska+skolan%2C+Helsingborg) | ☐ | | |
| `scandic-nord` | Scandic Nord | Scandic Nord | C2 | `Scandic Helsingborg Nord, Sverige` | [Sök hållplats](https://www.google.com/maps/search/?api=1&query=bussh%C3%A5llplats+Scandic+Nord%2C+Helsingborg) | ☐ | | |

## Övriga hållplatser

| stopId | Tidtabellens namn | Kartans Ⓗ | Cell | Nuvarande mål | Sök hållplatsen | Status | Verifierad länk eller koordinat | Kommentar |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `glumslov` | Glumslöv | Glumslöv | E8 | `Glumslövs IP, Glumslöv, Sverige` | [Sök hållplats](https://www.google.com/maps/search/?api=1&query=Eskilscupen+h%C3%A5llplats+Glumsl%C3%B6vs+IP%2C+Glumsl%C3%B6v) | ☐ | | |
| `rydeback-ip` | Rydebäck IP | Rydebäcks IP | E7 | `Rydebäcks IP, Rydebäck, Helsingborg, Sverige` | [Sök hållplats](https://www.google.com/maps/search/?api=1&query=bussh%C3%A5llplats+Rydeb%C3%A4ck+IP%2C+Rydeb%C3%A4ck%2C+Helsingborg) | ☐ | | |
| `orby-ip` | Örby IP | Örby IP | D6 | `Örby IP, Helsingborg, Sverige` | [Sök hållplats](https://www.google.com/maps/search/?api=1&query=bussh%C3%A5llplats+%C3%96rby+IP%2C+Helsingborg) | ☐ | | |
| `raa-ip` | Råå IP | Råå IP | C5 D5 | `Råå IP, Helsingborg, Sverige` | [Sök hållplats](https://www.google.com/maps/search/?api=1&query=bussh%C3%A5llplats+R%C3%A5%C3%A5+IP%2C+Helsingborg) | ☐ | | |
| `attekulla-ip` | Ättekulla IP | Ättekulla IP | D5 | `Ättekulla IP, Helsingborg, Sverige` | [Sök hållplats](https://www.google.com/maps/search/?api=1&query=bussh%C3%A5llplats+%C3%84ttekulla+IP%2C+Helsingborg) | ☐ | | |
| `vastergard-ip` | Adolfsberg (Västergård IP 300 m) | Västergårds IP | D4 | `Adolfsberg, Helsingborg, Sverige` | [Sök hållplats](https://www.google.com/maps/search/?api=1&query=bussh%C3%A5llplats+Adolfsberg%2C+Helsingborg) | ☐ | | |
| `norrvalla-ip` | Norrvalla IP | Norrvalla IP | C3 | `Norrvalla IP, Helsingborg, Sverige` | [Sök hållplats](https://www.google.com/maps/search/?api=1&query=bussh%C3%A5llplats+Norrvalla+IP%2C+Helsingborg) | ☐ | | |
| `barslov` | Bårslöv | Bårslöv | E5 | `Bållevi IP, Bårslöv, Sverige` | [Sök hållplats](https://www.google.com/maps/search/?api=1&query=Eskilscupen+h%C3%A5llplats+B%C3%A5llevi+IP%2C+B%C3%A5rsl%C3%B6v) | ☐ | | |
| `gantofta` | Gantofta | Gantofta | E6 | `Stendösvallen, Gantofta, Sverige` | [Sök hållplats](https://www.google.com/maps/search/?api=1&query=Eskilscupen+h%C3%A5llplats+Stend%C3%B6svallen%2C+Gantofta) | ☐ | | |
| `paarp-medevi` | Påarp Medevi | Medevi IP | E4 F4 | `Medevi IP, Påarp, Sverige` | [Sök hållplats](https://www.google.com/maps/search/?api=1&query=bussh%C3%A5llplats+P%C3%A5arp+Medevi%2C+P%C3%A5arp) | ☐ | | |
| `morarp-vidablick-ip` | Mörarp Vidablick IP | — | — | `Vidablick IP, Mörarp, Sverige` | [Sök hållplats](https://www.google.com/maps/search/?api=1&query=bussh%C3%A5llplats+M%C3%B6rarp+Vidablick%2C+M%C3%B6rarp) | ☐ | | |
| `flygfaltet` | Flygfältet (Vattentornet) | Flygfältet | D3 | `Filborna vattentorn, Helsingborg, Sverige` | [Sök hållplats](https://www.google.com/maps/search/?api=1&query=Eskilscupen+h%C3%A5llplats+Filborna+vattentorn%2C+Helsingborg) | ☐ | | |
| `maria-park` | Maria Park | Maria Park IP | C2 | `Maria Parkskolan, Helsingborg, Sverige` | [Sök hållplats](https://www.google.com/maps/search/?api=1&query=bussh%C3%A5llplats+Maria+Park%2C+Helsingborg) | ☐ | | |
| `larods-ip` | Laröds IP | Laröds IP | A1 B1 | `Laröds IP, Laröd, Helsingborg, Sverige` | [Sök hållplats](https://www.google.com/maps/search/?api=1&query=bussh%C3%A5llplats+Lar%C3%B6ds+IP%2C+Lar%C3%B6d%2C+Helsingborg) | ☐ | | |
| `allerums-ip` | Allerums IP | Allerums IP | C1 | `Ryavallen, Allerum, Sverige` | [Sök hållplats](https://www.google.com/maps/search/?api=1&query=bussh%C3%A5llplats+Allerums+IP%2C+Allerum) | ☐ | | |
| `odakra-toftavallen` | Spritan, Ödåkra Fabriksgatan – Toftavallen | Toftavallen / Gläntanskolan | D1 | `Spritan, Ödåkra, Sverige` | [Sök hållplats](https://www.google.com/maps/search/?api=1&query=bussh%C3%A5llplats+Spritan+Fabriksgatan%2C+%C3%96d%C3%A5kra) | ☐ | | |

## Cupspecifika hållplatser

Fyra hållplatser finns bara under cupen. De har inget namn i den ordinarie
trafiken, så `busshållplats <namn>` ger ingen träff — söklänken pekar i
stället på landmärket som kartan placerar Ⓗ vid. Rätt status för dem är
`exact-cup-stop` eller `probable-cup-stop`, aldrig
`exact-public-transit-stop`.

| stopId | Ⓗ ligger vid | Cell | Linje enligt kartans indexlista |
| --- | --- | --- | --- |
| `glumslov` | Glumslövs IP | E8 | Linje 11 |
| `barslov` | Bållevi IP | E5 | Linje 12 |
| `gantofta` | Stendösvallen, intill Gantofta skola | E6 | Linje 12 |
| `flygfaltet` | Flygfältet / Vattentornet | D3 | Linje 14 |

## Kända svårigheter

**Mörarp Vidablick IP** saknas helt på 2025 års karta — som ort, anläggning och
Ⓗ. Kartans indexlista visar varför: 2025 gick linje 17 till Höganäs Sportcenter
och Vikvalla i Viken, medan 2026 års tidtabell kör linje 17 till Mörarp. Linjen
är omlagd mellan åren. Den här hållplatsen kan inte verifieras mot kartan alls
och ska stå kvar som `unverified` tills arrangören svarar.

**Elinebergsplatsen och Elinebergskyrkan** är två skilda Ⓗ i C4 — den ena
väster om Elinebergsskolan, den andra öster om. De ska förbli separata poster
med varsin koordinat. Slå aldrig ihop dem.

**Adolfsberg** ligger enligt både tidtabellen och kartans indexlista ca 300 m
från Västergårds IP. Koordinaten ska vara hållplatsens, inte planens.

**Spritan, Ödåkra Fabriksgatan – Toftavallen** heter olika mellan åren. Kartans
Ⓗ 2025 heter ”Toftavallen Gläntanskolan”; 2026 års tidtabell sätter Spritan vid
Fabriksgatan först. Kontrollera vilket läge som gäller 2026 innan du sätter
annat än `probable-cup-stop`.

---

Underlaget genereras av `scripts/build-stop-verification-sheet.mjs`. Kör om det
när tidtabellen byts ut; de ifyllda värdena bor i `data/verified-bus-stops.json`
och skrivs inte över.
