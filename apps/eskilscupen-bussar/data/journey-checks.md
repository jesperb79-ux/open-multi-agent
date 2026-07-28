# Kontrollkörning: verkliga resefall

Genererad av `npm test` (tests/journey-checks.test.ts). Förväntan i varje rad är skriven för hand mot PDF:en; "faktisk" är vad reseplaneraren räknar fram ur den importerade tidtabellen.

**13 av 13 fall stämmer.**

| # | Fall | Sökning | Förväntad | Faktisk | Status |
| --- | --- | --- | --- | --- | --- |
| 1 | Direktresa utan byte | Rydebäck IP → Olympiaskolan, 06:00, fre-lor | 06:30→07:12 · inget byte · Linje 11 | 06:30→07:12 · 42 min · inget byte · Linje 11 | OK |
| 2 | Resa med ett byte | Laröds IP → Filbornaskolan / Filborna IP, 10:00, fre-lor | 10:17→11:03 · 1 byte(n) · Linje 15 + Linje 14 · byte vid Norrvalla IP · väntetid 13 min | 10:17→11:03 · 46 min · 1 byte(n) · Linje 15 + Linje 14 · byte Norrvalla IP 13 min | OK |
| 3 | Resa med två byten | Ättekulla IP → Laröds IP, 08:00, sondag | 08:09→09:18 · 2 byte(n) · Linje 13 + Linje 12 + Linje 15 · byte vid Västra Ramlösa Skola, Norrvalla IP · väntetid 6, 6 min | 08:09→09:18 · 69 min · 2 byte(n) · Linje 13 + Linje 12 + Linje 15 · byte Västra Ramlösa Skola 6 min; byte Norrvalla IP 6 min | OK |
| 4 | Byte på 3 minuter — tillåtet när minsta bytestid är 3 | Maria Park → Olympiaskolan, 11:00, fre-lor, minsta byte 3 min | 11:06→11:28 · 1 byte(n) · Linje 15 + Linje 12 · väntetid 3 min | 11:06→11:28 · 22 min · 1 byte(n) · Linje 15 + Linje 12 · byte Norrvalla IP 3 min | OK |
| 5 | Samma resa med 5 minuters minsta bytestid — det korta bytet väljs bort | Maria Park → Olympiaskolan, 11:00, fre-lor, minsta byte 5 min | 11:06→11:46 · 1 byte(n) · Linje 15 + Linje 11 · väntetid 17 min | 11:06→11:46 · 40 min · 1 byte(n) · Linje 15 + Linje 11 · byte Norrvalla IP 17 min | OK |
| 6 | Fredag/lördag: linje 21 kör inte | Ättekulla IP → Adolfsberg (Västergård IP 300 m), 14:00, fre-lor | 14:09→14:36 · inget byte · Linje 13 | 14:09→14:36 · 27 min · inget byte · Linje 13 | OK |
| 7 | Söndag: samma sträcka, andra linjer | Ättekulla IP → Adolfsberg (Västergård IP 300 m), 14:00, sondag | 14:09→14:33 · 1 byte(n) · Linje 13 + Linje 12 · väntetid 6 min | 14:09→14:33 · 24 min · 1 byte(n) · Linje 13 + Linje 12 · byte Västra Ramlösa Skola 6 min | OK |
| 8 | Tur som hoppar över hållplatser | Rydebäck IP → Norrvalla IP, 06:00, fre-lor | 06:25→06:55 · inget byte · Linje 11 | 06:25→06:55 · 30 min · inget byte · Linje 11 | OK |
| 9 | Linje 17:s snabbtur väljs framför den vanliga turen | Norrvalla IP → Mörarp Vidablick IP, 07:00, sondag | 07:10→07:30 · inget byte · Linje 17 | 07:10→07:30 · 20 min · inget byte · Linje 17 | OK |
| 10 | Harlyckan som start (hållplats Elinebergsplatsen) | Elinebergsplatsen / Harlyckan IP → Laröds IP, 13:00, fre-lor | 13:11→14:06 · 1 byte(n) · Linje 14 + Linje 15 · byte vid Norrvalla IP · väntetid 6 min | 13:11→14:06 · 55 min · 1 byte(n) · Linje 14 + Linje 15 · byte Norrvalla IP 6 min | OK |
| 11 | Harlyckan som destination (hållplats Elinebergskyrkan) | Norrvalla IP → Elinebergskyrkan / Harlyckan IP, 13:00, sondag | 13:18→13:52 · inget byte · Linje 12 | 13:18→13:52 · 34 min · inget byte · Linje 12 | OK |
| 12 | Harlyckans två hållplatser hålls isär | Flygfältet (Vattentornet) → Elinebergskyrkan / Harlyckan IP, 08:00, sondag | 08:20→09:10 · 2 byte(n) · Linje 17 + Linje 11 + Linje 12 · byte vid Elinebergsplatsen / Harlyckan IP, Västra Ramlösa Skola | 08:20→09:10 · 50 min · 2 byte(n) · Linje 17 + Linje 11 + Linje 12 · byte Elinebergsplatsen / Harlyckan IP 9 min; byte Västra Ramlösa Skola 23 min | OK |
| 13 | Ingen resa efter dagens sista avgång | Norrvalla IP → Laröds IP, 23:30, fre-lor | ingen resa | ingen resa | OK |

