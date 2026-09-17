#!/usr/bin/env python3
"""Command line entry point.

    python run.py "is the Framework laptop worth it in 2026?"

Run `python run.py --help` for everything else, or `python run.py --self-check`
if you just want to know whether your setup is correct.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from research_agents.config import Settings
from research_agents.pipeline import (
    preview_request,
    refine_only,
    run_pipeline,
    self_check,
)

EXAMPLES = """
examples:
  python run.py --self-check
      Check your API keys and settings without spending anything.

  python run.py "what do people actually think of the Rabbit R1?"
      The normal case: research the topic, then write the brief.

  python run.py "best budget espresso machine" --subreddit espresso --subreddit coffee
      Point the scout at specific communities.

  python run.py "GLP-1 side effects people report" --audience "a pharmacist"
      Tune who the brief is written for.

  python run.py --from-raw runs/20260917-.../raw.json
      Re-write the brief from research you already paid for (cheap, fast).

  python run.py "topic" --scout-only
      Gather only. Useful when you want to inspect raw findings first.
"""


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="run.py",
        description="Research a topic with one agent, then have a second agent write it up.",
        epilog=EXAMPLES,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("topic", nargs="?", help="What to research, in plain words.")
    parser.add_argument(
        "--subreddit",
        action="append",
        default=[],
        metavar="NAME",
        help="Focus on this subreddit (repeatable), e.g. --subreddit buildapc",
    )
    parser.add_argument(
        "--guidance",
        help="Extra instructions for the researcher, e.g. 'focus on the last 3 months'.",
    )
    parser.add_argument(
        "--audience",
        help="Who the brief is for, e.g. 'a non-technical manager'.",
    )
    parser.add_argument(
        "--turns",
        type=int,
        help="Max research turns (default 14). Higher = deeper, slower, pricier.",
    )
    parser.add_argument(
        "--effort",
        choices=["low", "medium", "high", "xhigh", "max"],
        help="How hard the models think. Default high.",
    )
    parser.add_argument("--out", type=Path, help="Write results to this folder.")
    parser.add_argument(
        "--scout-only",
        action="store_true",
        help="Run agent 1 only and stop.",
    )
    parser.add_argument(
        "--from-raw",
        type=Path,
        metavar="RAW_JSON",
        help="Skip agent 1; re-run agent 2 on a saved raw.json.",
    )
    parser.add_argument(
        "--self-check",
        action="store_true",
        help="Report what is configured and what is missing, then exit.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be sent to the API without calling it.",
    )
    parser.add_argument("--quiet", action="store_true", help="Less output.")
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    settings = Settings.load()

    if args.turns:
        settings.max_turns = args.turns
    if args.effort:
        settings.effort = args.effort

    verbose = not args.quiet

    if args.self_check:
        return 0 if self_check(settings) else 1

    if args.dry_run:
        if not args.topic:
            parser.error("--dry-run needs a topic")
        print(json.dumps(preview_request(args.topic, settings), indent=2))
        return 0

    if args.from_raw:
        if not args.from_raw.exists():
            print(f"No such file: {args.from_raw}", file=sys.stderr)
            return 1
        if not settings.anthropic_api_key:
            print(
                "ANTHROPIC_API_KEY is not set. Run `python run.py --self-check` "
                "for setup help.",
                file=sys.stderr,
            )
            return 1
        refine_only(
            args.from_raw,
            settings,
            audience=args.audience,
            out_dir=args.out,
            verbose=verbose,
        )
        return 0

    if not args.topic:
        parser.print_help()
        return 1

    if not settings.anthropic_api_key:
        print(
            "ANTHROPIC_API_KEY is not set. Run `python run.py --self-check` for "
            "setup help.",
            file=sys.stderr,
        )
        return 1

    run_pipeline(
        topic=args.topic,
        settings=settings,
        guidance=args.guidance,
        subreddits=args.subreddit,
        audience=args.audience,
        out_dir=args.out,
        scout_only=args.scout_only,
        verbose=verbose,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
