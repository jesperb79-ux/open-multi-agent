# Trading-bot: Discord → Claude → TradingView paper trading

Ett Python-system som lyssnar på Discord-meddelanden, använder Claude API för att tolka handelssignaler (köp/sälj, ticker, pris, stop loss) och vidarebefordrar giltiga signaler till TradingView via webhook för paper trading. Alla signaler och utfall loggas till en CSV-fil.

## Arkitektur

```
Discord-meddelande
      │
      ▼
┌──────────────┐      ┌──────────────────┐
│   bot.py     │─────▶│ claude_analyzer  │  (Claude API tolkar signalen)
│ (discord.py) │      └──────────────────┘
└──────┬───────┘               │
       │                       ▼
       │             ┌──────────────────────┐
       │             │ tradingview_webhook  │  (httpx POST till TradingView)
       │             └──────────────────────┘
       │
       ▼
┌──────────────┐
│ signals_log  │  (CSV-logg av alla signaler och webhook-resultat)
│   .csv       │
└──────────────┘
```

## Filer

| Fil | Beskrivning |
|-----|-------------|
| `bot.py` | Huvudfil: startar Discord-klienten och kopplar ihop alla moduler |
| `config.py` | Läser och validerar miljövariabler från `.env` |
| `claude_analyzer.py` | Anropar Claude API och parsar svaret till en `TradeSignal` |
| `tradingview_webhook.py` | Skickar JSON-payloaden till TradingViews webhook-URL |
| `signal_logger.py` | Trådsäker CSV-logger för alla meddelanden och utfall |
| `requirements.txt` | Python-beroenden |
| `.env.example` | Mall för konfigurationsfilen |
| `.gitignore` | Undantar `.env` och CSV-filer från versionshantering |

## Installationsinstruktioner (Windows)

### 1. Installera Python 3.11 eller senare