## Detaljer

### Direktresa utan byte

Linje 11 går hela vägen Rydebäck IP → Olympiaskolan.

- Sökning: `{"originStop":"rydeback-ip","destinationStop":"olympiaskolan","earliestDeparture":"06:00","serviceId":"fre-lor"}`
- Förväntad: 06:30→07:12 · inget byte · Linje 11
- Faktisk: 06:30→07:12 · 42 min · inget byte · Linje 11
- Status: **OK**

Samtliga alternativ som appen visar:

- 06:30→07:12 · 42 min · inget byte · Linje 11
  - 06:30 Linje 11 från Rydebäck IP → 07:12 Olympiaskolan (via Örby IP, Råå IP, Högastensskolan / Hedens IP, Västra Ramlösa Skola, Elinebergsplatsen / Harlyckan IP, Wieselgrensskolan, Husensjöskolan)
- 06:50→07:32 · 42 min · inget byte · Linje 11
  - 06:50 Linje 11 från Rydebäck IP → 07:32 Olympiaskolan (via Örby IP, Råå IP, Högastensskolan / Hedens IP, Västra Ramlösa Skola, Elinebergsplatsen / Harlyckan IP, Wieselgrensskolan, Husensjöskolan)
- 07:10→07:52 · 42 min · inget byte · Linje 11
  - 07:10 Linje 11 från Rydebäck IP → 07:52 Olympiaskolan (via Örby IP, Råå IP, Högastensskolan / Hedens IP, Västra Ramlösa Skola, Elinebergsplatsen / Harlyckan IP, Wieselgrensskolan, Husensjöskolan)

### Resa med ett byte

Laröds IP nås bara av linje 15; Filborna IP kräver byte vid Norrvalla IP.

- Sökning: `{"originStop":"larods-ip","destinationStop":"filborna-ip","earliestDeparture":"10:00","serviceId":"fre-lor"}`
- Förväntad: 10:17→11:03 · 1 byte(n) · Linje 15 + Linje 14 · byte vid Norrvalla IP · väntetid 13 min
- Faktisk: 10:17→11:03 · 46 min · 1 byte(n) · Linje 15 + Linje 14 · byte Norrvalla IP 13 min
- Status: **OK**

Samtliga alternativ som appen visar:

- 10:17→11:03 · 46 min · 1 byte(n) · Linje 15 + Linje 14 · byte Norrvalla IP 13 min
  - 10:17 Linje 15 från Laröds IP → 10:39 Norrvalla IP (via Maria Park)
  - 10:52 Linje 14 från Norrvalla IP → 11:03 Filbornaskolan / Filborna IP
