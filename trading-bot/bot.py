"""Huvudfil för Discord-boten som tolkar handelssignaler via Claude och skickar till TradingView."""

import asyncio
import logging
import sys
from typing import Optional

import discord

from config import Config
from claude_analyzer import ClaudeAnalyzer, TradeSignal
from signal_logger import SignalLogger
from tradingview_webhook import TradingViewWebhookClient


# Minsta förtroendenivå från Claude för att vi ska skicka en webhook
MIN_CONFIDENCE_THRESHOLD = 0.6


def _configure_logging(level_name: str) -> None:
    """Konfigurera rotloggern med tidsstämpel och modulnamn."""
    level = getattr(logging, level_name.upper(), logging.INFO)
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )


class TradingBot(discord.Client):
    """Discord-klient som lyssnar på meddelanden och vidarebefordrar signaler till TradingView."""

    def __init__(
        self,
        config: Config,
        analyzer: ClaudeAnalyzer,
        webhook_client: TradingViewWebhookClient,
        signal_logger: SignalLogger,
        **kwargs,
    ):
        # Initiera discord.Client med nödvändiga intents för att läsa meddelanden
        super().__init__(**kwargs)
        self._config = config
        self._analyzer = analyzer
        self._webhook_client = webhook_client
        self._signal_logger = signal_logger
        self._log = logging.getLogger("trading-bot")

    async def on_ready(self) -> None:
        """Anropas när boten har anslutit till Discord och är klar att ta emot events."""
        self._log.info("Inloggad som %s (ID: %s)", self.user, self.user.id if self.user else "?")
        self._log.info(
            "Lyssnar på %d kanal(er) och %d server(ar)",
            len(self._config.discord_channel_ids),
            len(self._config.discord_guild_ids),
        )

    async def on_message(self, message: discord.Message) -> None:
        """Anropas för varje nytt meddelande som boten kan se."""
        # Ignorera meddelanden från boten själv för att undvika loopar
        if message.author.id == (self.user.id if self.user else 0):
            return

        # Ignorera meddelanden från andra bottar (valfri policy)
        if message.author.bot:
            return

        # Filtrera på server-ID om användaren konfigurerat en vitlista
        if self._config.discord_guild_ids:
            guild_id = message.guild.id if message.guild else None
            if guild_id not in self._config.discord_guild_ids:
                return

        # Filtrera på kanal-ID om användaren konfigurerat en vitlista
        if self._config.discord_channel_ids:
            if message.channel.id not in self._config.discord_channel_ids:
                return

        # Hoppa över meddelanden utan textinnehåll (t.ex. bara bilagor)
        content = message.content.strip()
        if not content:
            return

        self._log.info(
            "Mottog meddelande från %s i kanal %s: %.100s",
            message.author, message.channel.id, content,
        )

        # Kör analys och eventuell webhook i bakgrunden så att eventloopen inte blockeras
        asyncio.create_task(self._process_message(message, content))

    async def _process_message(self, message: discord.Message, content: str) -> None:
        """Analysera meddelandet med Claude och skicka webhook om det är en giltig signal."""
        # Steg 1: Be Claude tolka om detta är en handelssignal
        signal = await self._analyzer.analyze(content)

        # Steg 2: Avgör om signalen uppfyller kraven för att skickas vidare
        should_send, reason = self._should_forward(signal)

        webhook_sent = False
        webhook_status = reason

        if should_send:
            # Steg 3: Skicka webhook till TradingView för paper trading
            webhook_sent, webhook_status = await self._webhook_client.send_signal(signal)
            self._log.info(
                "Signal skickad: %s %s (status: %s)",
                signal.action, signal.ticker, webhook_status,
            )
        else:
            self._log.debug("Skippar webhook: %s", reason)

        # Steg 4: Logga allt till CSV oavsett om webhooken skickades eller inte
        await self._signal_logger.log_signal(
            raw_message=content,
            signal=signal,
            discord_guild_id=message.guild.id if message.guild else None,
            discord_channel_id=message.channel.id,
            discord_author=str(message.author),
            discord_message_id=message.id,
            webhook_sent=webhook_sent,
            webhook_status=webhook_status,
        )

    def _should_forward(self, signal: TradeSignal) -> tuple[bool, str]:
        """Kontrollera om en signal uppfyller villkoren för att skickas till TradingView."""
        # Krav 1: Claude måste ha klassificerat det som en signal
        if not signal.is_signal:
            return False, "Inte en handelssignal enligt Claude"

        # Krav 2: Action måste vara BUY eller SELL
        if signal.action not in {"BUY", "SELL"}:
            return False, f"Ogiltig action: {signal.action}"

        # Krav 3: Ticker måste vara angiven
        if not signal.ticker:
            return False, "Tickersymbol saknas"

        # Krav 4: Förtroendet måste överstiga tröskelvärdet
        if signal.confidence < MIN_CONFIDENCE_THRESHOLD:
            return False, f"Förtroende för lågt: {signal.confidence:.2f}"

        return True, "Giltig signal"


async def main() -> None:
    """Startpunkt som läser konfiguration och kör Discord-klienten tills avbrott."""
    # Läs konfiguration från .env-filen
    try:
        config = Config.from_env()
    except ValueError as exc:
        print(f"Konfigurationsfel: {exc}", file=sys.stderr)
        sys.exit(1)

    # Konfigurera loggning enligt användarens inställning
    _configure_logging(config.log_level)
    log = logging.getLogger("trading-bot")
    log.info("Startar trading-bot...")

    # Initiera hjälpklasserna - analyzer, webhook-klient och CSV-logger
    analyzer = ClaudeAnalyzer(api_key=config.anthropic_api_key, model=config.claude_model)
    webhook_client = TradingViewWebhookClient(
        webhook_url=config.tradingview_webhook_url,
        webhook_secret=config.tradingview_webhook_secret,
    )
    signal_logger = SignalLogger(file_path=config.log_file_path)

    # Aktivera de intents som behövs för att läsa meddelandeinnehåll i servrar
    # OBS: "Message Content Intent" måste också aktiveras i Discord Developer Portal
    intents = discord.Intents.default()
    intents.message_content = True
    intents.guilds = True
    intents.messages = True

    # Skapa Discord-klienten och koppla in våra hjälpklasser
    client = TradingBot(
        config=config,
        analyzer=analyzer,
        webhook_client=webhook_client,
        signal_logger=signal_logger,
        intents=intents,
    )

    try:
        # Kör boten tills processen avbryts (CTRL+C)
        await client.start(config.discord_bot_token)
    except KeyboardInterrupt:
        log.info("Avbrott från användare, stänger ner...")
    finally:
        # Stäng Discord-anslutningen och HTTP-klienten rent
        if not client.is_closed():
            await client.close()
        await webhook_client.close()
        log.info("Trading-bot avslutad.")


if __name__ == "__main__":
    # Kör asyncio-eventloopen. På Windows fungerar standardpolicyn med discord.py >=2.
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        # Tyst exit vid CTRL+C - huvudloopen loggar redan
        pass
