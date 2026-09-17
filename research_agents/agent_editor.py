"""Agent 2 - the Editor (refine and lay out).

Agent 1 produces a pile of findings. This agent turns that pile into something
a human wants to read. It has no tools and does not touch the internet: it only
sees what agent 1 collected, which is deliberate - it cannot invent a source it
was never given.

The trick here is *structured output*. Instead of asking for "a nice summary"
and hoping, we hand Claude an exact shape (the Pydantic models below) and the
API guarantees the response matches it. Then plain Python renders the markdown,
so the layout is identical every single time.
"""

from __future__ import annotations

import json
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from .agent_scout import ScoutResult
from .config import Settings
from .llm import LLM

Confidence = Literal["high", "medium", "low"]


class Model(BaseModel):
    """Base class - `extra="forbid"` keeps the generated schema strict."""

    model_config = ConfigDict(extra="forbid")


class SourceRef(Model):
    label: str = Field(description="Short human label, e.g. 'r/buildapc, 1.2k upvotes'.")
    url: str = Field(description="The link.")


class KeyPoint(Model):
    point: str = Field(description="The takeaway in one plain sentence, no jargon.")
    detail: str = Field(description="One to three sentences of explanation.")
    support: str = Field(
        description=(
            "How well backed this is in plain words, e.g. 'repeated in 4 separate "
            "threads' or 'one detailed comment only'."
        )
    )
    confidence: Confidence
    sources: list[SourceRef] = Field(description="Where this came from. At least one.")


class Theme(Model):
    name: str = Field(description="Short name for this recurring thread of discussion.")
    summary: str = Field(description="Two to four sentences on what people say here.")
    who_says_it: str = Field(
        description="Which communities or kinds of people. Empty string if unclear."
    )


class Quote(Model):
    text: str = Field(description="The quote, verbatim, trimmed to the useful part.")
    attribution: str = Field(description="Who/where, e.g. 'r/photography commenter'.")
    url: str = Field(description="Link to the source.")
    why_it_matters: str = Field(description="One sentence on why this quote earned a place.")


class Brief(Model):
    """The final report shape."""

    title: str = Field(description="A specific, descriptive title for this brief.")
    bottom_line: str = Field(
        description=(
            "The answer in at most three sentences. If someone reads only this, "
            "they should still get the point."
        )
    )
    key_points: list[KeyPoint] = Field(
        description="The 4-8 things that actually matter, most important first."
    )
    themes: list[Theme] = Field(description="The recurring threads of discussion.")
    sentiment_overview: str = Field(
        description=(
            "How people feel overall, in two to four sentences, with rough "
            "proportions ('most', 'a vocal minority'). Say so if it is unclear."
        )
    )
    disagreements: list[str] = Field(
        description="Points where sources genuinely conflict. Empty list if none."
    )
    notable_quotes: list[Quote] = Field(description="Three to six quotes worth reading.")
    gaps_and_caveats: list[str] = Field(
        description=(
            "What is missing or unreliable: sources that could not be reached, "
            "thin coverage, obvious bias in who was heard from."
        )
    )
    next_questions: list[str] = Field(
        description="Three to five questions a follow-up run should chase."
    )


SYSTEM_PROMPT = """You are an editor. You are given raw research findings \
collected by another agent, and you turn them into a brief that a busy person \
can read in three minutes and actually trust.

Rules you do not break:

1. Use only the findings you are given. You have no internet access. If it is \
not in the input, it does not go in the brief. Never invent a URL, a number, \
a quote or a source.
2. Every key point carries at least one source from the input. If a point has \
no source, drop the point.
3. Weight by evidence, not by volume. One heavily upvoted thread where fifty \
people agree outweighs three passing remarks. Say which is which in the \
`support` field - that is what it is for.
4. Keep disagreement visible. If the sources conflict, the brief says so; do \
not average the views into a bland middle.
5. Write plainly. Short sentences, no marketing voice, no "in today's \
fast-paced world". Assume an intelligent reader who knows nothing about this \
topic yet.
6. Be honest in `gaps_and_caveats`. If the research leaned on one community, \
or a platform could not be reached, or the sample was small and angry, write \
that down. This section is what makes the rest believable.

Order `key_points` so the most decision-relevant one is first."""


