# Manuell verifiering av tidtabellsimporten

Källa: `busslinjer2026eskilscupen.pdf` (24 sidor).

Filen är genererad av `npm run verify:import`. Jämför varje tur nedan med motsvarande kolumn i PDF:en: gå till angiven sida, räkna dig fram till kolumnen och läs av tiderna uppifrån och ned.

## Sammanfattning

- Turer i urvalet: **31**
- Totalt antal importerade kolumner: **854**
- Dubblettgrupper i PDF:en: **8**
- Turer som hoppar över hållplatser: **35**

| Tur | Sida | Deltabell | Kolumn | Linje | Trafikdag | Riktning | Hållplatser | Kontrollerar |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `11-fre-lor-p2b1c1` | 2 | 1 | 1 | 11 | Fredag & lördag | norrut | 2/12 | Sid 2 är delad av "//" — deltabell 1 av 3; Tomma celler: kolumnen har 2 tider av 12 hållplatsrader; Riktning norrut |
| `11-fre-lor-p2b2c1` | 2 | 2 | 1 | 11 | Fredag & lördag | norrut | 12/12 | Sid 2 är delad av "//" — deltabell 2 av 3 |
| `11-fre-lor-p2b1c2` | 2 | 1 | 2 | 11 | Fredag & lördag | norrut | 11/12 | Tomma celler: kolumnen har 11 tider av 12 hållplatsrader |
| `11-fre-lor-p2b1c3` | 2 | 1 | 3 | 11 | Fredag & lördag | norrut | 11/12 | Tomma celler: kolumnen har 11 tider av 12 hållplatsrader |
| `11-fre-lor-p2b1c9` | 2 | 1 | 9 | 11 | Fredag & lördag | norrut | 12/12 | Linje 11, fredag/lördag, komplett tur |
| `11-fre-lor-p3b1c1` | 3 | 1 | 1 | 11 | Fredag & lördag | söderut | 7/12 | Sid 3 är delad av "//" — deltabell 1 av 3; Riktning söderut |
| `11-fre-lor-p3b2c1` | 3 | 2 | 1 | 11 | Fredag & lördag | söderut | 12/12 | Sid 3 är delad av "//" — deltabell 2 av 3 |
| `11-sondag-p4b1c1` | 4 | 1 | 1 | 11 | Söndag | norrut | 2/12 | Sid 4 är delad av "//" — deltabell 1 av 2 |
| `11-sondag-p4b2c1` | 4 | 2 | 1 | 11 | Söndag | norrut | 12/12 | Sid 4 är delad av "//" — deltabell 2 av 2 |
| `11-sondag-p4b1c9` | 4 | 1 | 9 | 11 | Söndag | norrut | 12/12 | Linje 11, söndag, komplett tur |
| `11-sondag-p5b1c1` | 5 | 1 | 1 | 11 | Söndag | söderut | 7/12 | Sid 5 är delad av "//" — deltabell 1 av 2 |
| `11-sondag-p5b2c1` | 5 | 2 | 1 | 11 | Söndag | söderut | 12/12 | Sid 5 är delad av "//" — deltabell 2 av 2 |
| `12-fre-lor-p6b1c1` | 6 | 1 | 1 | 12 | Fredag & lördag | norrut | 7/8 | Sid 6 är delad av "//" — deltabell 1 av 3 |
| `12-fre-lor-p6b2c1` | 6 | 2 | 1 | 12 | Fredag & lördag | norrut | 8/8 | Sid 6 är delad av "//" — deltabell 2 av 3 |
| `12-fre-lor-p6b1c9` | 6 | 1 | 9 | 12 | Fredag & lördag | norrut | 8/8 | Linje 12, fredag/lördag, komplett tur |
| `12-sondag-p8b1c9` | 8 | 1 | 9 | 12 | Söndag | norrut | 10/10 | Linje 12, söndag, komplett tur |
| `13-fre-lor-p10b1c1` | 10 | 1 | 1 | 13 | Fredag & lördag | norrut | 11/11 | Linje 13, fredag/lördag, komplett tur; Dubblettkolumn: originalet, behålls i användarens resultat |
| `13-fre-lor-p10b1c2` | 10 | 1 | 2 | 13 | Fredag & lördag | norrut | 11/11 | Dubblettkolumn: identisk med 13-fre-lor-p10b1c1 (sid 10, kolumn 1) — filtreras bort ur resultatet |
| `13-fre-lor-p11b1c2` | 11 | 1 | 2 | 13 | Fredag & lördag | söderut | 11/11 | Dubblettkolumn: originalet, behålls i användarens resultat |
| `13-fre-lor-p11b1c3` | 11 | 1 | 3 | 13 | Fredag & lördag | söderut | 11/11 | Dubblettkolumn: identisk med 13-fre-lor-p11b1c2 (sid 11, kolumn 2) — filtreras bort ur resultatet |
| `13-sondag-p12b1c1` | 12 | 1 | 1 | 13 | Söndag | norrut | 11/11 | Linje 13, söndag, komplett tur |
| `14-fre-lor-p14b1c1` | 14 | 1 | 1 | 14 | Fredag & lördag | norrut | 7/7 | Linje 14, fredag/lördag, komplett tur |
| `14-sondag-p16b1c1` | 16 | 1 | 1 | 14 | Söndag | norrut | 7/7 | Linje 14, söndag, komplett tur |
| `15-fre-lor-p18b1c1` | 18 | 1 | 1 | 15 | Fredag & lördag | norr/söderut | 3/3 | Linje 15, fredag/lördag, komplett tur |
| `15-sondag-p19b1c1` | 19 | 1 | 1 | 15 | Söndag | norr/söderut | 3/3 | Linje 15, söndag, komplett tur |
| `16-fre-lor-p20b1c1` | 20 | 1 | 1 | 16 | Fredag & lördag | norr/söderut | 3/3 | Linje 16, fredag/lördag, komplett tur |
| `16-sondag-p21b1c1` | 21 | 1 | 1 | 16 | Söndag | norr/söderut | 4/4 | Linje 16, söndag, komplett tur |
| `17-sondag-p22b1c1` | 22 | 1 | 1 | 17 | Söndag | norr/söderut | 5/5 | Linje 17, söndag, komplett tur; Linje 17, vanlig tur — jämför med snabbturen ovan |
| `17-sondag-p22b1c3` | 22 | 1 | 3 | 17 | Söndag | norr/söderut | 2/5 | Snabbtur på linje 17: hoppar över mellanliggande hållplatser |
| `20-sondag-p23b1c1` | 23 | 1 | 1 | 20 | Söndag | norr/söderut | 4/4 | Linje 20, söndag, komplett tur |
| `21-sondag-p24b1c1` | 24 | 1 | 1 | 21 | Söndag | norr/söderut | 4/4 | Linje 21, söndag, komplett tur |

