# Kartunderlag för Eskilscupen — källgranskning

Fas 1 av kartfunktionen. Syftet är att ta reda på **vilka positioner som går att
belägga** innan någon karta byggs, så att appen aldrig visar en gissad position
som om den vore kontrollerad.

Inga ändringar har gjorts i appen i den här fasen.

Granskad: 2026-07-28. Gren: `feature/map-integration`.

---

## Sammanfattning

**Ingen plats har i dag en position som är verifierad mot primärkälla.**

Den auktoritativa källan finns och är identifierad — Eskilscupens egen sida
*Spelplaner (Adress, GPS)* — men den gick inte att läsa från den här
utvecklingsmiljön. Nätverkspolicyn avvisar `eskilscupen.nu`, `helsingborg.se`,
`nominatim.openstreetmap.org` och `overpass-api.de` med **403 på CONNECT**.
Enda tillgängliga kanalen var webbsökning, som ger sammanfattningar av sidor,
inte sidorna själva.

Det som samlats in är därför **andrahandsuppgifter**: gatuadresser som en
sökmotor refererat ur officiella sidor. De duger som utgångspunkt för någon som
ska hämta de riktiga uppgifterna, men **de får inte kodas in som verifierade
positioner**, och inga koordinater alls har kunnat samlas in.

| | Antal |
| --- | --- |
| Fotbollsplaner i appen | 15 |
| Med verifierad position (koordinat ur primärkälla) | **0** |
| Med adress ur andrahandskälla | 13 |
| Helt utan uppgift | 2 |
| Hållplatser i appen | 28 |
| Med verifierat hållplatsläge | **0** |

---

## Källinventering

Kolumnen **Läst** skiljer källor som verkligen hämtats från sådana som bara
framkommit som sökträffar. Ingen uppgift från en oläst källa får behandlas som
bekräftad.

### Eskilscupens egna källor

| Titel | URL | Typ | År | Innehåll | Läst | Osäkerhet |
| --- | --- | --- | --- | --- | --- | --- |
| Spelplaner (Adress, GPS) | `https://www.eskilscupen.nu/sv/spelplaner-adress-gps` | Webbsida | 2026 | Adress och GPS per spelplan — **den avgörande källan** | Nej, 403 | Hela innehållet okänt |
| Spelplaner och kartor | `https://www.eskilscupen.nu/spelplaner-kartor` | Webbsida | 2026 | Kartöversikt per spelplats | Nej, 403 | Hela innehållet okänt |
| Eskilscupen karta 2025 | `https://static.cupmanager.net/uploads/8/y/0C4/eskilscupen-karta-2025.pdf` | Kart-PDF | **2025** | Översiktskarta över cupområdet med zonindelning | Nej, 403 | **Föregående års karta.** Zoner och hållplatslägen kan ha ändrats till 2026 |
| Skolor (Adress, GPS) | `https://eskilscupen.nu/sv/skolor-adress-gps` | Webbsida | 2026 | Förläggningsskolor med adress och GPS | Nej, 403 | Gäller boende, inte spelplatser |
| Resultatsystemets platssidor | `https://eskilscupen.nu/<år>,sv/result/places/<id>` | Webbsida | 2019–2024 | Enskilda planer med zonbeteckning, t.ex. Norrvalla C3, Harlyckan C4 | Nej, 403 | Äldre årgångar; zonbeteckningarna kan vara inaktuella |
| Om turneringen | `https://eskilscupen.nu/sv/om-turneringen` | Webbsida | 2026 | 80 planer, 28 transferbussar | Via sökträff | Endast översiktlig |

### Kommunala och kollektivtrafikkällor