- 10:35→11:23 · 48 min · 1 byte(n) · Linje 15 + Linje 14 · byte Norrvalla IP 15 min
  - 10:35 Linje 15 från Laröds IP → 10:57 Norrvalla IP (via Maria Park)
  - 11:12 Linje 14 från Norrvalla IP → 11:23 Filbornaskolan / Filborna IP
- 10:53→11:43 · 50 min · 1 byte(n) · Linje 15 + Linje 14 · byte Norrvalla IP 17 min
  - 10:53 Linje 15 från Laröds IP → 11:15 Norrvalla IP (via Maria Park)
  - 11:32 Linje 14 från Norrvalla IP → 11:43 Filbornaskolan / Filborna IP

### Resa med två byten

Ättekulla IP → Laröds IP på söndagen kräver linje 13, 12 och 15.

- Sökning: `{"originStop":"attekulla-ip","destinationStop":"larods-ip","earliestDeparture":"08:00","serviceId":"sondag"}`
- Förväntad: 08:09→09:18 · 2 byte(n) · Linje 13 + Linje 12 + Linje 15 · byte vid Västra Ramlösa Skola, Norrvalla IP · väntetid 6, 6 min
- Faktisk: 08:09→09:18 · 69 min · 2 byte(n) · Linje 13 + Linje 12 + Linje 15 · byte Västra Ramlösa Skola 6 min; byte Norrvalla IP 6 min
- Status: **OK**

Samtliga alternativ som appen visar:

- 08:09→09:18 · 69 min · 2 byte(n) · Linje 13 + Linje 12 + Linje 15 · byte Västra Ramlösa Skola 6 min; byte Norrvalla IP 6 min
  - 08:09 Linje 13 från Ättekulla IP → 08:16 Västra Ramlösa Skola
  - 08:22 Linje 12 från Västra Ramlösa Skola → 08:50 Norrvalla IP (via Gustavslundsskolan, Adolfsberg (Västergård IP 300 m), Filbornaskolan / Filborna IP, Olympiaskolan)
  - 08:56 Linje 15 från Norrvalla IP → 09:18 Laröds IP (via Maria Park)
- 08:09→09:36 · 87 min · 1 byte(n) · Linje 13 + Linje 15 · byte Norrvalla IP 18 min
  - 08:09 Linje 13 från Ättekulla IP → 08:56 Norrvalla IP (via Västra Ramlösa Skola, Elinebergsplatsen / Harlyckan IP, Wieselgrensskolan, Husensjöskolan, Adolfsberg (Västergård IP 300 m), Filbornaskolan / Filborna IP, Olympiaskolan)
  - 09:14 Linje 15 från Norrvalla IP → 09:36 Laröds IP (via Maria Park)
- 08:29→09:54 · 85 min · 1 byte(n) · Linje 13 + Linje 15 · byte Norrvalla IP 16 min
  - 08:29 Linje 13 från Ättekulla IP → 09:16 Norrvalla IP (via Västra Ramlösa Skola, Elinebergsplatsen / Harlyckan IP, Wieselgrensskolan, Husensjöskolan, Adolfsberg (Västergård IP 300 m), Filbornaskolan / Filborna IP, Olympiaskolan)
  - 09:32 Linje 15 från Norrvalla IP → 09:54 Laröds IP (via Maria Park)

### Byte på 3 minuter — tillåtet när minsta bytestid är 3

Maria Park → Olympiaskolan har en anslutning med bara 3 minuters byte.

- Sökning: `{"originStop":"maria-park","destinationStop":"olympiaskolan","earliestDeparture":"11:00","serviceId":"fre-lor","minimumTransferMinutes":3}`
- Förväntad: 11:06→11:28 · 1 byte(n) · Linje 15 + Linje 12 · väntetid 3 min
- Faktisk: 11:06→11:28 · 22 min · 1 byte(n) · Linje 15 + Linje 12 · byte Norrvalla IP 3 min
- Status: **OK**