## Turer

### 11-fre-lor-p2b1c1

| Fält | Värde |
| --- | --- |
| PDF-sida | 2 |
| Deltabell på sidan | 1 |
| Kolumn i deltabellen | 1 (x ≈ 175.6) |
| Linje | 11 |
| Trafikdag | Fredag & lördag |
| Riktning | norrut |
| Antal hållplatser | 2 av 12 i deltabellen |
| Kontrollerar | Sid 2 är delad av "//" — deltabell 1 av 3 |
| Kontrollerar | Tomma celler: kolumnen har 2 tider av 12 hållplatsrader |
| Kontrollerar | Riktning norrut |

| # | Tid | Hållplats |
| --- | --- | --- |
| 1 | 06:25 | Rydebäck IP |
| 2 | 06:55 | Norrvalla IP |

### 11-fre-lor-p2b2c1

| Fält | Värde |
| --- | --- |
| PDF-sida | 2 |
| Deltabell på sidan | 2 |
| Kolumn i deltabellen | 1 (x ≈ 211.5) |
| Linje | 11 |
| Trafikdag | Fredag & lördag |
| Riktning | norrut |
| Antal hållplatser | 12 av 12 i deltabellen |
| Kontrollerar | Sid 2 är delad av "//" — deltabell 2 av 3 |

| # | Tid | Hållplats |
| --- | --- | --- |
| 1 | 11:39 | Glumslöv |
| 2 | 11:46 | Rydebäck IP |
| 3 | 11:54 | Örby IP |
| 4 | 12:01 | Råå IP |
| 5 | 12:04 | Högastensskolan / Hedens IP |
| 6 | 12:11 | Västra Ramlösa Skola |
| 7 | 12:15 | Elinebergsplatsen / Harlyckan IP |
| 8 | 12:19 | Wieselgrensskolan |
| 9 | 12:22 | Husensjöskolan |
| 10 | 12:28 | Olympiaskolan |
| 11 | 12:35 | Tågaborgsskolan |
| 12 | 12:42 | Norrvalla IP |

### 11-fre-lor-p2b1c2

| Fält | Värde |
| --- | --- |
| PDF-sida | 2 |
| Deltabell på sidan | 1 |
| Kolumn i deltabellen | 2 (x ≈ 211.5) |
| Linje | 11 |
| Trafikdag | Fredag & lördag |
| Riktning | norrut |
| Antal hållplatser | 11 av 12 i deltabellen |
| Kontrollerar | Tomma celler: kolumnen har 11 tider av 12 hållplatsrader |

