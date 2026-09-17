#!/usr/bin/env python3
"""Tests that cost nothing to run.

    python test_pipeline.py

These never call the Claude API. A fake stands in for it, which means they
check *your wiring* - the agent loop, the tools, the report layout - rather
than checking Claude. Run them after you change anything; if they pass, a real
run will at least get off the ground.

(Also works under pytest if you prefer: `pytest test_pipeline.py`.)
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parent))

from research_agents.agent_editor import (  # noqa: E402
    Brief,
    KeyPoint,
    Quote,
    SourceRef,
    Theme,
    brief_to_markdown,
)
from research_agents.agent_scout import load_scout_result, run_scout  # noqa: E402
from research_agents.config import Settings  # noqa: E402
from research_agents.tools import Toolbox  # noqa: E402

SAMPLE_RAW = Path("research_agents/sample_data/demo_raw.json")


# --- a stand-in for the API -------------------------------------------------
def block(**kwargs) -> SimpleNamespace:
    return SimpleNamespace(**kwargs)


def fake_response(stop_reason: str, content: list) -> SimpleNamespace:
    return SimpleNamespace(
        stop_reason=stop_reason,
        stop_details=None,
        content=content,
        usage=SimpleNamespace(
            input_tokens=1000,
            output_tokens=200,
            cache_read_input_tokens=500,
            cache_creation_input_tokens=0,
            server_tool_use=SimpleNamespace(web_search_requests=1),
        ),
    )


class FakeLLM:
    """Replays a scripted list of responses and records what it was sent."""

    def __init__(self, responses: list):
        self.responses = list(responses)
        self.requests: list[dict] = []

    def send_message(self, **kwargs):
        self.requests.append(kwargs)
        if not self.responses:
            raise AssertionError("the agent asked for more turns than were scripted")
        return self.responses.pop(0)


def settings_for_test() -> Settings:
    settings = Settings.load()
    settings.anthropic_api_key = "test"
    settings.reddit_client_id = None  # keep the network out of these tests
    settings.reddit_client_secret = None
    settings.max_turns = 6
    return settings


# --- tests ------------------------------------------------------------------
def test_scout_runs_tools_then_finishes() -> None:
    """Turn 1 saves a finding, turn 2 pauses mid-search, turn 3 wraps up."""
    save_call = block(
        type="tool_use",
        id="call_1",
        name="save_finding",
        input={
            "claim": "People mostly alternate sitting and standing.",
            "evidence": "\"I stand about 2 hours a day now\" - 1.4k upvotes",
            "source_url": "https://www.reddit.com/r/ergonomics/comments/abc/",
            "source_type": "reddit",
            "source_label": "r/ergonomics, 1.4k upvotes",
            "sentiment": "mixed",
            "confidence": "high",
        },
    )
    llm = FakeLLM(
        [
            fake_response("tool_use", [block(type="text", text="Searching now."), save_call]),
            fake_response("pause_turn", [block(type="text", text="Still going.")]),
            fake_response("end_turn", [block(type="text", text="Handover: coverage was good.")]),
        ]
    )

    result = run_scout(llm, settings_for_test(), topic="standing desks", verbose=False)

    assert result.stopped_because == "finished", result.stopped_because
    assert len(result.findings) == 1, result.findings
    assert result.findings[0]["source_url"].startswith("https://")
    assert result.handover_summary == "Handover: coverage was good."
    assert result.turns_used == 3
    # Usage is accumulated across every turn, not just the last one.
    assert result.usage["input_tokens"] == 3000
    assert result.usage["web_search_requests"] == 3

    # The tool result must be a user message carrying the matching tool_use_id.
    tool_result_messages = [
        m
        for request in llm.requests
        for m in request["messages"]
        if m["role"] == "user" and isinstance(m["content"], list)
    ]
    assert tool_result_messages, "tool results were never sent back"
    first = tool_result_messages[0]["content"][0]
    assert first["type"] == "tool_result" and first["tool_use_id"] == "call_1"

    # A paused turn must be resumed WITHOUT injecting a "please continue" message.
    resumed = llm.requests[2]["messages"]
    assert resumed[-1]["role"] == "assistant", [m["role"] for m in resumed]
    print("ok  scout loop: tools, pause/resume, handover, usage totals")


def test_scout_stops_at_turn_limit() -> None:
    """A model that never stops asking for tools must still terminate."""
    settings = settings_for_test()
    settings.max_turns = 3
    endless = [
        fake_response(
            "tool_use",
            [
                block(
                    type="tool_use",
                    id=f"c{i}",
                    name="save_finding",
                    input={
                        "claim": f"point {i}",
                        "evidence": "e",
                        "source_url": "https://example.com/x",
                        "source_type": "other",
                        "source_label": "l",
                        "sentiment": "neutral",
                        "confidence": "low",
                    },
                )
            ],
        )
        for i in range(3)
    ]
    result = run_scout(FakeLLM(endless), settings, topic="t", verbose=False)
    assert result.turns_used == 3
    assert "3-turn limit" in result.stopped_because, result.stopped_because
    assert len(result.findings) == 3
    print("ok  scout stops at the turn limit instead of looping forever")


def test_scout_handles_refusal() -> None:
    refused = SimpleNamespace(
        stop_reason="refusal",
        stop_details=SimpleNamespace(category="cyber", explanation="Declined."),
        content=[],
        usage=SimpleNamespace(input_tokens=10, output_tokens=0),
    )
    result = run_scout(FakeLLM([refused]), settings_for_test(), topic="t", verbose=False)
    assert "declined" in result.stopped_because.lower(), result.stopped_because
    assert result.findings == []
    print("ok  a refusal ends the run with a readable reason")


def test_findings_need_a_real_url() -> None:
    toolbox = Toolbox(settings_for_test())
    good = {
        "claim": "c",
        "evidence": "e",
        "source_url": "https://example.com/a",
        "source_type": "news",
        "source_label": "l",
        "sentiment": "neutral",
        "confidence": "high",
    }
    assert toolbox.run("save_finding", good)[1] is False
    assert toolbox.run("save_finding", {**good, "source_url": "trust me"})[0].startswith("Rejected")
    assert toolbox.run("save_finding", {**good, "claim": ""})[0].startswith("Rejected")
    assert len(toolbox.findings) == 1, "only the valid finding should be kept"
    print("ok  findings without a usable source URL are rejected")


def test_reddit_tools_appear_only_with_credentials() -> None:
    off = Toolbox(settings_for_test())
    names = {t.get("name") for t in off.definitions()}
    assert "reddit_search_posts" not in names
    assert {"web_search", "web_fetch", "save_finding"} <= names

    settings = settings_for_test()
    settings.reddit_client_id, settings.reddit_client_secret = "id", "secret"
    on = {t.get("name") for t in Toolbox(settings).definitions()}
    assert "reddit_search_posts" in on and "reddit_read_comments" in on
    print("ok  Reddit tools switch on and off with the credentials")


def test_strict_tool_schemas_are_valid() -> None:
    settings = settings_for_test()
    settings.reddit_client_id, settings.reddit_client_secret = "id", "secret"
    for tool in Toolbox(settings).definitions():
        schema = tool.get("input_schema")
        if not schema:
            continue  # server-side tool, no schema of ours
        properties, required = set(schema["properties"]), set(schema["required"])
        assert properties == required, f"{tool['name']}: {properties ^ required}"
        assert schema["additionalProperties"] is False, tool["name"]
        for name, prop in schema["properties"].items():
            assert isinstance(prop["type"], str), f"{tool['name']}.{name}"
    print("ok  every tool schema satisfies strict mode")


def test_brief_renders_to_markdown() -> None:
    scout = load_scout_result(str(SAMPLE_RAW))
    brief = Brief(
        title="T",
        bottom_line="B",
        key_points=[
            KeyPoint(
                point="P",
                detail="D",
                support="S",
                confidence="high",
                sources=[SourceRef(label="r/x", url="https://example.com/1")],
            )
        ],
        themes=[Theme(name="N", summary="S", who_says_it="")],
        sentiment_overview="O",
        disagreements=["X vs Y"],
        notable_quotes=[
            Quote(text="Q", attribution="A", url="https://example.com/2", why_it_matters="W")
        ],
        gaps_and_caveats=["G"],
        next_questions=["N?"],
    )
    markdown = brief_to_markdown(brief, scout, settings_for_test())
    for heading in ("# T", "## Bottom line", "## Key points", "## Gaps and caveats",
                    "## All sources the scout used"):
        assert heading in markdown, heading
    # Sources the scout collected are all listed, deduplicated by URL.
    assert markdown.count("https://www.reddit.com/r/ergonomics/comments/sample1/") == 1
    print("ok  the brief renders with every section and its sources")


def test_sample_data_matches_the_real_shape() -> None:
    raw = json.loads(SAMPLE_RAW.read_text())
    assert {"topic", "findings", "handover_summary", "tool_calls"} <= set(raw)
    for finding in raw["findings"]:
        assert {"claim", "evidence", "source_url", "source_label"} <= set(finding)
    print("ok  bundled sample data matches what a real run writes")


def main() -> int:
    tests = [value for name, value in sorted(globals().items()) if name.startswith("test_")]
    failures = 0
    print(f"Running {len(tests)} tests (no API calls, no cost)\n")
    for test in tests:
        try:
            test()
        except AssertionError as exc:
            failures += 1
            print(f"FAIL  {test.__name__}: {exc}")
        except Exception as exc:  # noqa: BLE001
            failures += 1
            print(f"ERROR {test.__name__}: {type(exc).__name__}: {exc}")
    print()
    if failures:
        print(f"{failures} of {len(tests)} tests failed.")
        return 1
    print(f"All {len(tests)} tests passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