| Titel | URL | Typ | År | Innehåll | Läst | Osäkerhet |
| --- | --- | --- | --- | --- | --- | --- |
| Fotbollsplaner, Helsingborgs stad | `https://helsingborg.se/uppleva-och-gora/anlaggningar-och-sporthallar/fotbollsplaner/` | Anläggningsregister | 2026 | Adress per idrottsplats | Nej, 403 | Adresser hämtade via sökträffar, ej lästa i primärkällan |
| Helsingborg stadstrafik, linjenätskarta | `https://www.skanetrafiken.se/globalassets/kartor/linjekartor/helsingborg_linjenatskarta.pdf` | Kart-PDF | 2026 | Ordinarie hållplatser i stadstrafiken | Nej, 403 | Visar inte cupens tillfälliga hållplatser |
| Moovit, hållplats Elinebergsplatsen | `https://moovitapp.com/index/sv/offentlig_transit-Helsingborg_Elinebergsplatsen-Stockholm-stop_402353017-1083` | Kollektivtrafikdata | 2026 | Hållplatsen som egen post | Via sökträff | Tredjepartsdata, inte officiell |
| Moovit, hållplats Elinebergskyrkan | `https://moovitapp.com/index/sv/offentlig_transit-Helsingborg_Elinebergskyrkan-Stockholm-stop_402304015-1083` | Kollektivtrafikdata | 2026 | Hållplatsen som egen post, **257 m från Elinebergsplatsen** | Via sökträff | Tredjepartsdata, inte officiell |
| Spritan, Spritfabriken i Ödåkra | `https://spritan.com/` | Besöksmål | 2026 | Landmärket som hållplatsen "Spritan" är namngiven efter | Via sökträff | Säger inget om hållplatsläget |
| Norrvalla, Helsingborgs stadslexikon | `https://stadslexikon.helsingborg.se/norrvalla/` | Uppslagsverk | 2026 | Anläggningens historia och läge | Via sökträff | Beskrivande, inte kartografiskt |

### Egen källa

| Titel | Sökväg | Typ | År | Innehåll | Läst | Osäkerhet |
| --- | --- | --- | --- | --- | --- | --- |
| Busslinjer Eskilscupen 2026 | `data/busslinjer2026eskilscupen.pdf` | Tidtabells-PDF | **2026** | Alla linjer, turer och hållplatsnamn | **Ja, fullt inläst** | Innehåller inga koordinater, adresser eller hållplatslägen |

Tidtabells-PDF:en är den enda källan som lästs i sin helhet. Allt annat bygger
på sökträffar.

### Vad som avgjordes trots begränsningarna

**Elinebergsplatsen och Elinebergskyrkan är två skilda hållplatser.** Båda finns
som egna poster i kollektivtrafikdata, och avståndet mellan dem anges till
257 m — ungefär fyra minuters promenad. Det stöder beslutet att hålla dem isär,
som appen redan gjorde på andra grunder. Kyrkans klocktorn uppges vara byggt
samman med hållplatsen, vilket gör det läget entydigt.

**"Påarp Medevi" syftar på Medevi IP i Påarp**, vilket gör sökfrasen betydligt
träffsäkrare än enbart ortnamnet.

**"Spritan" är den gamla spritfabriken i Ödåkra**, i dag ett namngivet
besöksmål och därmed ett användbart landmärke för hållplatsen.

### Varför just Eskilscupens GPS-sida

Den är den källa som bör användas, av två skäl: den kommer från arrangören som
faktiskt bestämmer var matcherna spelas, och den anger positionen för
*spelplanen*, inte för anläggningens postadress. Skillnaden spelar roll på stora
anläggningar — Norrvalla har flera planer utspridda över området.

### Källor som medvetet valts bort

| Källa | Varför inte |
| --- | --- |
| Google Maps Platform | Kräver API-nyckel och är en betaltjänst |
| Mapbox | Kräver API-nyckel |
| Skånetrafiken / Trafiklab (GTFS med hållplatslägen) | Kräver API-nyckel. Rätt källa för hållplatskoordinater om nyckelkravet lättas |
| OpenStreetMap-brickor (tile.openstreetmap.org) | Gratis, men användarvillkoren avråder från produktionsbruk utan eget avtal |

OpenStreetMaps **data** (via Overpass eller Nominatim) är däremot fritt och
nyckelfritt och vore en rimlig andrahandskälla för hållplatslägen. Det gick inte
att nå härifrån.

---

## Fotbollsplaner

Konfidensnivåer:

- **verified** — koordinat hämtad ur primärkälla och kontrollerad. Får visas på karta.
- **reported** — adress refererad ur officiell sida via sökmotor, ej läst i primärkälla. Får **inte** visas som en punkt på karta.
- **unknown** — ingen uppgift alls.