| # | Tid | Hållplats |
| --- | --- | --- |
| 1 | 06:30 | Rydebäck IP |
| 2 | 06:38 | Örby IP |
| 3 | 06:45 | Råå IP |
| 4 | 06:48 | Högastensskolan / Hedens IP |
| 5 | 06:55 | Västra Ramlösa Skola |
| 6 | 06:59 | Elinebergsplatsen / Harlyckan IP |
| 7 | 07:03 | Wieselgrensskolan |
| 8 | 07:06 | Husensjöskolan |
| 9 | 07:12 | Olympiaskolan |
| 10 | 07:19 | Tågaborgsskolan |
| 11 | 07:26 | Norrvalla IP |

### 11-fre-lor-p2b1c3

| Fält | Värde |
| --- | --- |
| PDF-sida | 2 |
| Deltabell på sidan | 1 |
| Kolumn i deltabellen | 3 (x ≈ 247.4) |
| Linje | 11 |
| Trafikdag | Fredag & lördag |
| Riktning | norrut |
| Antal hållplatser | 11 av 12 i deltabellen |
| Kontrollerar | Tomma celler: kolumnen har 11 tider av 12 hållplatsrader |

| # | Tid | Hållplats |
| --- | --- | --- |
| 1 | 06:50 | Rydebäck IP |
| 2 | 06:58 | Örby IP |
| 3 | 07:05 | Råå IP |
| 4 | 07:08 | Högastensskolan / Hedens IP |
| 5 | 07:15 | Västra Ramlösa Skola |
| 6 | 07:19 | Elinebergsplatsen / Harlyckan IP |
| 7 | 07:23 | Wieselgrensskolan |
| 8 | 07:26 | Husensjöskolan |
| 9 | 07:32 | Olympiaskolan |
| 10 | 07:39 | Tågaborgsskolan |
| 11 | 07:46 | Norrvalla IP |

### 11-fre-lor-p2b1c9

| Fält | Värde |
| --- | --- |
| PDF-sida | 2 |
| Deltabell på sidan | 1 |
| Kolumn i deltabellen | 9 (x ≈ 462.7) |
| Linje | 11 |
| Trafikdag | Fredag & lördag |
| Riktning | norrut |
| Antal hållplatser | 12 av 12 i deltabellen |
| Kontrollerar | Linje 11, fredag/lördag, komplett tur |

| # | Tid | Hållplats |
| --- | --- | --- |
| 1 | 08:39 | Glumslöv |
| 2 | 08:46 | Rydebäck IP |
| 3 | 08:54 | Örby IP |
| 4 | 09:01 | Råå IP |
| 5 | 09:04 | Högastensskolan / Hedens IP |
| 6 | 09:11 | Västra Ramlösa Skola |
| 7 | 09:15 | Elinebergsplatsen / Harlyckan IP |
| 8 | 09:19 | Wieselgrensskolan |
| 9 | 09:22 | Husensjöskolan |
| 10 | 09:28 | Olympiaskolan |
| 11 | 09:35 | Tågaborgsskolan |
| 12 | 09:42 | Norrvalla IP |

### 11-fre-lor-p3b1c1

| Fält | Värde |
| --- | --- |
| PDF-sida | 3 |
| Deltabell på sidan | 1 |
| Kolumn i deltabellen | 1 (x ≈ 183.2) |
| Linje | 11 |
| Trafikdag | Fredag & lördag |
| Riktning | söderut |
| Antal hållplatser | 7 av 12 i deltabellen |
| Kontrollerar | Sid 3 är delad av "//" — deltabell 1 av 3 |
| Kontrollerar | Riktning söderut |

| # | Tid | Hållplats |
| --- | --- | --- |
| 1 | 06:40 | Olympiaskolan |
| 2 | 06:53 | Elinebergsplatsen / Harlyckan IP |
| 3 | 07:03 | Högastensskolan / Hedens IP |
| 4 | 07:06 | Råå IP |
| 5 | 07:13 | Örby IP |
| 6 | 07:21 | Rydebäck IP |
| 7 | 07:28 | Glumslöv |

### 11-fre-lor-p3b2c1

| Fält | Värde |
| --- | --- |
| PDF-sida | 3 |
| Deltabell på sidan | 2 |
| Kolumn i deltabellen | 1 (x ≈ 219.1) |
| Linje | 11 |
| Trafikdag | Fredag & lördag |
| Riktning | söderut |
| Antal hållplatser | 12 av 12 i deltabellen |
| Kontrollerar | Sid 3 är delad av "//" — deltabell 2 av 3 |

| # | Tid | Hållplats |
| --- | --- | --- |
| 1 | 11:12 | Norrvalla IP |
| 2 | 11:19 | Tågaborgsskolan |
| 3 | 11:26 | Olympiaskolan |
| 4 | 11:29 | Husensjöskolan |
| 5 | 11:35 | Wieselgrensskolan |
| 6 | 11:39 | Elinebergsplatsen / Harlyckan IP |
| 7 | 11:43 | Västra Ramlösa Skola |
| 8 | 11:50 | Högastensskolan / Hedens IP |
| 9 | 11:53 | Råå IP |
| 10 | 12:00 | Örby IP |
| 11 | 12:08 | Rydebäck IP |
| 12 | 12:15 | Glumslöv |

