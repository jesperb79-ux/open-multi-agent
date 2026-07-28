"""Modul som använder Claude API för att tolka om ett meddelande är en handelssignal."""

import json
import logging
from dataclasses import dataclass, asdict
from typing import Optional

from anthropic import AsyncAnthropic

logger = logging.getLogger(__name__)


# Systemprompt som instruerar Claude att agera som en strikt signalklassificerare
SYSTEM_PROMPT = """Du är en expert på att tolka handelssignaler från chattmeddelanden.
Din uppgift är att avgöra om ett meddelande innehåller en giltig handelssignal och
extrahera strukturerad data. Du svarar ENDAST med giltig JSON, aldrig med förklarande text.

Returnera ett JSON-objekt med följande fält:
{
  "is_signal": boolean,          // true om meddelandet är en handelssignal
  "action": "BUY" | "SELL" | null, // köp eller sälj
  "ticker": string | null,        // tickersymbol, t.ex. "AAPL", "BTCUSD"
  "entry_price": number | null,   // ingångspris om angivet
  "stop_loss": number | null,     // stop-loss-nivå om angiven
  "take_profit": number | null,   // take-profit-nivå om angiven
  "quantity": number | null,      // antal/storlek om angivet
  "confidence": number,           // ditt förtroende 0.0-1.0
  "reason": string                // kort förklaring på svenska
}

Sätt is_signal till true ENDAST om meddelandet tydligt beskriver en handel med minst
en tickersymbol och en riktning (köp/sälj). Vanlig chitchat, analys utan action,
eller frågor ska returnera is_signal: false."""


@dataclass
class TradeSignal:
    """Strukturerad handelssignal som extraherats av Claude."""

    is_signal: bool
    action: Optional[str] = None  # "BUY" eller "SELL"
    ticker: Optional[str] = None
    entry_price: Optional[float] = None
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    quantity: Optional[float] = None
    confidence: float = 0.0
    reason: str = ""

    def to_dict(self) -> dict:
        """Konvertera signalen till en dictionary för JSON-serialisering."""
        return asdict(self)


class ClaudeAnalyzer:
    """Klient som anropar Claude API för att tolka Discord-meddelanden som signaler."""

    def __init__(self, api_key: str, model: str = "claude-sonnet-4-6"):
        # Skapa en asynkron Anthropic-klient som kan användas i Discord-eventloopen
        self._client = AsyncAnthropic(api_key=api_key)
        self._model = model

    async def analyze(self, message_text: str) -> TradeSignal:
        """Skicka meddelandetexten till Claude och returnera en tolkad TradeSignal."""
        # Bygg användarens meddelande med tydlig instruktion om JSON-svar
        user_content = (
            f"Analysera följande meddelande och avgör om det är en handelssignal.\n\n"
            f"Meddelande:\n\"\"\"\n{message_text}\n\"\"\"\n\n"
            f"Svara med ENDAST ett JSON-objekt enligt det specificerade schemat."
        )

        try:
            # Anropa Claude med låg temperatur för konsekvent klassificering
            response = await self._client.messages.create(
                model=self._model,
                max_tokens=512,
                temperature=0.0,
                system=SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_content}],
            )
        except Exception as exc:
            # Vid API-fel loggar vi och returnerar en icke-signal istället för att krascha
            logger.error("Claude API-anrop misslyckades: %s", exc)
            return TradeSignal(is_signal=False, reason=f"API-fel: {exc}")

        # Plocka ut textinnehållet från svaret (Claude returnerar en lista av content blocks)
        raw_text = ""
        for block in response.content:
            if getattr(block, "type", None) == "text":
                raw_text += block.text

        # Försök att parsa JSON-svaret och fall tillbaka på en icke-signal om det misslyckas
        signal = _parse_signal_json(raw_text)
        logger.debug("Claude-svar: %s", raw_text)
        return signal


def _parse_signal_json(raw_text: str) -> TradeSignal:
    """Parsa en JSON-sträng från Claude till en TradeSignal, tolerant mot omgivande text."""
    # Trimma och hitta första respektive sista måsvinge för att isolera JSON
    cleaned = raw_text.strip()
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start == -1 or end == -1 or end <= start:
        logger.warning("Inget JSON-objekt hittades i Claude-svaret: %r", raw_text)
        return TradeSignal(is_signal=False, reason="Kunde inte tolka svaret från Claude")

    json_fragment = cleaned[start : end + 1]
    try:
        data = json.loads(json_fragment)
    except json.JSONDecodeError as exc:
        logger.warning("JSON-parsning misslyckades: %s. Råtext: %r", exc, raw_text)
        return TradeSignal(is_signal=False, reason="Ogiltigt JSON-format från Claude")

    # Mappa fälten säkert med standardvärden för saknade nycklar
    return TradeSignal(
        is_signal=bool(data.get("is_signal", False)),
        action=_normalize_action(data.get("action")),
        ticker=_normalize_ticker(data.get("ticker")),
        entry_price=_safe_float(data.get("entry_price")),
        stop_loss=_safe_float(data.get("stop_loss")),
        take_profit=_safe_float(data.get("take_profit")),
        quantity=_safe_float(data.get("quantity")),
        confidence=_safe_float(data.get("confidence")) or 0.0,
        reason=str(data.get("reason", "")),
    )


def _normalize_action(value) -> Optional[str]:
    """Normalisera action-fältet till antingen 'BUY', 'SELL' eller None."""
    if not value:
        return None
    upper = str(value).strip().upper()
    if upper in {"BUY", "LONG"}:
        return "BUY"
    if upper in {"SELL", "SHORT"}:
        return "SELL"
    return None


def _normalize_ticker(value) -> Optional[str]:
    """Normalisera tickersymbolen till versaler och trimma blanksteg."""
    if not value:
        return None
    return str(value).strip().upper() or None


def _safe_float(value) -> Optional[float]:
    """Konvertera ett värde till float, returnera None om det inte är ett giltigt tal."""
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None