| Plan i appen | Hållplats i tidtabellen | Adress (andrahand) | Koordinat | Konfidens |
| --- | --- | --- | --- | --- |
| Norrvalla IP | `norrvalla-ip` | Rundgången 15, 254 52 Helsingborg | – | reported |
| Olympia | `olympiaskolan` | Olympiaområdet, Filbornavägen 11, 252 76 Helsingborg | – | reported |
| Filborna IP | `filborna-ip` | Filbornavägen 101A, Helsingborg | – | reported |
| Västergård IP | `vastergard-ip` | Södra Rangvallagatan 65, Helsingborg | – | reported |
| Harlyckans IP | `elinebergsplatsen`, `elinebergskyrkan` | Gärdesgatan 4, Helsingborg | – | reported |
| Hedens IP | `hedens-ip` | Planteringsvägen 143, Helsingborg | – | reported |
| Ättekulla IP | `attekulla-ip` | Ättekullagatan, Helsingborg | – | reported |
| Råå IP | `raa-ip` | Starkoddersgatan 6, Råå | – | reported |
| Örby IP | `orby-ip` | Örbyvägen, Örby ängar | – | reported |
| Rydebäck IP | `rydeback-ip` | Frösögatan 15, Rydebäck | – | reported |
| Maria Park IP | `maria-park` | Mariehällsvägen, Helsingborg | – | reported |
| Laröds IP | `larods-ip` | Gummarpsvägen 25, Laröd | – | reported |
| Allerums IP | `allerums-ip` | Jonstorpsvägen, Allerum | – | reported |
| Toftavallen | `odakra-toftavallen` | Ödåkra idrottsplats, Ödåkra | – | unknown |
| Mörarp Vidablick IP | `morarp-vidablick-ip` | Mörarps idrottsplats, Mörarp | – | unknown |

Anmärkningar:

- **Olympia** är ett område, inte en plan. Eskilscupen spelar på Olympiafältet
  bredvid arenan. Adressen ovan är Olympiahallens och pekar på fel byggnad.
- **Toftavallen** kallas Ödåkra idrottsplats i kommunens register. Att det är
  samma anläggning är en tolkning, inte belagt.
- **Mörarp Vidablick IP** — ingen gatuadress hittad. Att "Vidablick" är
  Mörarps idrottsplats är en tolkning.
- **Harlyckans IP** nås från två hållplatser som appen medvetet håller isär
  (se README). En enda planposition räcker alltså inte — se nedan.

---

## Hållplatser

**Ingen av de 28 hållplatserna har ett verifierat läge.** Tidtabells-PDF:en
innehåller inga koordinater, inga adresser och inga hållplatslägen.

Fem hållplatser är namngivna efter något annat än planen de betjänar, och för
dem är gångvägen okänd:

| Hållplats | Plan | Vad som saknas |
| --- | --- | --- |
| `olympiaskolan` | Olympia | Avstånd skola → spelplan |
| `filborna-ip` (Filbornaskolan) | Filborna IP | Avstånd skola → spelplan |
| `hedens-ip` (Högastensskolan) | Hedens IP | Avstånd skola → spelplan |
| `maria-park` | Maria Park IP | Avstånd hållplats → spelplan |
| `odakra-toftavallen` (Spritan) | Toftavallen | Avstånd hållplats → spelplan |

`vastergard-ip` (Adolfsberg) är den enda där underlaget säger något:
PDF:en skriver "Vätergård IP 300m". Det är en **uppgift från arrangören om
avstånd**, inte en position.

### Den olösta Harlyckan-frågan

Tidtabellen använder två hållplatsnamn för Harlyckans IP —
**Elinebergsplatsen** (linje 11, 13, 14, 17) och **Elinebergskyrkan**
(linje 12, 21). Appen håller dem isär eftersom underlaget inte kan avgöra om
det är samma fysiska läge.

En karta skulle kunna **avgöra frågan** — två hållplatslägen ur Skånetrafikens
data visar direkt om de ligger på samma plats eller några hundra meter isär.
Det är det starkaste enskilda argumentet för kartfunktionen, och det bör lösas
med hållplatsdata, inte med en planposition.

---

## Vad som måste hämtas innan en karta får visa något

1. Öppna `https://www.eskilscupen.nu/sv/spelplaner-adress-gps` i en webbläsare
   och kopiera adress och GPS för de 15 planerna.
