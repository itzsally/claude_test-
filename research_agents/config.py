"""Central configuration.

Everything tunable lives here so you only have one file to look at when you
want to change how the agents behave. Values come from environment variables
(usually loaded from a `.env` file), with sensible defaults.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
RUNS_DIR = PROJECT_ROOT / "runs"

# --- Models -----------------------------------------------------------------
# Claude Opus 5 is the default for both agents. If you want to spend less,
# set SCOUT_MODEL / EDITOR_MODEL in your .env (for example claude-sonnet-5
# or claude-haiku-4-5). See README "Controlling what this costs".
DEFAULT_MODEL = "claude-opus-5"


def _load_dotenv(path: Path = PROJECT_ROOT / ".env") -> None:
    """Minimal .env loader so you don't need an extra dependency.

    Lines look like KEY=value. Existing environment variables always win, so
    `EDITOR_MODEL=... python run.py ...` overrides the file.
    """
    if not path.exists():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


def _env_int(name: str, default: int) -> int:
    try:
        return int(os.environ.get(name, "").strip() or default)
    except ValueError:
        return default


def _env_bool(name: str, default: bool) -> bool:
    raw = os.environ.get(name, "").strip().lower()
    if not raw:
        return default
    return raw in {"1", "true", "yes", "on"}


@dataclass
class Settings:
    """Resolved settings for one run."""

    anthropic_api_key: str | None = None

    scout_model: str = DEFAULT_MODEL
    editor_model: str = DEFAULT_MODEL
    effort: str = "high"  # low | medium | high | xhigh | max

    # How hard the researcher works before it must stop and hand over.
    max_turns: int = 14
    max_pause_restarts: int = 4
    max_tokens: int = 16000

    # Reddit (optional but strongly recommended - it is the only way to get
    # real comment threads and vote counts).
    reddit_client_id: str | None = None
    reddit_client_secret: str | None = None
    reddit_user_agent: str = "python:two-agent-research:0.1 (by /u/unknown)"

    # Ask the API to route around a safety refusal instead of returning one.
    enable_refusal_fallback: bool = True

    extra_notes: list[str] = field(default_factory=list)

    @property
    def reddit_enabled(self) -> bool:
        return bool(self.reddit_client_id and self.reddit_client_secret)

    @classmethod
    def load(cls) -> "Settings":
        _load_dotenv()
        return cls(
            anthropic_api_key=os.environ.get("ANTHROPIC_API_KEY") or None,
            scout_model=os.environ.get("SCOUT_MODEL", "").strip() or DEFAULT_MODEL,
            editor_model=os.environ.get("EDITOR_MODEL", "").strip() or DEFAULT_MODEL,
            effort=os.environ.get("EFFORT", "").strip() or "high",
            max_turns=_env_int("MAX_TURNS", 14),
            max_pause_restarts=_env_int("MAX_PAUSE_RESTARTS", 4),
            max_tokens=_env_int("MAX_TOKENS", 16000),
            reddit_client_id=os.environ.get("REDDIT_CLIENT_ID") or None,
            reddit_client_secret=os.environ.get("REDDIT_CLIENT_SECRET") or None,
            reddit_user_agent=(
                os.environ.get("REDDIT_USER_AGENT", "").strip()
                or "python:two-agent-research:0.1 (by /u/unknown)"
            ),
            enable_refusal_fallback=_env_bool("ENABLE_REFUSAL_FALLBACK", True),
        )
