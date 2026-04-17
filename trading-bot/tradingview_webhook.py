"""Modul som skickar handelssignaler till TradingView via webhook för paper trading."""

import logging
from typing import Optional

import httpx

from claude_analyzer import TradeSignal

logger = logging.getLogger(__name__)


class TradingViewWebhookClient:
    """Klient som formaterar och skickar webhook-anrop till TradingView."""

    def __init__(
        self,
        webhook_url: str,
        webhook_secret: str = "",
        timeout_seconds: float = 10.0,
    ):
        # Spara inställningar och skapa en återanvändbar async HTTP-klient
        self._webhook_url = webhook_url
        self._webhook_secret = webhook_secret
        self._client = httpx.AsyncClient(timeout=timeout_seconds)

    async def close(self) -> None:
        """Stäng den underliggande HTTP-klienten vid nedstängning."""
        await self._client.aclose()

    async def send_signal(self, signal: TradeSignal) -> tuple[bool, str]:
        """Skicka en TradeSignal som webhook till TradingView.

        Returnerar en tupel (lyckades, status_text) där status_text är HTTP-status
        eller ett felmeddelande för CSV-loggning.
        """
        # Bygg payload-strukturen som TradingView förväntar sig för paper trading
        payload = {
            "action": signal.action,           # "BUY" eller "SELL"
            "ticker": signal.ticker,           # Tickersymbol
            "price": signal.entry_price,       # Ingångspris (None = market order)
            "stop_loss": signal.stop_loss,     # Stop-loss-nivå
            "take_profit": signal.take_profit, # Take-profit-nivå
            "quantity": signal.quantity,       # Storlek på position
            "strategy": "discord-paper-trade", # Identifierare för strategin
        }

        # Inkludera den valfria hemligheten om användaren konfigurerat en
        if self._webhook_secret:
            payload["secret"] = self._webhook_secret

        try:
            # Skicka POST-anropet med JSON-payload
            response = await self._client.post(self._webhook_url, json=payload)
        except httpx.RequestError as exc:
            # Nätverksfel eller timeout - logga och returnera misslyckande
            error_msg = f"Webhook-anrop misslyckades: {exc}"
            logger.error(error_msg)
            return False, error_msg

        # Kontrollera HTTP-statuskoden - 2xx räknas som lyckat
        if 200 <= response.status_code < 300:
            status_text = f"HTTP {response.status_code}"
            logger.info("Webhook skickad framgångsrikt: %s", status_text)
            return True, status_text

        # Icke-2xx svar loggas som fel med responskroppen för felsökning
        error_msg = f"HTTP {response.status_code}: {response.text[:200]}"
        logger.warning("Webhook svarade med fel: %s", error_msg)
        return False, error_msg
