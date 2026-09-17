"""The researcher agent's toolbox.

A "tool" is just a function Claude is allowed to call. You describe it with a
JSON schema, Claude decides when to call it and with what arguments, your code
runs it, and you hand the result back. That is the whole idea behind agents.

Three kinds of tool live here:

* Server-side tools (`web_search`, `web_fetch`) - Anthropic runs these. You
  declare them and nothing else; there is no function for you to write and no
  extra API key to buy.
* Reddit tools - your code calls Reddit's official API (see reddit.py).
* `save_finding` - a notebook. Claude writes each fact it wants to keep into
  it, with a source URL, so the writer agent gets clean structured input.
"""

from __future__ import annotations

import json
from typing import Any

from ..config import Settings
from .reddit import RedditClient, RedditError

# Anthropic-hosted tools. `_20260209` is the current version, with dynamic
# filtering: Claude filters search results before they reach the context
# window, which is both more accurate and cheaper.
WEB_SEARCH_TOOL: dict[str, Any] = {"type": "web_search_20260209", "name": "web_search"}
WEB_FETCH_TOOL: dict[str, Any] = {"type": "web_fetch_20260209", "name": "web_fetch"}

SOURCE_TYPES = ["reddit", "facebook", "news", "blog", "forum", "official", "other"]
SENTIMENTS = ["positive", "negative", "mixed", "neutral", "not_applicable"]
CONFIDENCE = ["high", "medium", "low"]


