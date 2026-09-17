"""Agent 1 - the Scout (researcher).

This is the agent that goes out and gathers material. The pattern is the
"agentic loop", and it is simpler than it sounds:

    1. Send Claude the topic, plus the list of tools it may use.
    2. Claude answers with either "here is my report" or "please run this tool".
    3. If it asked for a tool, run it and send the result back.
    4. Repeat until it stops asking for tools (or we hit the turn limit).

That loop is the entire difference between a chatbot and an agent: the model
gets to act, see what happened, and decide what to do next.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any

from .config import Settings
from .llm import LLM, describe_refusal
from .tools import Toolbox

SYSTEM_PROMPT = """You are a research scout. You gather raw material about a \
topic from public sources, especially what real people are saying in online \
communities. Another agent will write the final report - your job is coverage \
and accuracy, not polish.

## Your tools

- `web_search` / `web_fetch`: search the open web and read pages. Use \
site-scoped queries to reach specific platforms, e.g. \
`site:reddit.com <topic>`, `site:facebook.com <topic>`, \
`site:news.ycombinator.com <topic>`. `web_fetch` can only read URLs that \
already appeared in the conversation.
- `reddit_search_posts`, `reddit_read_comments`, `reddit_find_communities` \
(only if Reddit credentials are configured): Reddit's official API. These are \
far richer than web search for Reddit - real vote counts, real comment \
threads. Prefer them whenever the topic has a community angle.
- `save_finding`: your notebook. Nothing you do not save will reach the \
report.

## Important limits, and how to work around them

You can only read what is public. Facebook in particular: you cannot log in, \
join groups, or read private or group-only posts, and you must not try. What \
you *can* do is find public Facebook Pages, public posts and public group \
discussions that search engines have indexed, via `site:facebook.com` queries \
and `web_fetch`. If Facebook coverage comes back thin, say so plainly in your \
summary rather than padding it - and look for the same conversation on \
sources that are open: Reddit, forums, news coverage, review sites, YouTube \
comments, X/Twitter discussion write-ups.

## How to work

1. Start broad: understand the topic, then find where it is discussed. \
`reddit_find_communities` is a good first call.
2. Then go deep. Search posts, and open the comment threads that look \
substantive. The comments are usually where the real opinions live.
3. Chase disagreement on purpose. A report where everyone agrees is usually a \
report that only read one source. Actively look for the opposing view.
4. Call `save_finding` as you go, once per distinct point. Always with a real \
URL. Quote actual words where you can - the writer agent needs raw material, \
not your paraphrase of a paraphrase.
5. Note *how much* support a view has (upvotes, how many separate people said \
it), not just that someone said it. The writer needs to distinguish "one \
angry comment" from "the consensus of a 2000-upvote thread".
6. Keep going until you have solid coverage, then stop and write a short \
handover summary: what you covered, what the main threads of opinion were, \
where the evidence was thin, and what you could not access.