Samtliga alternativ som appen visar:

- 11:06→11:28 · 22 min · 1 byte(n) · Linje 15 + Linje 12 · byte Norrvalla IP 3 min
  - 11:06 Linje 15 från Maria Park → 11:15 Norrvalla IP
  - 11:18 Linje 12 från Norrvalla IP → 11:28 Olympiaskolan
- 11:24→11:48 · 24 min · 1 byte(n) · Linje 15 + Linje 12 · byte Norrvalla IP 5 min
  - 11:24 Linje 15 från Maria Park → 11:33 Norrvalla IP
  - 11:38 Linje 12 från Norrvalla IP → 11:48 Olympiaskolan
- 11:42→12:08 · 26 min · 1 byte(n) · Linje 15 + Linje 12 · byte Norrvalla IP 7 min
  - 11:42 Linje 15 från Maria Park → 11:51 Norrvalla IP
  - 11:58 Linje 12 från Norrvalla IP → 12:08 Olympiaskolan

### Samma resa med 5 minuters minsta bytestid — det korta bytet väljs bort

3-minutersbytet får inte användas; resan blir 18 minuter längre.

- Sökning: `{"originStop":"maria-park","destinationStop":"olympiaskolan","earliestDeparture":"11:00","serviceId":"fre-lor","minimumTransferMinutes":5}`
- Förväntad: 11:06→11:46 · 1 byte(n) · Linje 15 + Linje 11 · väntetid 17 min
- Faktisk: 11:06→11:46 · 40 min · 1 byte(n) · Linje 15 + Linje 11 · byte Norrvalla IP 17 min
- Status: **OK**

Samtliga alternativ som appen visar:

- 11:06→11:46 · 40 min · 1 byte(n) · Linje 15 + Linje 11 · byte Norrvalla IP 17 min
  - 11:06 Linje 15 från Maria Park → 11:15 Norrvalla IP
  - 11:32 Linje 11 från Norrvalla IP → 11:46 Olympiaskolan (via Tågaborgsskolan)
- 11:24→11:48 · 24 min · 1 byte(n) · Linje 15 + Linje 12 · byte Norrvalla IP 5 min
  - 11:24 Linje 15 från Maria Park → 11:33 Norrvalla IP
  - 11:38 Linje 12 från Norrvalla IP → 11:48 Olympiaskolan
- 11:42→12:08 · 26 min · 1 byte(n) · Linje 15 + Linje 12 · byte Norrvalla IP 7 min
  - 11:42 Linje 15 från Maria Park → 11:51 Norrvalla IP
  - 11:58 Linje 12 från Norrvalla IP → 12:08 Olympiaskolan

### Fredag/lördag: linje 21 kör inte

Ättekulla IP → Västergård IP går bara med linje 13 på fredag och lördag.

- Sökning: `{"originStop":"attekulla-ip","destinationStop":"vastergard-ip","earliestDeparture":"14:00","serviceId":"fre-lor"}`
- Förväntad: 14:09→14:36 · inget byte · Linje 13
- Faktisk: 14:09→14:36 · 27 min · inget byte · Linje 13
- Status: **OK**

Samtliga alternativ som appen visar:

- 14:09→14:36 · 27 min · inget byte · Linje 13
  - 14:09 Linje 13 från Ättekulla IP → 14:36 Adolfsberg (Västergård IP 300 m) (via Västra Ramlösa Skola, Elinebergsplatsen / Harlyckan IP, Wieselgrensskolan, Husensjöskolan)
- 14:29→14:56 · 27 min · inget byte · Linje 13
  - 14:29 Linje 13 från Ättekulla IP → 14:56 Adolfsberg (Västergård IP 300 m) (via Västra Ramlösa Skola, Elinebergsplatsen / Harlyckan IP, Wieselgrensskolan, Husensjöskolan)