2. Kontrollera att koordinaten pekar på **spelplanen** och inte på
   anläggningens postadress — särskilt Norrvalla, Olympia och Filborna.
3. Reda ut de två oklara: är Toftavallen samma sak som Ödåkra idrottsplats, och
   är Vidablick Mörarps idrottsplats?
4. Hämta hållplatslägena för de 28 hållplatserna, helst ur Skånetrafikens öppna
   data. Kräver API-nyckel, vilket det här projektet i dag inte tillåter — be om
   ett beslut.
5. Avgör Harlyckan-frågan med hjälp av de två hållplatslägena.
6. Mät gångavståndet för de fem hållplatser som ligger vid en skola.

Tills punkt 1 är gjord finns inga koordinater att visa, och kartfunktionen ska
bara kunna säga *vilka* platser som saknar position — aldrig var de ligger.

---

## Konsekvens för Fas 2

Prototypen byggs så att:

- positioner läses ur en separat datafil med `confidence` per plats,
- endast `verified` ritas ut,
- `reported` och `unknown` listas som "position ej bekräftad" utan att placeras,
- inga externa karttjänster, brickor eller nycklar används,
- hela funktionen ligger bakom `VITE_ENABLE_MAPS` och är avstängd som standard.

Med noll verifierade positioner visar kartan i dag ingenting utplacerat. Det är
avsiktligt: den är byggd för att vara ärlig innan den är vacker.

---

## Källförteckning

- [Spelplaner (Adress, GPS) — Eskilscupen](https://www.eskilscupen.nu/sv/spelplaner-adress-gps)
- [Spelplaner och kartor — Eskilscupen](https://www.eskilscupen.nu/spelplaner-kartor)
- [Eskilscupen karta 2025 (PDF)](https://static.cupmanager.net/uploads/8/y/0C4/eskilscupen-karta-2025.pdf)
- [Skolor (Adress, GPS) — Eskilscupen](https://eskilscupen.nu/sv/skolor-adress-gps)
- [Om turneringen — Eskilscupen](https://eskilscupen.nu/sv/om-turneringen)
- [Fotbollsplaner — Helsingborgs stad](https://helsingborg.se/uppleva-och-gora/anlaggningar-och-sporthallar/fotbollsplaner/)
- [Norrvalla idrottsplats — Helsingborgs stad](https://helsingborg.se/uppleva-och-gora/anlaggningar-och-sporthallar/fotbollsplaner/norrvalla-idrottsplats/)
- [Filborna idrottsplats — Helsingborgs stad](https://helsingborg.se/uppleva-och-gora/anlaggningar-och-sporthallar/fotbollsplaner/filborna-idrottsplats/)
- [Ättekulla idrottsplats — Helsingborgs stad](https://helsingborg.se/uppleva-och-gora/anlaggningar-och-sporthallar/fotbollsplaner/attekulla-idrottsplats/)
- [Råå idrottsplats — Helsingborgs stad](https://helsingborg.se/uppleva-och-gora/anlaggningar-och-sporthallar/fotbollsplaner/raa-idrottsplats/)
- [Rydebäcks idrottsplats — Helsingborgs stad](https://helsingborg.se/uppleva-och-gora/anlaggningar-och-sporthallar/fotbollsplaner/rydebacks-idrottsplats/)
- [Örby ängars idrottsplats — Helsingborgs stad](https://helsingborg.se/uppleva-och-gora/anlaggningar-och-sporthallar/fotbollsplaner/orby-angars-idrottsplats/)
- [Laröds idrottsplats — Helsingborgs stad](https://helsingborg.se/uppleva-och-gora/anlaggningar-och-sporthallar/fotbollsplaner/larods-idrottsplats/)
- [Allerums idrottsplats — Helsingborgs stad](https://helsingborg.se/uppleva-och-gora/anlaggningar-och-sporthallar/fotbollsplaner/allerums-idrottsplats/)
- [Ödåkra idrottsplats — Helsingborgs stad](https://helsingborg.se/uppleva-och-gora/anlaggningar-och-sporthallar/fotbollsplaner/odakra-idrottsplats/)
- [Norrvalla — Helsingborgs stadslexikon](https://stadslexikon.helsingborg.se/norrvalla/)