### 11-sondag-p4b1c1

| Fält | Värde |
| --- | --- |
| PDF-sida | 4 |
| Deltabell på sidan | 1 |
| Kolumn i deltabellen | 1 (x ≈ 177.4) |
| Linje | 11 |
| Trafikdag | Söndag |
| Riktning | norrut |
| Antal hållplatser | 2 av 12 i deltabellen |
| Kontrollerar | Sid 4 är delad av "//" — deltabell 1 av 2 |

| # | Tid | Hållplats |
| --- | --- | --- |
| 1 | 06:25 | Rydebäck IP |
| 2 | 06:55 | Norrvalla IP |

### 11-sondag-p4b2c1

| Fält | Värde |
| --- | --- |
| PDF-sida | 4 |
| Deltabell på sidan | 2 |
| Kolumn i deltabellen | 1 (x ≈ 177.4) |
| Linje | 11 |
| Trafikdag | Söndag |
| Riktning | norrut |
| Antal hållplatser | 12 av 12 i deltabellen |
| Kontrollerar | Sid 4 är delad av "//" — deltabell 2 av 2 |

| # | Tid | Hållplats |
| --- | --- | --- |
| 1 | 11:39 | Glumslöv |
| 2 | 11:46 | Rydebäck IP |
| 3 | 11:54 | Örby IP |
| 4 | 12:01 | Råå IP |
| 5 | 12:04 | Högastensskolan / Hedens IP |
| 6 | 12:11 | Västra Ramlösa Skola |
| 7 | 12:15 | Elinebergsplatsen / Harlyckan IP |
| 8 | 12:19 | Wieselgrensskolan |
| 9 | 12:22 | Husensjöskolan |
| 10 | 12:28 | Olympiaskolan |
| 11 | 12:35 | Tågaborgsskolan |
| 12 | 12:42 | Norrvalla IP |

### 11-sondag-p4b1c9

| Fält | Värde |
| --- | --- |
| PDF-sida | 4 |
| Deltabell på sidan | 1 |
| Kolumn i deltabellen | 9 (x ≈ 467.4) |
| Linje | 11 |
| Trafikdag | Söndag |
| Riktning | norrut |
| Antal hållplatser | 12 av 12 i deltabellen |
| Kontrollerar | Linje 11, söndag, komplett tur |

| # | Tid | Hållplats |
| --- | --- | --- |
| 1 | 08:39 | Glumslöv |
| 2 | 08:46 | Rydebäck IP |
| 3 | 08:54 | Örby IP |
| 4 | 09:01 | Råå IP |
| 5 | 09:04 | Högastensskolan / Hedens IP |
| 6 | 09:11 | Västra Ramlösa Skola |
| 7 | 09:15 | Elinebergsplatsen / Harlyckan IP |
| 8 | 09:19 | Wieselgrensskolan |
| 9 | 09:22 | Husensjöskolan |
| 10 | 09:28 | Olympiaskolan |
| 11 | 09:35 | Tågaborgsskolan |
| 12 | 09:42 | Norrvalla IP |

### 11-sondag-p5b1c1

| Fält | Värde |
| --- | --- |
| PDF-sida | 5 |
| Deltabell på sidan | 1 |
| Kolumn i deltabellen | 1 (x ≈ 207.1) |
| Linje | 11 |
| Trafikdag | Söndag |
| Riktning | söderut |
| Antal hållplatser | 7 av 12 i deltabellen |
| Kontrollerar | Sid 5 är delad av "//" — deltabell 1 av 2 |

| # | Tid | Hållplats |
| --- | --- | --- |
| 1 | 06:40 | Olympiaskolan |
| 2 | 06:53 | Elinebergsplatsen / Harlyckan IP |
| 3 | 07:03 | Högastensskolan / Hedens IP |
| 4 | 07:06 | Råå IP |
| 5 | 07:13 | Örby IP |
| 6 | 07:21 | Rydebäck IP |
| 7 | 07:28 | Glumslöv |

### 11-sondag-p5b2c1

| Fält | Värde |
| --- | --- |
| PDF-sida | 5 |
| Deltabell på sidan | 2 |
| Kolumn i deltabellen | 1 (x ≈ 245.9) |
| Linje | 11 |
| Trafikdag | Söndag |
| Riktning | söderut |
| Antal hållplatser | 12 av 12 i deltabellen |
| Kontrollerar | Sid 5 är delad av "//" — deltabell 2 av 2 |