- 14:49→15:16 · 27 min · inget byte · Linje 13
  - 14:49 Linje 13 från Ättekulla IP → 15:16 Adolfsberg (Västergård IP 300 m) (via Västra Ramlösa Skola, Elinebergsplatsen / Harlyckan IP, Wieselgrensskolan, Husensjöskolan)

### Söndag: samma sträcka, andra linjer

På söndagen finns en snabbare anslutning via linje 13 + 12, och linje 21 tillkommer.

- Sökning: `{"originStop":"attekulla-ip","destinationStop":"vastergard-ip","earliestDeparture":"14:00","serviceId":"sondag"}`
- Förväntad: 14:09→14:33 · 1 byte(n) · Linje 13 + Linje 12 · väntetid 6 min
- Faktisk: 14:09→14:33 · 24 min · 1 byte(n) · Linje 13 + Linje 12 · byte Västra Ramlösa Skola 6 min
- Status: **OK**

Samtliga alternativ som appen visar:

- 14:09→14:33 · 24 min · 1 byte(n) · Linje 13 + Linje 12 · byte Västra Ramlösa Skola 6 min
  - 14:09 Linje 13 från Ättekulla IP → 14:16 Västra Ramlösa Skola
  - 14:22 Linje 12 från Västra Ramlösa Skola → 14:33 Adolfsberg (Västergård IP 300 m) (via Gustavslundsskolan)
- 14:09→14:36 · 27 min · inget byte · Linje 13
  - 14:09 Linje 13 från Ättekulla IP → 14:36 Adolfsberg (Västergård IP 300 m) (via Västra Ramlösa Skola, Elinebergsplatsen / Harlyckan IP, Wieselgrensskolan, Husensjöskolan)
- 14:25→14:43 · 18 min · inget byte · Linje 21
  - 14:25 Linje 21 från Ättekulla IP → 14:43 Adolfsberg (Västergård IP 300 m) (via Elinebergskyrkan / Harlyckan IP)

### Tur som hoppar över hållplatser

Linje 11:s första tur går Rydebäck IP 06:25 direkt till Norrvalla IP 06:55.

- Sökning: `{"originStop":"rydeback-ip","destinationStop":"norrvalla-ip","earliestDeparture":"06:00","serviceId":"fre-lor"}`
- Förväntad: 06:25→06:55 · inget byte · Linje 11
- Faktisk: 06:25→06:55 · 30 min · inget byte · Linje 11
- Status: **OK**

Samtliga alternativ som appen visar:

- 06:25→06:55 · 30 min · inget byte · Linje 11
  - 06:25 Linje 11 från Rydebäck IP → 06:55 Norrvalla IP
- 06:30→07:26 · 56 min · inget byte · Linje 11
  - 06:30 Linje 11 från Rydebäck IP → 07:26 Norrvalla IP (via Örby IP, Råå IP, Högastensskolan / Hedens IP, Västra Ramlösa Skola, Elinebergsplatsen / Harlyckan IP, Wieselgrensskolan, Husensjöskolan, Olympiaskolan, Tågaborgsskolan)
- 06:50→07:46 · 56 min · inget byte · Linje 11
  - 06:50 Linje 11 från Rydebäck IP → 07:46 Norrvalla IP (via Örby IP, Råå IP, Högastensskolan / Hedens IP, Västra Ramlösa Skola, Elinebergsplatsen / Harlyckan IP, Wieselgrensskolan, Husensjöskolan, Olympiaskolan, Tågaborgsskolan)

### Linje 17:s snabbtur väljs framför den vanliga turen

Turen 07:08 ankommer 07:54; snabbturen 07:10 ankommer 07:30.

- Sökning: `{"originStop":"norrvalla-ip","destinationStop":"morarp-vidablick-ip","earliestDeparture":"07:00","serviceId":"sondag"}`
- Förväntad: 07:10→07:30 · inget byte · Linje 17
- Faktisk: 07:10→07:30 · 20 min · inget byte · Linje 17
- Status: **OK**

