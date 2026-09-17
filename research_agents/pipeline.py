"""Wires the two agents together and writes the output files."""

from __future__ import annotations

import json
import re
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .agent_editor import Brief, brief_to_json, brief_to_markdown, run_editor
from .agent_scout import ScoutResult, run_scout
from .config import RUNS_DIR, Settings
from .llm import LLM

# Rough per-million-token prices, only used for the cost estimate printed at
# the end. Update these if pricing changes - they do not affect behaviour.
PRICES: dict[str, tuple[float, float]] = {
    "claude-opus-5": (5.0, 25.0),
    "claude-opus-4-8": (5.0, 25.0),
    "claude-sonnet-5": (2.0, 10.0),
    "claude-haiku-4-5": (1.0, 5.0),
    "claude-fable-5-1": (10.0, 50.0),
}


def slugify(text: str, max_length: int = 48) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return (slug[:max_length].rstrip("-")) or "topic"


def estimate_cost(model: str, usage: dict[str, int]) -> float | None:
    """Very rough dollar estimate. Cached reads are cheaper; this ignores that."""
    price = PRICES.get(model)
    if not price:
        return None
    input_price, output_price = price
    input_tokens = usage.get("input_tokens", 0) + usage.get("cache_read_input_tokens", 0)
    output_tokens = usage.get("output_tokens", 0)
    return (input_tokens / 1_000_000 * input_price) + (
        output_tokens / 1_000_000 * output_price
    )


@dataclass
class RunOutput:
    directory: Path
    raw_path: Path
    brief_markdown_path: Path
    brief_json_path: Path
    scout: ScoutResult
    brief: Brief | None
    seconds: float


def write_scout_output(result: ScoutResult, directory: Path) -> Path:
    directory.mkdir(parents=True, exist_ok=True)
    raw_path = directory / "raw.json"
    raw_path.write_text(
        json.dumps(result.to_dict(), indent=2, ensure_ascii=False), encoding="utf-8"
    )
    return raw_path


def run_pipeline(
    topic: str,
    settings: Settings,
    guidance: str | None = None,
    subreddits: list[str] | None = None,
    audience: str | None = None,
    out_dir: Path | None = None,
    scout_only: bool = False,
    verbose: bool = True,
) -> RunOutput:
    """Agent 1, then agent 2, then write the files."""
    started = time.time()
    llm = LLM(settings)

    directory = out_dir or (RUNS_DIR / f"{time.strftime('%Y%m%d-%H%M%S')}-{slugify(topic)}")
    directory.mkdir(parents=True, exist_ok=True)

    if verbose:
        print(f"=== Agent 1: scout ({settings.scout_model}) ===")
        print(f"Topic: {topic}")
        if not settings.reddit_enabled:
            print(
                "[note] no Reddit credentials found - falling back to web search only. "
                "See the README to switch the Reddit tools on; they are worth it."
            )

    scout_result = run_scout(
        llm,
        settings,
        topic=topic,
        guidance=guidance,
        subreddits=subreddits,
        verbose=verbose,
    )
    raw_path = write_scout_output(scout_result, directory)

    brief: Brief | None = None
    brief_md_path = directory / "brief.md"
    brief_json_path = directory / "brief.json"

    if scout_only:
        if verbose:
            print(f"\nStopping after agent 1 as requested. Raw findings: {raw_path}")
    elif not scout_result.findings:
        if verbose:
            print(
                "\n[warn] the scout saved no findings, so there is nothing to refine. "
                f"Reason it stopped: {scout_result.stopped_because}"
            )
    else:
        if verbose:
            print(f"\n=== Agent 2: editor ({settings.editor_model}) ===")
        brief = run_editor(llm, settings, scout_result, audience=audience, verbose=verbose)
        brief_md_path.write_text(
            brief_to_markdown(brief, scout_result, settings), encoding="utf-8"
        )
        brief_json_path.write_text(brief_to_json(brief), encoding="utf-8")

    seconds = time.time() - started
    if verbose:
        _print_summary(scout_result, brief, directory, settings, seconds)

    return RunOutput(
        directory=directory,
        raw_path=raw_path,
        brief_markdown_path=brief_md_path,
        brief_json_path=brief_json_path,
        scout=scout_result,
        brief=brief,
        seconds=seconds,
    )