| # | Tid | Hållplats |
| --- | --- | --- |
| 1 | 11:12 | Norrvalla IP |
| 2 | 11:19 | Tågaborgsskolan |
| 3 | 11:26 | Olympiaskolan |
| 4 | 11:29 | Husensjöskolan |
| 5 | 11:35 | Wieselgrensskolan |
| 6 | 11:39 | Elinebergsplatsen / Harlyckan IP |
| 7 | 11:43 | Västra Ramlösa Skola |
| 8 | 11:50 | Högastensskolan / Hedens IP |
| 9 | 11:53 | Råå IP |
| 10 | 12:00 | Örby IP |
| 11 | 12:08 | Rydebäck IP |
| 12 | 12:15 | Glumslöv |

### 12-fre-lor-p6b1c1

| Fält | Värde |
| --- | --- |
| PDF-sida | 6 |
| Deltabell på sidan | 1 |
| Kolumn i deltabellen | 1 (x ≈ 231.2) |
| Linje | 12 |
| Trafikdag | Fredag & lördag |
| Riktning | norrut |
| Antal hållplatser | 7 av 8 i deltabellen |
| Kontrollerar | Sid 6 är delad av "//" — deltabell 1 av 3 |

| # | Tid | Hållplats |
| --- | --- | --- |
| 1 | 06:12 | Elinebergskyrkan / Harlyckan IP |
| 2 | 06:16 | Västra Ramlösa Skola |
| 3 | 06:22 | Gustavslundsskolan |
| 4 | 06:28 | Adolfsberg (Västergård IP 300 m) |
| 5 | 06:33 | Filbornaskolan / Filborna IP |
| 6 | 06:38 | Olympiaskolan |
| 7 | 06:50 | Norrvalla IP |

### 12-fre-lor-p6b2c1

| Fält | Värde |
| --- | --- |
| PDF-sida | 6 |
| Deltabell på sidan | 2 |
| Kolumn i deltabellen | 1 (x ≈ 231.2) |
| Linje | 12 |
| Trafikdag | Fredag & lördag |
| Riktning | norrut |
| Antal hållplatser | 8 av 8 i deltabellen |
| Kontrollerar | Sid 6 är delad av "//" — deltabell 2 av 3 |

| # | Tid | Hållplats |
| --- | --- | --- |
| 1 | 10:32 | Bårslöv |
| 2 | 10:44 | Elinebergskyrkan / Harlyckan IP |
| 3 | 10:48 | Västra Ramlösa Skola |
| 4 | 10:54 | Gustavslundsskolan |
| 5 | 11:00 | Adolfsberg (Västergård IP 300 m) |
| 6 | 11:05 | Filbornaskolan / Filborna IP |
| 7 | 11:10 | Olympiaskolan |
| 8 | 11:22 | Norrvalla IP |

### 12-fre-lor-p6b1c9

| Fält | Värde |
| --- | --- |
| PDF-sida | 6 |
| Deltabell på sidan | 1 |
| Kolumn i deltabellen | 9 (x ≈ 533.6) |
| Linje | 12 |
| Trafikdag | Fredag & lördag |
| Riktning | norrut |
| Antal hållplatser | 8 av 8 i deltabellen |
| Kontrollerar | Linje 12, fredag/lördag, komplett tur |

| # | Tid | Hållplats |
| --- | --- | --- |
| 1 | 08:32 | Bårslöv |
| 2 | 08:44 | Elinebergskyrkan / Harlyckan IP |
| 3 | 08:48 | Västra Ramlösa Skola |
| 4 | 08:54 | Gustavslundsskolan |
| 5 | 09:00 | Adolfsberg (Västergård IP 300 m) |
| 6 | 09:05 | Filbornaskolan / Filborna IP |
| 7 | 09:10 | Olympiaskolan |
| 8 | 09:22 | Norrvalla IP |

### 12-sondag-p8b1c9

| Fält | Värde |
| --- | --- |
| PDF-sida | 8 |
| Deltabell på sidan | 1 |
| Kolumn i deltabellen | 9 (x ≈ 553.9) |
| Linje | 12 |
| Trafikdag | Söndag |
| Riktning | norrut |
| Antal hållplatser | 10 av 10 i deltabellen |
| Kontrollerar | Linje 12, söndag, komplett tur |

| # | Tid | Hållplats |
| --- | --- | --- |
| 1 | 08:30 | Gantofta |
| 2 | 08:41 | Bårslöv |
| 3 | 08:46 | Påarp Medevi |
| 4 | 08:58 | Elinebergskyrkan / Harlyckan IP |
| 5 | 09:02 | Västra Ramlösa Skola |
| 6 | 09:08 | Gustavslundsskolan |
| 7 | 09:13 | Adolfsberg (Västergård IP 300 m) |
| 8 | 09:18 | Filbornaskolan / Filborna IP |
| 9 | 09:22 | Olympiaskolan |
| 10 | 09:30 | Norrvalla IP |