Ladda ner från [python.org/downloads](https://www.python.org/downloads/) och kryssa för **"Add Python to PATH"** vid installationen.

Verifiera installationen i PowerShell eller Kommandotolken:

```powershell
python --version
```

### 2. Klona eller ladda ner projektet

```powershell
git clone <repo-url>
cd trading-bot
```

Eller ladda ner mappen manuellt och navigera till den.

### 3. Skapa och aktivera en virtuell miljö

I PowerShell:

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

Om PowerShell blockerar scriptet, kör detta i en PowerShell som **administratör** och godkänn:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

I vanlig Kommandotolk (cmd):

```cmd
python -m venv venv
venv\Scripts\activate.bat
```

Du ser `(venv)` först i raden när miljön är aktiv.

### 4. Installera beroenden

```powershell
pip install -r requirements.txt
```

### 5. Skapa en Discord-bot

1. Gå till [Discord Developer Portal](https://discord.com/developers/applications).
2. Klicka **New Application** och ge den ett namn.
3. Välj fliken **Bot** i vänstermenyn och klicka **Add Bot**.
4. Under **Privileged Gateway Intents**, aktivera **MESSAGE CONTENT INTENT**.
5. Klicka **Reset Token** och kopiera token (du ser den bara en gång).
6. Välj fliken **OAuth2 → URL Generator**:
   - Markera scope: `bot`
   - Markera behörigheter: `Read Messages/View Channels`, `Read Message History`
7. Öppna den genererade URL:en och bjud in boten till din server.

### 6. Hämta Discord-ID:n

1. Öppna Discord och gå till **Inställningar → Avancerat → Utvecklarläge** (slå på).
2. Högerklicka på kanalen boten ska lyssna på och välj **Kopiera kanal-ID**.
3. Upprepa för fler kanaler om du vill.
4. (Valfritt) Högerklicka på serverikonen och välj **Kopiera server-ID** för att begränsa till specifika servrar.

### 7. Hämta en Anthropic API-nyckel

1. Skapa ett konto på [console.anthropic.com](https://console.anthropic.com/).
2. Gå till **API Keys** och skapa en ny nyckel.
3. Kopiera nyckeln (visas bara en gång).

### 8. Konfigurera TradingView-webhook för paper trading

1. Öppna TradingView och gå till ett diagram.
2. Skapa ett alert (klockan uppe i fältet) och välj **Webhook URL** under "Notifications".
3. Kopiera URL:en. För paper trading-integration kan du använda TradingViews inbyggda paper trading-panel eller en third-party relay.
4. Alerten måste vara aktiv för att webhooks ska tas emot.

> **OBS:** TradingView tillåter endast webhooks på betalda abonnemang. För rena test-scenarion kan du peka `TRADINGVIEW_WEBHOOK_URL` mot t.ex. [webhook.site](https://webhook.site/) för att se payloadsen.

### 9. Skapa `.env`-filen

Kopiera mallen:

```powershell
copy .env.example .env
```

Öppna `.env` i en texteditor och fyll i:

```env
DISCORD_BOT_TOKEN=ditt-token-fran-discord
DISCORD_CHANNEL_IDS=123456789012345678,987654321098765432
ANTHROPIC_API_KEY=din-anthropic-nyckel
TRADINGVIEW_WEBHOOK_URL=https://webhook.tradingview.com/din-url
LOG_FILE_PATH=signals_log.csv
LOG_LEVEL=INFO
```

### 10. Starta boten

Se till att den virtuella miljön är aktiverad, stå i `trading-bot/`-mappen och kör:

```powershell
python bot.py
```

Du bör se något i stil med:

```
2026-04-17 12:00:00 [INFO] trading-bot: Startar trading-bot...
2026-04-17 12:00:02 [INFO] trading-bot: Inloggad som MinBot#1234 (ID: 123...)
2026-04-17 12:00:02 [INFO] trading-bot: Lyssnar på 2 kanal(er) och 0 server(ar)
```

Skriv ett testmeddelande i en av de övervakade kanalerna, t.ex.:

> `Köp AAPL @ 180 USD, stop loss 175, target 190`

Boten analyserar meddelandet, skickar webhook om signalen är giltig, och skriver en rad till `signals_log.csv`.

## CSV-loggens kolumner

| Kolumn | Beskrivning |
|--------|-------------|
| `timestamp` | UTC-tidsstämpel (ISO 8601) |
| `discord_guild_id` | Server-ID där meddelandet postades |
| `discord_channel_id` | Kanal-ID |
| `discord_author` | Avsändarens användarnamn |
| `discord_message_id` | Unikt meddelande-ID |
| `raw_message` | Originaltexten |
| `is_signal` | `True`/`False` från Claudes bedömning |
| `action` | `BUY` eller `SELL` |
| `ticker` | Tickersymbol (t.ex. `AAPL`) |
| `entry_price` | Ingångspris |
| `stop_loss` | Stop-loss-nivå |
| `take_profit` | Take-profit-nivå |
| `quantity` | Orderstorlek |
| `confidence` | Claudes förtroende (0.0-1.0) |
| `reason` | Claudes motivering |
| `webhook_sent` | Om webhook skickades till TradingView |
| `webhook_status` | HTTP-status eller felmeddelande |

## Konfigurationsparametrar

Alla inställningar läses från `.env`:

| Variabel | Krävs | Beskrivning |
|----------|-------|-------------|
| `DISCORD_BOT_TOKEN` | Ja | Token för Discord-boten |
| `DISCORD_CHANNEL_IDS` | Nej | Kommaseparerade kanal-ID:n. Tom = alla kanaler |
| `DISCORD_GUILD_IDS` | Nej | Kommaseparerade server-ID:n. Tom = alla servrar |
| `ANTHROPIC_API_KEY` | Ja | Nyckel till Claude API |
| `CLAUDE_MODEL` | Nej | Modell-ID (standard: `claude-sonnet-4-6`) |
| `TRADINGVIEW_WEBHOOK_URL` | Ja | Webhook-URL från TradingView |
| `TRADINGVIEW_WEBHOOK_SECRET` | Nej | Valfri hemlighet som skickas i payloaden |
| `LOG_FILE_PATH` | Nej | Sökväg till CSV-loggen (standard: `signals_log.csv`) |
| `LOG_LEVEL` | Nej | `DEBUG`, `INFO`, `WARNING`, `ERROR` |

## Tröskelvärden

I `bot.py` finns konstanten `MIN_CONFIDENCE_THRESHOLD = 0.6`. Signaler med ett lägre confidence-värde från Claude loggas men skickas inte till TradingView. Justera vid behov.

## Kör som Windows-tjänst (valfritt)

För att köra boten kontinuerligt kan du:

1. Skapa en `.bat`-fil som aktiverar venv och kör `python bot.py`.
2. Lägg till den i **Uppgiftsschemaläggaren** som startar vid inloggning.
3. Alternativt installera [NSSM](https://nssm.cc/) och registrera boten som en Windows-tjänst.

## Felsökning

**"DISCORD_BOT_TOKEN saknas i .env-filen"**
→ Kontrollera att `.env` ligger i samma mapp som `bot.py` och att variabeln är satt.

**Boten ansluter men ser inga meddelanden**
→ Aktivera **MESSAGE CONTENT INTENT** i Discord Developer Portal (steg 5.4).

**`ModuleNotFoundError: No module named 'discord'`**
→ Aktivera venv och kör `pip install -r requirements.txt` igen.

**`HTTP 401/403` från TradingView**
→ Dubbelkolla webhook-URL och att alerten fortfarande är aktiv.

**Claude returnerar konstiga svar**
→ Sänk/höj `CLAUDE_MODEL` eller justera systemprompten i `claude_analyzer.py`.

## Säkerhet

- `.env` är listad i `.gitignore` — committa aldrig din token eller API-nyckel.
- CSV-loggen kan innehålla handelsdata; hantera den enligt dina rutiner.
- Webhooks via HTTP är inte krypterade — använd alltid HTTPS-URL:er.

## Licens

Använd som du vill för privata syften. Ingen garanti för handelsutfall — allt sker på egen risk.
