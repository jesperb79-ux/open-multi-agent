"""Modul för att logga signaler och webhook-resultat till en CSV-fil."""

import csv
import logging
import os
from asyncio import Lock
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from claude_analyzer import TradeSignal

logger = logging.getLogger(__name__)


# Kolumnrubriker för CSV-filen - dessa skrivs första gången filen skapas
CSV_FIELDNAMES = [
    "timestamp",           # ISO 8601-tidsstämpel i UTC
    "discord_guild_id",    # Server-ID där meddelandet postades
    "discord_channel_id",  # Kanal-ID där meddelandet postades
    "discord_author",      # Användarnamn på avsändaren
    "discord_message_id",  # Unikt meddelande-ID från Discord
    "raw_message",         # Originaltexten från Discord-meddelandet
    "is_signal",           # Om Claude bedömde det som en signal
    "action",              # BUY eller SELL
    "ticker",              # Tickersymbol
    "entry_price",         # Ingångspris
    "stop_loss",           # Stop-loss-nivå
    "take_profit",         # Take-profit-nivå
    "quantity",            # Orderstorlek
    "confidence",          # Claudes förtroende (0.0-1.0)
    "reason",              # Claudes motivering
    "webhook_sent",        # Om webhooken skickades
    "webhook_status",      # HTTP-status eller felmeddelande
]


class SignalLogger:
    """Trådsäker CSV-logger för handelssignaler och deras resultat."""

    def __init__(self, file_path: str):
        # Konvertera till Path för att enklare hantera katalogskapande
        self._file_path = Path(file_path)
        # Ett async-lås säkerställer att samtidiga skrivningar inte krockar
        self._lock = Lock()
        # Skapa filen med rubrikrad om den inte redan finns
        self._ensure_file_exists()

    def _ensure_file_exists(self) -> None:
        """Skapa CSV-filen och skriv rubrikraden om filen saknas."""
        # Säkerställ att föräldrakatalogen finns innan vi skriver
        parent = self._file_path.parent
        if parent and not parent.exists():
            parent.mkdir(parents=True, exist_ok=True)

        # Om filen inte finns, skapa den med rubrikraden
        if not self._file_path.exists():
            with self._file_path.open("w", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=CSV_FIELDNAMES)
                writer.writeheader()
            logger.info("Skapade ny CSV-loggfil: %s", self._file_path)

    async def log_signal(
        self,
        *,
        raw_message: str,
        signal: TradeSignal,
        discord_guild_id: Optional[int],
        discord_channel_id: int,
        discord_author: str,
        discord_message_id: int,
        webhook_sent: bool,
        webhook_status: str,
    ) -> None:
        """Skriv en rad till CSV-filen för en analyserad signal och dess webhook-resultat."""
        # Bygg raden enligt CSV-kolumnernas ordning
        row = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "discord_guild_id": discord_guild_id if discord_guild_id is not None else "",
            "discord_channel_id": discord_channel_id,
            "discord_author": discord_author,
            "discord_message_id": discord_message_id,
            # Ersätt radbrytningar i originaltexten så CSV-formatet förblir konsistent
            "raw_message": raw_message.replace("\n", " \\n ").replace("\r", ""),
            "is_signal": signal.is_signal,
            "action": signal.action or "",
            "ticker": signal.ticker or "",
            "entry_price": signal.entry_price if signal.entry_price is not None else "",
            "stop_loss": signal.stop_loss if signal.stop_loss is not None else "",
            "take_profit": signal.take_profit if signal.take_profit is not None else "",
            "quantity": signal.quantity if signal.quantity is not None else "",
            "confidence": signal.confidence,
            "reason": signal.reason,
            "webhook_sent": webhook_sent,
            "webhook_status": webhook_status,
        }

        # Använd låset för att serialisera skrivningar från samtidiga event handlers
        async with self._lock:
            try:
                with self._file_path.open("a", newline="", encoding="utf-8") as f:
                    writer = csv.DictWriter(f, fieldnames=CSV_FIELDNAMES)
                    writer.writerow(row)
            except OSError as exc:
                # Logga I/O-fel men svälj dem - vi vill inte krascha botens eventloop
                logger.error("Kunde inte skriva till CSV-loggen: %s", exc)