### 13-fre-lor-p10b1c1

| Fält | Värde |
| --- | --- |
| PDF-sida | 10 |
| Deltabell på sidan | 1 |
| Kolumn i deltabellen | 1 (x ≈ 235.5) |
| Linje | 13 |
| Trafikdag | Fredag & lördag |
| Riktning | norrut |
| Antal hållplatser | 11 av 11 i deltabellen |
| Kontrollerar | Linje 13, fredag/lördag, komplett tur |
| Kontrollerar | Dubblettkolumn: originalet, behålls i användarens resultat |

| # | Tid | Hållplats |
| --- | --- | --- |
| 1 | 06:03 | Högastensskolan / Hedens IP |
| 2 | 06:07 | Råå IP |
| 3 | 06:14 | Ättekulla IP |
| 4 | 06:21 | Västra Ramlösa Skola |
| 5 | 06:25 | Elinebergsplatsen / Harlyckan IP |
| 6 | 06:31 | Wieselgrensskolan |
| 7 | 06:35 | Husensjöskolan |
| 8 | 06:41 | Adolfsberg (Västergård IP 300 m) |
| 9 | 06:47 | Filbornaskolan / Filborna IP |
| 10 | 06:51 | Olympiaskolan |
| 11 | 07:01 | Norrvalla IP |

### 13-fre-lor-p10b1c2

| Fält | Värde |
| --- | --- |
| PDF-sida | 10 |
| Deltabell på sidan | 1 |
| Kolumn i deltabellen | 2 (x ≈ 272.8) |
| Linje | 13 |
| Trafikdag | Fredag & lördag |
| Riktning | norrut |
| Antal hållplatser | 11 av 11 i deltabellen |
| Kontrollerar | Dubblettkolumn: identisk med 13-fre-lor-p10b1c1 (sid 10, kolumn 1) — filtreras bort ur resultatet |
| Kontrollerar | Identisk med 13-fre-lor-p10b1c1 |

| # | Tid | Hållplats |
| --- | --- | --- |
| 1 | 06:03 | Högastensskolan / Hedens IP |
| 2 | 06:07 | Råå IP |
| 3 | 06:14 | Ättekulla IP |
| 4 | 06:21 | Västra Ramlösa Skola |
| 5 | 06:25 | Elinebergsplatsen / Harlyckan IP |
| 6 | 06:31 | Wieselgrensskolan |
| 7 | 06:35 | Husensjöskolan |
| 8 | 06:41 | Adolfsberg (Västergård IP 300 m) |
| 9 | 06:47 | Filbornaskolan / Filborna IP |
| 10 | 06:51 | Olympiaskolan |
| 11 | 07:01 | Norrvalla IP |

### 13-fre-lor-p11b1c2

| Fält | Värde |
| --- | --- |
| PDF-sida | 11 |
| Deltabell på sidan | 1 |
| Kolumn i deltabellen | 2 (x ≈ 269) |
| Linje | 13 |
| Trafikdag | Fredag & lördag |
| Riktning | söderut |
| Antal hållplatser | 11 av 11 i deltabellen |
| Kontrollerar | Dubblettkolumn: originalet, behålls i användarens resultat |

| # | Tid | Hållplats |
| --- | --- | --- |
| 1 | 07:03 | Norrvalla IP |
| 2 | 07:13 | Olympiaskolan |
| 3 | 07:17 | Filbornaskolan / Filborna IP |
| 4 | 07:23 | Adolfsberg (Västergård IP 300 m) |
| 5 | 07:29 | Husensjöskolan |
| 6 | 07:33 | Wieselgrensskolan |
| 7 | 07:39 | Elinebergsplatsen / Harlyckan IP |
| 8 | 07:43 | Västra Ramlösa Skola |
| 9 | 07:50 | Ättekulla IP |
| 10 | 07:57 | Råå IP |
| 11 | 08:01 | Högastensskolan / Hedens IP |

### 13-fre-lor-p11b1c3

| Fält | Värde |
| --- | --- |
| PDF-sida | 11 |
| Deltabell på sidan | 1 |
| Kolumn i deltabellen | 3 (x ≈ 306.8) |
| Linje | 13 |
| Trafikdag | Fredag & lördag |
| Riktning | söderut |
| Antal hållplatser | 11 av 11 i deltabellen |
| Kontrollerar | Dubblettkolumn: identisk med 13-fre-lor-p11b1c2 (sid 11, kolumn 2) — filtreras bort ur resultatet |
| Kontrollerar | Identisk med 13-fre-lor-p11b1c2 |

