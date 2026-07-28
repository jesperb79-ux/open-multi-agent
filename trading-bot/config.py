"""Konfigurationsmodul som läser inställningar från .env-filen."""

import os
from dataclasses import dataclass, field
from typing import List, Optional

from dotenv import load_dotenv

# Ladda miljövariabler från .env-filen i projektmappen
load_dotenv()


def _parse_id_list(value: Optional[str]) -> List[int]:
    """Konvertera en kommaseparerad sträng med ID:n till en lista av heltal."""
    if not value:
        return []
    # Dela upp på komma, trimma blanksteg och filtrera bort tomma poster
    return [int(item.strip()) for item in value.split(",") if item.strip()]


@dataclass
class Config:
    """Datastruktur som håller alla konfigurationsvärden för boten."""

    # Discord-relaterade inställningar
    discord_bot_token: str
    discord_channel_ids: List[int] = field(default_factory=list)
    discord_guild_ids: List[int] = field(default_factory=list)

    # Claude API-inställningar
    anthropic_api_key: str = ""
    claude_model: str = "claude-sonnet-4-6"

    # TradingView-inställningar
    tradingview_webhook_url: str = ""
    tradingview_webhook_secret: str = ""

    # Logginställningar
    log_file_path: str = "signals_log.csv"
    log_level: str = "INFO"

    @classmethod
    def from_env(cls) -> "Config":
        """Skapa en Config-instans genom att läsa alla värden från miljövariabler."""
        # Hämta obligatoriska värden och validera att de är satta
        discord_token = os.getenv("DISCORD_BOT_TOKEN", "").strip()
        anthropic_key = os.getenv("ANTHROPIC_API_KEY", "").strip()
        webhook_url = os.getenv("TRADINGVIEW_WEBHOOK_URL", "").strip()

        # Validera att de kritiska nycklarna finns innan boten startar
        if not discord_token:
            raise ValueError("DISCORD_BOT_TOKEN saknas i .env-filen")
        if not anthropic_key:
            raise ValueError("ANTHROPIC_API_KEY saknas i .env-filen")
        if not webhook_url:
            raise ValueError("TRADINGVIEW_WEBHOOK_URL saknas i .env-filen")

        return cls(
            discord_bot_token=discord_token,
            discord_channel_ids=_parse_id_list(os.getenv("DISCORD_CHANNEL_IDS")),
            discord_guild_ids=_parse_id_list(os.getenv("DISCORD_GUILD_IDS")),
            anthropic_api_key=anthropic_key,
            claude_model=os.getenv("CLAUDE_MODEL", "claude-sonnet-4-6").strip(),
            tradingview_webhook_url=webhook_url,
            tradingview_webhook_secret=os.getenv("TRADINGVIEW_WEBHOOK_SECRET", "").strip(),
            log_file_path=os.getenv("LOG_FILE_PATH", "signals_log.csv").strip(),
            log_level=os.getenv("LOG_LEVEL", "INFO").strip().upper(),
        )