Samtliga alternativ som appen visar:

- 07:10→07:30 · 20 min · inget byte · Linje 17
  - 07:10 Linje 17 från Norrvalla IP → 07:30 Mörarp Vidablick IP
- 07:38→08:24 · 46 min · inget byte · Linje 17
  - 07:38 Linje 17 från Norrvalla IP → 08:24 Mörarp Vidablick IP (via Flygfältet (Vattentornet), Elinebergsplatsen / Harlyckan IP, Bårslöv)
- 08:08→08:54 · 46 min · inget byte · Linje 17
  - 08:08 Linje 17 från Norrvalla IP → 08:54 Mörarp Vidablick IP (via Flygfältet (Vattentornet), Elinebergsplatsen / Harlyckan IP, Bårslöv)

### Harlyckan som start (hållplats Elinebergsplatsen)

Linje 11, 13, 14 och 17 stannar vid Elinebergsplatsen.

- Sökning: `{"originStop":"elinebergsplatsen","destinationStop":"larods-ip","earliestDeparture":"13:00","serviceId":"fre-lor"}`
- Förväntad: 13:11→14:06 · 1 byte(n) · Linje 14 + Linje 15 · byte vid Norrvalla IP · väntetid 6 min
- Faktisk: 13:11→14:06 · 55 min · 1 byte(n) · Linje 14 + Linje 15 · byte Norrvalla IP 6 min
- Status: **OK**

Samtliga alternativ som appen visar:

- 13:11→14:06 · 55 min · 1 byte(n) · Linje 14 + Linje 15 · byte Norrvalla IP 6 min
  - 13:11 Linje 14 från Elinebergsplatsen / Harlyckan IP → 13:38 Norrvalla IP (via Västra Ramlösa Skola, Adolfsberg (Västergård IP 300 m), Filbornaskolan / Filborna IP)
  - 13:44 Linje 15 från Norrvalla IP → 14:06 Laröds IP (via Maria Park)
- 13:20→14:24 · 64 min · 1 byte(n) · Linje 13 + Linje 15 · byte Norrvalla IP 6 min
  - 13:20 Linje 13 från Elinebergsplatsen / Harlyckan IP → 13:56 Norrvalla IP (via Wieselgrensskolan, Husensjöskolan, Adolfsberg (Västergård IP 300 m), Filbornaskolan / Filborna IP, Olympiaskolan)
  - 14:02 Linje 15 från Norrvalla IP → 14:24 Laröds IP (via Maria Park)
- 13:35→14:42 · 67 min · 1 byte(n) · Linje 11 + Linje 15 · byte Norrvalla IP 18 min
  - 13:35 Linje 11 från Elinebergsplatsen / Harlyckan IP → 14:02 Norrvalla IP (via Wieselgrensskolan, Husensjöskolan, Olympiaskolan, Tågaborgsskolan)
  - 14:20 Linje 15 från Norrvalla IP → 14:42 Laröds IP (via Maria Park)

### Harlyckan som destination (hållplats Elinebergskyrkan)

Linje 12 och 21 stannar vid Elinebergskyrkan.

- Sökning: `{"originStop":"norrvalla-ip","destinationStop":"elinebergskyrkan","earliestDeparture":"13:00","serviceId":"sondag"}`
- Förväntad: 13:18→13:52 · inget byte · Linje 12
- Faktisk: 13:18→13:52 · 34 min · inget byte · Linje 12
- Status: **OK**

Samtliga alternativ som appen visar:

- 13:18→13:52 · 34 min · inget byte · Linje 12
  - 13:18 Linje 12 från Norrvalla IP → 13:52 Elinebergskyrkan / Harlyckan IP (via Olympiaskolan, Filbornaskolan / Filborna IP, Adolfsberg (Västergård IP 300 m), Gustavslundsskolan, Västra Ramlösa Skola)