| # | Tid | Hållplats |
| --- | --- | --- |
| 1 | 07:03 | Norrvalla IP |
| 2 | 07:13 | Olympiaskolan |
| 3 | 07:17 | Filbornaskolan / Filborna IP |
| 4 | 07:23 | Adolfsberg (Västergård IP 300 m) |
| 5 | 07:29 | Husensjöskolan |
| 6 | 07:33 | Wieselgrensskolan |
| 7 | 07:39 | Elinebergsplatsen / Harlyckan IP |
| 8 | 07:43 | Västra Ramlösa Skola |
| 9 | 07:50 | Ättekulla IP |
| 10 | 07:57 | Råå IP |
| 11 | 08:01 | Högastensskolan / Hedens IP |

### 13-sondag-p12b1c1

| Fält | Värde |
| --- | --- |
| PDF-sida | 12 |
| Deltabell på sidan | 1 |
| Kolumn i deltabellen | 1 (x ≈ 231.2) |
| Linje | 13 |
| Trafikdag | Söndag |
| Riktning | norrut |
| Antal hållplatser | 11 av 11 i deltabellen |
| Kontrollerar | Linje 13, söndag, komplett tur |

| # | Tid | Hållplats |
| --- | --- | --- |
| 1 | 06:03 | Högastensskolan / Hedens IP |
| 2 | 06:07 | Råå IP |
| 3 | 06:14 | Ättekulla IP |
| 4 | 06:21 | Västra Ramlösa Skola |
| 5 | 06:25 | Elinebergsplatsen / Harlyckan IP |
| 6 | 06:31 | Wieselgrensskolan |
| 7 | 06:35 | Husensjöskolan |
| 8 | 06:41 | Adolfsberg (Västergård IP 300 m) |
| 9 | 06:47 | Filbornaskolan / Filborna IP |
| 10 | 06:51 | Olympiaskolan |
| 11 | 07:01 | Norrvalla IP |

### 14-fre-lor-p14b1c1

| Fält | Värde |
| --- | --- |
| PDF-sida | 14 |
| Deltabell på sidan | 1 |
| Kolumn i deltabellen | 1 (x ≈ 239) |
| Linje | 14 |
| Trafikdag | Fredag & lördag |
| Riktning | norrut |
| Antal hållplatser | 7 av 7 i deltabellen |
| Kontrollerar | Linje 14, fredag/lördag, komplett tur |

| # | Tid | Hållplats |
| --- | --- | --- |
| 1 | 06:26 | Rönnowska skolan |
| 2 | 06:31 | Elinebergsplatsen / Harlyckan IP |
| 3 | 06:35 | Västra Ramlösa Skola |
| 4 | 06:42 | Adolfsberg (Västergård IP 300 m) |
| 5 | 06:47 | Filbornaskolan / Filborna IP |
| 6 | 06:58 | Norrvalla IP |
| 7 | 07:04 | Tågaborgsskolan |

### 14-sondag-p16b1c1

| Fält | Värde |
| --- | --- |
| PDF-sida | 16 |
| Deltabell på sidan | 1 |
| Kolumn i deltabellen | 1 (x ≈ 239) |
| Linje | 14 |
| Trafikdag | Söndag |
| Riktning | norrut |
| Antal hållplatser | 7 av 7 i deltabellen |
| Kontrollerar | Linje 14, söndag, komplett tur |

| # | Tid | Hållplats |
| --- | --- | --- |
| 1 | 06:26 | Rönnowska skolan |
| 2 | 06:31 | Elinebergsplatsen / Harlyckan IP |
| 3 | 06:35 | Västra Ramlösa Skola |
| 4 | 06:42 | Adolfsberg (Västergård IP 300 m) |
| 5 | 06:47 | Filbornaskolan / Filborna IP |
| 6 | 06:58 | Norrvalla IP |
| 7 | 07:04 | Tågaborgsskolan |

### 15-fre-lor-p18b1c1

| Fält | Värde |
| --- | --- |
| PDF-sida | 18 |
| Deltabell på sidan | 1 |
| Kolumn i deltabellen | 1 (x ≈ 202.7) |
| Linje | 15 |
| Trafikdag | Fredag & lördag |
| Riktning | norr/söderut |
| Antal hållplatser | 3 av 3 i deltabellen |
| Kontrollerar | Linje 15, fredag/lördag, komplett tur |

| # | Tid | Hållplats |
| --- | --- | --- |
| 1 | 07:08 | Norrvalla IP |
| 2 | 07:17 | Maria Park |
| 3 | 07:30 | Laröds IP |

### 15-sondag-p19b1c1

| Fält | Värde |
| --- | --- |
| PDF-sida | 19 |
| Deltabell på sidan | 1 |
| Kolumn i deltabellen | 1 (x ≈ 202.7) |
| Linje | 15 |
| Trafikdag | Söndag |
| Riktning | norr/söderut |
| Antal hållplatser | 3 av 3 i deltabellen |
| Kontrollerar | Linje 15, söndag, komplett tur |