def _render_findings(result: ScoutResult, max_findings: int = 400) -> str:
    """Format agent 1's output as the input document for agent 2."""
    lines = [f"# Research findings on: {result.topic}", ""]
    if result.handover_summary:
        lines += ["## Scout's handover summary", "", result.handover_summary, ""]

    findings = result.findings[:max_findings]
    lines += [f"## Individual findings ({len(findings)})", ""]
    for index, finding in enumerate(findings, start=1):
        lines += [
            f"### Finding {index}",
            f"- Claim: {finding.get('claim', '')}",
            f"- Evidence: {finding.get('evidence', '')}",
            f"- Source: {finding.get('source_label', '')} <{finding.get('source_url', '')}>",
            f"- Source type: {finding.get('source_type', '')}",
            f"- Sentiment: {finding.get('sentiment', '')}",
            f"- Scout's confidence: {finding.get('confidence', '')}",
            "",
        ]

    searched = [
        call["input"].get("query")
        for call in result.tool_calls
        if call.get("tool") != "save_finding" and call.get("input", {}).get("query")
    ]
    if searched:
        lines += [
            "## What the scout searched for",
            "",
            *(f"- {query}" for query in dict.fromkeys(searched)),
            "",
        ]
    if result.stopped_because and result.stopped_because != "finished":
        lines += [
            "## Note on how the research ended",
            "",
            f"The scout stopped because: {result.stopped_because}. Treat coverage "
            "as potentially incomplete and say so in gaps_and_caveats.",
            "",
        ]
    return "\n".join(lines)


def run_editor(
    llm: LLM,
    settings: Settings,
    result: ScoutResult,
    audience: str | None = None,
    verbose: bool = True,
) -> Brief:
    """Run agent 2 and return the validated brief."""
    if verbose:
        print(
            f"\n[editor] refining {len(result.findings)} findings with "
            f"{settings.editor_model}..."
        )

    task = _render_findings(result)
    request = [
        "Turn the following research into a brief.",
        f"Topic as originally asked: {result.topic}",
    ]
    if audience:
        request.append(f"Write it for this reader: {audience}")
    request.append("---")
    request.append(task)

    brief = llm.parse(
        model=settings.editor_model,
        max_tokens=settings.max_tokens,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": "\n\n".join(request)}],
        thinking={"type": "adaptive"},
        output_format=Brief,
    )
    if verbose:
        print(f"[editor] done: '{brief.title}' with {len(brief.key_points)} key points.")
    return brief


# -- rendering ---------------------------------------------------------------
def brief_to_markdown(brief: Brief, result: ScoutResult, settings: Settings) -> str:
    """Lay the brief out as markdown. Pure Python, so the format never drifts."""
    out: list[str] = [f"# {brief.title}", ""]
    out += ["## Bottom line", "", brief.bottom_line, ""]

    out += ["## Key points", ""]
    for index, point in enumerate(brief.key_points, start=1):
        out.append(f"**{index}. {point.point}**")
        out.append("")
        out.append(point.detail)
        out.append("")
        out.append(f"*Support:* {point.support} · *Confidence:* {point.confidence}")
        if point.sources:
            links = " · ".join(f"[{s.label}]({s.url})" for s in point.sources)
            out.append("")
            out.append(f"*Sources:* {links}")
        out.append("")

    if brief.themes:
        out += ["## What people are talking about", ""]
        for theme in brief.themes:
            out.append(f"### {theme.name}")
            out.append("")
            out.append(theme.summary)
            if theme.who_says_it:
                out.append("")
                out.append(f"*Mostly from:* {theme.who_says_it}")
            out.append("")

    out += ["## Overall sentiment", "", brief.sentiment_overview, ""]

    if brief.disagreements:
        out += ["## Where sources disagree", ""]
        out += [f"- {item}" for item in brief.disagreements]
        out.append("")

    if brief.notable_quotes:
        out += ["## Voices worth reading", ""]
        for quote in brief.notable_quotes:
            out.append(f"> {quote.text}")
            out.append("")
            out.append(f"— [{quote.attribution}]({quote.url}) · {quote.why_it_matters}")
            out.append("")

    if brief.gaps_and_caveats:
        out += ["## Gaps and caveats", ""]
        out += [f"- {item}" for item in brief.gaps_and_caveats]
        out.append("")

    if brief.next_questions:
        out += ["## Worth digging into next", ""]
        out += [f"- {item}" for item in brief.next_questions]
        out.append("")

    # Every source the scout actually saved, so nothing is hidden.
    seen: dict[str, str] = {}
    for finding in result.findings:
        url = finding.get("source_url", "")
        if url and url not in seen:
            seen[url] = finding.get("source_label") or url
    if seen:
        out += ["## All sources the scout used", ""]
        out += [f"- [{label}]({url})" for url, label in seen.items()]
        out.append("")

    out += [
        "---",
        "",
        "<sub>Assembled by a two-agent pipeline: a research scout "
        f"({settings.scout_model}) that gathered {len(result.findings)} findings "
        f"across {len(result.tool_calls)} tool calls, and an editor "
        f"({settings.editor_model}) that wrote this up. Check the linked sources "
        "before you rely on anything here.</sub>",
        "",
    ]
    return "\n".join(out)


def brief_to_json(brief: Brief) -> str:
    return json.dumps(brief.model_dump(), indent=2, ensure_ascii=False)


def brief_schema() -> dict[str, Any]:
    return Brief.model_json_schema()