def refine_only(
    raw_path: Path,
    settings: Settings,
    audience: str | None = None,
    out_dir: Path | None = None,
    verbose: bool = True,
) -> RunOutput:
    """Re-run only agent 2 against findings saved by an earlier run.

    Handy while you are tuning the editor's prompt: the expensive research is
    already done, so each iteration is one cheap call.
    """
    from .agent_scout import load_scout_result

    started = time.time()
    scout_result = load_scout_result(str(raw_path))
    directory = out_dir or raw_path.parent
    directory.mkdir(parents=True, exist_ok=True)

    llm = LLM(settings)
    if verbose:
        print(f"=== Agent 2 only: editor ({settings.editor_model}) ===")
        print(f"Reading {len(scout_result.findings)} findings from {raw_path}")

    brief = run_editor(llm, settings, scout_result, audience=audience, verbose=verbose)
    brief_md_path = directory / "brief.md"
    brief_json_path = directory / "brief.json"
    brief_md_path.write_text(
        brief_to_markdown(brief, scout_result, settings), encoding="utf-8"
    )
    brief_json_path.write_text(brief_to_json(brief), encoding="utf-8")

    seconds = time.time() - started
    if verbose:
        print(f"\nWrote {brief_md_path} in {seconds:.1f}s")

    return RunOutput(
        directory=directory,
        raw_path=raw_path,
        brief_markdown_path=brief_md_path,
        brief_json_path=brief_json_path,
        scout=scout_result,
        brief=brief,
        seconds=seconds,
    )


def _print_summary(
    scout: ScoutResult,
    brief: Brief | None,
    directory: Path,
    settings: Settings,
    seconds: float,
) -> None:
    usage = scout.usage
    print("\n=== Done ===")
    print(f"Time: {seconds:.1f}s over {scout.turns_used} research turns")
    print(f"Findings: {len(scout.findings)}  |  tool calls: {len(scout.tool_calls)}")
    if usage:
        print(
            "Tokens (scout): "
            f"{usage.get('input_tokens', 0):,} in / "
            f"{usage.get('output_tokens', 0):,} out / "
            f"{usage.get('cache_read_input_tokens', 0):,} read from cache"
        )
        if usage.get("web_search_requests"):
            print(f"Web searches: {usage['web_search_requests']}")
        cost = estimate_cost(settings.scout_model, usage)
        if cost is not None:
            print(
                f"Rough scout cost: ${cost:.2f} "
                "(editor adds a fraction of this; estimate only)"
            )
    print(f"\nOutput folder: {directory}")
    if brief is not None:
        print(f"  brief.md    <- read this one")
        print(f"  brief.json  <- same content, machine readable")
    print(f"  raw.json    <- everything agent 1 collected")


def self_check(settings: Settings) -> bool:
    """Tell the user exactly what is configured and what is missing."""
    ok = True
    print("Configuration check")
    print("-" * 52)

    if settings.anthropic_api_key:
        key = settings.anthropic_api_key
        print(f"  Anthropic API key   : found ({key[:8]}...{key[-4:]})")
    else:
        print("  Anthropic API key   : MISSING - this is required.")
        print("      Get one at https://console.anthropic.com/settings/keys")
        print("      then put ANTHROPIC_API_KEY=sk-ant-... in your .env file.")
        ok = False

    if settings.reddit_enabled:
        print("  Reddit API          : configured (full Reddit tools enabled)")
    else:
        print("  Reddit API          : not configured (optional)")
        print("      Without it the scout still works, but only through web search.")
        print("      See README step 4 to switch it on - it takes two minutes.")

    print(f"  Scout model         : {settings.scout_model}")
    print(f"  Editor model        : {settings.editor_model}")
    print(f"  Effort              : {settings.effort}")
    print(f"  Max research turns  : {settings.max_turns}")
    print(f"  Refusal fallback    : {'on' if settings.enable_refusal_fallback else 'off'}")

    try:
        import anthropic

        print(f"  anthropic package   : {anthropic.__version__}")
    except Exception as exc:  # noqa: BLE001
        print(f"  anthropic package   : MISSING ({exc}) - run: pip install -r requirements.txt")
        ok = False
    try:
        import requests

        print(f"  requests package    : {requests.__version__}")
    except Exception as exc:  # noqa: BLE001
        print(f"  requests package    : MISSING ({exc}) - run: pip install -r requirements.txt")
        ok = False

    print("-" * 52)
    print("Ready to run." if ok else "Fix the items marked MISSING, then try again.")
    return ok


def preview_request(topic: str, settings: Settings) -> dict[str, Any]:
    """Build what would be sent to the API, without sending it (a dry run)."""
    from .agent_scout import SYSTEM_PROMPT, _build_task_message
    from .tools import Toolbox

    toolbox = Toolbox(settings)
    return {
        "model": settings.scout_model,
        "max_tokens": settings.max_tokens,
        "effort": settings.effort,
        "system_prompt_chars": len(SYSTEM_PROMPT),
        "tools": [t.get("name") for t in toolbox.definitions()],
        "reddit_tools_enabled": settings.reddit_enabled,
        "first_user_message": _build_task_message(topic, None, []),
    }