| # | Tid | Hållplats |
| --- | --- | --- |
| 1 | 07:08 | Norrvalla IP |
| 2 | 07:17 | Maria Park |
| 3 | 07:30 | Laröds IP |

### 16-fre-lor-p20b1c1

| Fält | Värde |
| --- | --- |
| PDF-sida | 20 |
| Deltabell på sidan | 1 |
| Kolumn i deltabellen | 1 (x ≈ 248.4) |
| Linje | 16 |
| Trafikdag | Fredag & lördag |
| Riktning | norr/söderut |
| Antal hållplatser | 3 av 3 i deltabellen |
| Kontrollerar | Linje 16, fredag/lördag, komplett tur |

| # | Tid | Hållplats |
| --- | --- | --- |
| 1 | 07:08 | Norrvalla IP |
| 2 | 07:14 | Scandic Nord |
| 3 | 07:30 | Spritan, Ödåkra Fabriksgatan – Toftavallen |

### 16-sondag-p21b1c1

| Fält | Värde |
| --- | --- |
| PDF-sida | 21 |
| Deltabell på sidan | 1 |
| Kolumn i deltabellen | 1 (x ≈ 260.9) |
| Linje | 16 |
| Trafikdag | Söndag |
| Riktning | norr/söderut |
| Antal hållplatser | 4 av 4 i deltabellen |
| Kontrollerar | Linje 16, söndag, komplett tur |

| # | Tid | Hållplats |
| --- | --- | --- |
| 1 | 07:08 | Norrvalla IP |
| 2 | 07:14 | Scandic Nord |
| 3 | 07:24 | Allerums IP |
| 4 | 07:30 | Spritan, Ödåkra Fabriksgatan – Toftavallen |

### 17-sondag-p22b1c1

| Fält | Värde |
| --- | --- |
| PDF-sida | 22 |
| Deltabell på sidan | 1 |
| Kolumn i deltabellen | 1 (x ≈ 233.6) |
| Linje | 17 |
| Trafikdag | Söndag |
| Riktning | norr/söderut |
| Antal hållplatser | 5 av 5 i deltabellen |
| Kontrollerar | Linje 17, söndag, komplett tur |
| Kontrollerar | Linje 17, vanlig tur — jämför med snabbturen ovan |

| # | Tid | Hållplats |
| --- | --- | --- |
| 1 | 06:38 | Norrvalla IP |
| 2 | 06:50 | Flygfältet (Vattentornet) |
| 3 | 07:00 | Elinebergsplatsen / Harlyckan IP |
| 4 | 07:12 | Bårslöv |
| 5 | 07:24 | Mörarp Vidablick IP |

### 17-sondag-p22b1c3

| Fält | Värde |
| --- | --- |
| PDF-sida | 22 |
| Deltabell på sidan | 1 |
| Kolumn i deltabellen | 3 (x ≈ 313.3) |
| Linje | 17 |
| Trafikdag | Söndag |
| Riktning | norr/söderut |
| Antal hållplatser | 2 av 5 i deltabellen |
| Kontrollerar | Snabbtur på linje 17: hoppar över mellanliggande hållplatser |

| # | Tid | Hållplats |
| --- | --- | --- |
| 1 | 07:10 | Norrvalla IP |
| 2 | 07:30 | Mörarp Vidablick IP |

### 20-sondag-p23b1c1

| Fält | Värde |
| --- | --- |
| PDF-sida | 23 |
| Deltabell på sidan | 1 |
| Kolumn i deltabellen | 1 (x ≈ 250.4) |
| Linje | 20 |
| Trafikdag | Söndag |
| Riktning | norr/söderut |
| Antal hållplatser | 4 av 4 i deltabellen |
| Kontrollerar | Linje 20, söndag, komplett tur |

| # | Tid | Hållplats |
| --- | --- | --- |
| 1 | 14:00 | Adolfsberg (Västergård IP 300 m) |
| 2 | 14:06 | Filbornaskolan / Filborna IP |
| 3 | 14:10 | Olympiaskolan |
| 4 | 14:18 | Norrvalla IP |

### 21-sondag-p24b1c1

| Fält | Värde |
| --- | --- |
| PDF-sida | 24 |
| Deltabell på sidan | 1 |
| Kolumn i deltabellen | 1 (x ≈ 250.4) |
| Linje | 21 |
| Trafikdag | Söndag |
| Riktning | norr/söderut |
| Antal hållplatser | 4 av 4 i deltabellen |
| Kontrollerar | Linje 21, söndag, komplett tur |

| # | Tid | Hållplats |
| --- | --- | --- |
| 1 | 14:15 | Högastensskolan / Hedens IP |
| 2 | 14:25 | Ättekulla IP |
| 3 | 14:35 | Elinebergskyrkan / Harlyckan IP |
| 4 | 14:43 | Adolfsberg (Västergård IP 300 m) |