Be honest about gaps. An accurate "I could not find much on X" is worth more \
than an invented answer."""


@dataclass
class ScoutResult:
    """Everything agent 1 produces, ready to hand to agent 2."""

    topic: str
    findings: list[dict[str, Any]] = field(default_factory=list)
    handover_summary: str = ""
    tool_calls: list[dict[str, Any]] = field(default_factory=list)
    turns_used: int = 0
    stopped_because: str = ""
    usage: dict[str, int] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "topic": self.topic,
            "findings": self.findings,
            "handover_summary": self.handover_summary,
            "tool_calls": self.tool_calls,
            "turns_used": self.turns_used,
            "stopped_because": self.stopped_because,
            "usage": self.usage,
        }


def _build_task_message(topic: str, guidance: str | None, subreddits: list[str]) -> str:
    parts = [f"Research this topic thoroughly: {topic}"]
    if subreddits:
        pretty = ", ".join(f"r/{s.lstrip('/').removeprefix('r/')}" for s in subreddits)
        parts.append(f"Pay particular attention to these communities: {pretty}.")
    if guidance:
        parts.append(f"Extra instructions from the person asking: {guidance}")
    parts.append(
        "Work through your tools, save every finding worth keeping, then give me "
        "your handover summary."
    )
    return "\n\n".join(parts)


def _accumulate_usage(total: dict[str, int], usage: Any) -> None:
    for field_name in (
        "input_tokens",
        "output_tokens",
        "cache_read_input_tokens",
        "cache_creation_input_tokens",
    ):
        value = getattr(usage, field_name, None)
        if isinstance(value, int):
            total[field_name] = total.get(field_name, 0) + value
    server_use = getattr(usage, "server_tool_use", None)
    searches = getattr(server_use, "web_search_requests", None)
    if isinstance(searches, int):
        total["web_search_requests"] = total.get("web_search_requests", 0) + searches


def run_scout(
    llm: LLM,
    settings: Settings,
    topic: str,
    guidance: str | None = None,
    subreddits: list[str] | None = None,
    verbose: bool = True,
) -> ScoutResult:
    """Run agent 1 and return what it gathered."""
    toolbox = Toolbox(settings)
    tools = toolbox.definitions()
    messages: list[dict[str, Any]] = [
        {"role": "user", "content": _build_task_message(topic, guidance, subreddits or [])}
    ]

    result = ScoutResult(topic=topic)
    pause_restarts = 0
    last_text = ""

    for turn in range(1, settings.max_turns + 1):
        result.turns_used = turn
        if verbose:
            print(f"\n[scout] turn {turn}/{settings.max_turns} - thinking...")

        response = llm.send_message(
            model=settings.scout_model,
            max_tokens=settings.max_tokens,
            system=SYSTEM_PROMPT,
            messages=messages,
            tools=tools,
            thinking={"type": "adaptive"},
            output_config={"effort": settings.effort},
            # Cache the stable prefix (tools + system + earlier turns) so each
            # extra turn costs a fraction of re-reading the whole conversation.
            cache_control={"type": "ephemeral"},
        )
        _accumulate_usage(result.usage, response.usage)

        refusal = describe_refusal(response)
        if refusal:
            result.stopped_because = refusal
            if verbose:
                print(f"[scout] {refusal}")
            break

        # Keep any prose Claude wrote - the last one is its handover summary.
        text_blocks = [b.text for b in response.content if b.type == "text" and b.text]
        if text_blocks:
            last_text = "\n\n".join(text_blocks)

        if verbose:
            for block in response.content:
                if block.type == "server_tool_use":
                    query = (block.input or {}).get("query") or (block.input or {}).get("url")
                    print(f"  - {block.name}: {query}")

        messages.append({"role": "assistant", "content": response.content})

        # A long server-tool turn can pause. Re-sending resumes it; we must not
        # inject a "continue" message, the API works that out from the history.
        if response.stop_reason == "pause_turn":
            pause_restarts += 1
            if pause_restarts > settings.max_pause_restarts:
                result.stopped_because = "server tools kept pausing; gave up resuming"
                break
            if verbose:
                print("  - (long search paused, resuming)")
            continue

        if response.stop_reason == "end_turn":
            result.stopped_because = "finished"
            break

        pending = [
            b
            for b in response.content
            if b.type == "tool_use" and b.name in toolbox.custom_tool_names
        ]
        if not pending:
            # Nothing for us to run and Claude did not end the turn - stop
            # rather than loop forever.
            result.stopped_because = f"unexpected stop_reason: {response.stop_reason}"
            break

        tool_results = []
        for call in pending:
            # Tool inputs are already parsed objects; never string-match them.
            tool_input = call.input if isinstance(call.input, dict) else {}
            output, is_error = toolbox.run(call.name, tool_input)
            if verbose:
                label = call.name
                if call.name == "save_finding":
                    label = f"save_finding: {str(tool_input.get('claim', ''))[:70]}"
                elif "query" in tool_input:
                    label = f"{call.name}: {tool_input['query']}"
                elif "post_id" in tool_input:
                    label = f"{call.name}: {tool_input['post_id']}"
                print(f"  - {label}{'  [error]' if is_error else ''}")
            tool_results.append(
                {
                    "type": "tool_result",
                    "tool_use_id": call.id,
                    "content": output,
                    **({"is_error": True} if is_error else {}),
                }
            )
        # All results for one assistant turn go back in a single user message.
        messages.append({"role": "user", "content": tool_results})
    else:
        result.stopped_because = f"hit the {settings.max_turns}-turn limit"

    result.findings = toolbox.findings
    result.tool_calls = toolbox.call_log
    result.handover_summary = last_text
    if verbose:
        print(
            f"\n[scout] done: {len(result.findings)} findings from "
            f"{len(result.tool_calls)} tool calls ({result.stopped_because})."
        )
    return result


def load_scout_result(path: str) -> ScoutResult:
    """Rebuild a ScoutResult from a saved raw.json - lets you re-run agent 2 alone."""
    with open(path, encoding="utf-8") as handle:
        data = json.load(handle)
    return ScoutResult(
        topic=data.get("topic", ""),
        findings=data.get("findings", []),
        handover_summary=data.get("handover_summary", ""),
        tool_calls=data.get("tool_calls", []),
        turns_used=data.get("turns_used", 0),
        stopped_because=data.get("stopped_because", ""),
        usage=data.get("usage", {}),
    )