class Toolbox:
    """Owns the tool definitions, the collected findings, and the dispatch."""

    def __init__(self, settings: Settings):
        self.settings = settings
        self.findings: list[dict[str, Any]] = []
        self.call_log: list[dict[str, Any]] = []
        self._reddit: RedditClient | None = None
        if settings.reddit_enabled:
            self._reddit = RedditClient(
                client_id=settings.reddit_client_id or "",
                client_secret=settings.reddit_client_secret or "",
                user_agent=settings.reddit_user_agent,
            )

    # -- what Claude is told it can do --------------------------------------
    def definitions(self) -> list[dict[str, Any]]:
        tools: list[dict[str, Any]] = [WEB_SEARCH_TOOL, WEB_FETCH_TOOL]

        if self._reddit is not None:
            tools += [
                {
                    "name": "reddit_search_posts",
                    "description": (
                        "Search Reddit posts through Reddit's official API. Returns "
                        "titles, scores, comment counts, dates, permalinks and the "
                        "start of each post's text. Use this for what real people "
                        "are saying, not for news articles."
                    ),
                    "strict": True,
                    "input_schema": {
                        "type": "object",
                        "properties": {
                            "query": {
                                "type": "string",
                                "description": "Keywords to search for.",
                            },
                            "subreddit": {
                                "type": "string",
                                "description": (
                                    "Restrict the search to one subreddit, e.g. "
                                    "'buildapc'. Use an empty string to search "
                                    "all of Reddit."
                                ),
                            },
                            "sort": {
                                "type": "string",
                                "enum": ["relevance", "top", "new", "comments"],
                                "description": "Result ordering.",
                            },
                            "time_filter": {
                                "type": "string",
                                "enum": ["day", "week", "month", "year", "all"],
                                "description": "How far back to look.",
                            },
                            "limit": {
                                "type": "integer",
                                "description": "How many posts to return (1-50).",
                            },
                        },
                        "required": [
                            "query",
                            "subreddit",
                            "sort",
                            "time_filter",
                            "limit",
                        ],
                        "additionalProperties": False,
                    },
                },
                {
                    "name": "reddit_read_comments",
                    "description": (
                        "Read the top comments on one Reddit post. Use this after "
                        "reddit_search_posts when a thread looks important - the "
                        "comments are usually where the real opinions are."
                    ),
                    "strict": True,
                    "input_schema": {
                        "type": "object",
                        "properties": {
                            "post_id": {
                                "type": "string",
                                "description": (
                                    "The post id from reddit_search_posts, e.g. '1abc2de'."
                                ),
                            },
                            "limit": {
                                "type": "integer",
                                "description": "How many comments to return (1-60).",
                            },
                        },
                        "required": ["post_id", "limit"],
                        "additionalProperties": False,
                    },
                },
                {
                    "name": "reddit_find_communities",
                    "description": (
                        "Find subreddits that discuss a topic, with subscriber "
                        "counts. Useful as a first step to learn where the "
                        "conversation actually happens."
                    ),
                    "strict": True,
                    "input_schema": {
                        "type": "object",
                        "properties": {
                            "query": {"type": "string", "description": "Topic keywords."},
                            "limit": {
                                "type": "integer",
                                "description": "How many communities to return (1-25).",
                            },
                        },
                        "required": ["query", "limit"],
                        "additionalProperties": False,
                    },
                },
            ]

        tools.append(
            {
                "name": "save_finding",
                "description": (
                    "Record one thing you learned, so it survives into the final "
                    "report. Call this every time you find something worth keeping "
                    "- once per distinct point, not once per source. Every finding "
                    "needs a real URL that a human can open."
                ),
                "strict": True,
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "claim": {
                            "type": "string",
                            "description": "The point itself, in one clear sentence.",
                        },
                        "evidence": {
                            "type": "string",
                            "description": (
                                "What you actually saw: a quote, a number, a vote "
                                "count, or a short paraphrase. Quote rather than "
                                "summarise where you can."
                            ),
                        },
                        "source_url": {
                            "type": "string",
                            "description": "Direct link to where you saw this.",
                        },
                        "source_type": {"type": "string", "enum": SOURCE_TYPES},
                        "source_label": {
                            "type": "string",
                            "description": (
                                "Short human label, e.g. 'r/buildapc thread, 1.2k "
                                "upvotes' or 'Reuters, March 2026'."
                            ),
                        },
                        "sentiment": {
                            "type": "string",
                            "enum": SENTIMENTS,
                            "description": (
                                "How the source feels about the topic, if relevant."
                            ),
                        },
                        "confidence": {
                            "type": "string",
                            "enum": CONFIDENCE,
                            "description": (
                                "How much weight this deserves. One anonymous "
                                "comment is low; a repeated pattern or a primary "
                                "source is high."
                            ),
                        },
                    },
                    "required": [
                        "claim",
                        "evidence",
                        "source_url",
                        "source_type",
                        "source_label",
                        "sentiment",
                        "confidence",
                    ],
                    "additionalProperties": False,
                },
            }
        )
        return tools

    @property
    def custom_tool_names(self) -> set[str]:
        """Tools this file executes (as opposed to Anthropic-hosted ones)."""
        return {
            "reddit_search_posts",
            "reddit_read_comments",
            "reddit_find_communities",
            "save_finding",
        }

    # -- running a tool call ------------------------------------------------
    def run(self, name: str, tool_input: dict[str, Any]) -> tuple[str, bool]:
        """Execute one tool call.

        Returns (result_text, is_error). We never raise out of here: an error
        is handed back to Claude as a tool result so it can adapt, which is
        what makes the agent resilient instead of brittle.
        """
        self.call_log.append({"tool": name, "input": tool_input})
        try:
            if name == "save_finding":
                return self._save_finding(tool_input), False
            if name == "reddit_search_posts":
                return self._reddit_search(tool_input), False
            if name == "reddit_read_comments":
                return self._reddit_comments(tool_input), False
            if name == "reddit_find_communities":
                return self._reddit_communities(tool_input), False
            return f"Unknown tool: {name}", True
        except RedditError as exc:
            return f"Reddit tool failed: {exc}", True
        except Exception as exc:  # noqa: BLE001 - surface anything to the model
            return f"{type(exc).__name__}: {exc}", True

    # -- individual tools ---------------------------------------------------
    def _save_finding(self, data: dict[str, Any]) -> str:
        finding = {
            "claim": str(data.get("claim", "")).strip(),
            "evidence": str(data.get("evidence", "")).strip(),
            "source_url": str(data.get("source_url", "")).strip(),
            "source_type": data.get("source_type", "other"),
            "source_label": str(data.get("source_label", "")).strip(),
            "sentiment": data.get("sentiment", "not_applicable"),
            "confidence": data.get("confidence", "medium"),
        }
        if not finding["claim"]:
            return "Rejected: 'claim' was empty. Send the point you learned."
        if not finding["source_url"].startswith("http"):
            return (
                "Rejected: 'source_url' must be a real link starting with http. "
                "Re-send this finding with the URL you actually saw it on."
            )
        self.findings.append(finding)
        return (
            f"Saved finding #{len(self.findings)}. "
            f"Total kept so far: {len(self.findings)}."
        )

    def _require_reddit(self) -> RedditClient:
        if self._reddit is None:
            raise RedditError(
                "Reddit credentials are not configured, so Reddit tools are off. "
                "Use web_search instead."
            )
        return self._reddit

    def _reddit_search(self, data: dict[str, Any]) -> str:
        posts = self._require_reddit().search_posts(
            query=str(data.get("query", "")),
            subreddit=data.get("subreddit") or None,
            sort=data.get("sort") or "relevance",
            time_filter=data.get("time_filter") or "year",
            limit=data.get("limit") or 20,
        )
        if not posts:
            return "No Reddit posts matched. Try broader keywords or time_filter='all'."
        return json.dumps({"post_count": len(posts), "posts": posts}, ensure_ascii=False)

    def _reddit_comments(self, data: dict[str, Any]) -> str:
        thread = self._require_reddit().top_comments(
            post_id=str(data.get("post_id", "")),
            limit=data.get("limit") or 30,
        )
        return json.dumps(thread, ensure_ascii=False)

    def _reddit_communities(self, data: dict[str, Any]) -> str:
        subs = self._require_reddit().find_subreddits(
            query=str(data.get("query", "")),
            limit=data.get("limit") or 10,
        )
        if not subs:
            return "No matching subreddits found."
        return json.dumps({"subreddits": subs}, ensure_ascii=False)