- 13:38→14:13 · 35 min · 1 byte(n) · Linje 13 + Linje 21 · byte Adolfsberg (Västergård IP 300 m) 7 min
  - 13:38 Linje 13 från Norrvalla IP → 13:58 Adolfsberg (Västergård IP 300 m) (via Olympiaskolan, Filbornaskolan / Filborna IP)
  - 14:05 Linje 21 från Adolfsberg (Västergård IP 300 m) → 14:13 Elinebergskyrkan / Harlyckan IP
- 13:52→14:33 · 41 min · 1 byte(n) · Linje 14 + Linje 21 · byte Adolfsberg (Västergård IP 300 m) 17 min
  - 13:52 Linje 14 från Norrvalla IP → 14:08 Adolfsberg (Västergård IP 300 m) (via Filbornaskolan / Filborna IP)
  - 14:25 Linje 21 från Adolfsberg (Västergård IP 300 m) → 14:33 Elinebergskyrkan / Harlyckan IP

### Harlyckans två hållplatser hålls isär

Flygfältet nås av linje 17, som stannar vid Elinebergsplatsen. För att nå Elinebergskyrkan krävs byten — de slås alltså inte ihop till en hållplats.

- Sökning: `{"originStop":"flygfaltet","destinationStop":"elinebergskyrkan","earliestDeparture":"08:00","serviceId":"sondag"}`
- Förväntad: 08:20→09:10 · 2 byte(n) · Linje 17 + Linje 11 + Linje 12 · byte vid Elinebergsplatsen / Harlyckan IP, Västra Ramlösa Skola
- Faktisk: 08:20→09:10 · 50 min · 2 byte(n) · Linje 17 + Linje 11 + Linje 12 · byte Elinebergsplatsen / Harlyckan IP 9 min; byte Västra Ramlösa Skola 23 min
- Status: **OK**

Samtliga alternativ som appen visar:

- 08:20→09:10 · 50 min · 2 byte(n) · Linje 17 + Linje 11 + Linje 12 · byte Elinebergsplatsen / Harlyckan IP 9 min; byte Västra Ramlösa Skola 23 min
  - 08:20 Linje 17 från Flygfältet (Vattentornet) → 08:30 Elinebergsplatsen / Harlyckan IP
  - 08:39 Linje 11 från Elinebergsplatsen / Harlyckan IP → 08:43 Västra Ramlösa Skola
  - 09:06 Linje 12 från Västra Ramlösa Skola → 09:10 Elinebergskyrkan / Harlyckan IP
- 08:20→09:18 · 58 min · 1 byte(n) · Linje 17 + Linje 12 · byte Bårslöv 19 min
  - 08:20 Linje 17 från Flygfältet (Vattentornet) → 08:42 Bårslöv (via Elinebergsplatsen / Harlyckan IP)
  - 09:01 Linje 12 från Bårslöv → 09:18 Elinebergskyrkan / Harlyckan IP (via Påarp Medevi)
- 08:50→09:30 · 40 min · 2 byte(n) · Linje 17 + Linje 14 + Linje 12 · byte Elinebergsplatsen / Harlyckan IP 11 min; byte Västra Ramlösa Skola 11 min
  - 08:50 Linje 17 från Flygfältet (Vattentornet) → 09:00 Elinebergsplatsen / Harlyckan IP
  - 09:11 Linje 14 från Elinebergsplatsen / Harlyckan IP → 09:15 Västra Ramlösa Skola
  - 09:26 Linje 12 från Västra Ramlösa Skola → 09:30 Elinebergskyrkan / Harlyckan IP

### Ingen resa efter dagens sista avgång

Sista bussen mot Laröds IP har gått långt före 23:30.

- Sökning: `{"originStop":"norrvalla-ip","destinationStop":"larods-ip","earliestDeparture":"23:30","serviceId":"fre-lor"}`
- Förväntad: ingen resa
- Faktisk: ingen resa
- Status: **OK**

