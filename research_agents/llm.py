"""Thin wrapper around the Anthropic SDK.

Two jobs:
  1. Build the client once.
  2. Send a message request, with the server-side refusal fallback enabled and
     a graceful retry if this SDK/account does not accept that beta parameter.

Everything the agents do goes through `send_message`, so there is exactly one
place to look when an API call misbehaves.
"""

from __future__ import annotations

from typing import Any

import anthropic

from .config import Settings

# Beta flag for the server-side refusal fallback. If Claude declines a request
# for safety reasons, the API re-routes it to another model instead of handing
# back an unusable `stop_reason: "refusal"`.
REFUSAL_FALLBACK_BETA = "server-side-fallback-2026-07-01"


class LLM:
    """Holds the Anthropic client plus the per-run settings."""

    def __init__(self, settings: Settings):
        self.settings = settings
        # A bare constructor picks up ANTHROPIC_API_KEY (or an `ant auth login`
        # profile) on its own - we only pass the key when we actually have one.
        if settings.anthropic_api_key:
            self.client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        else:
            self.client = anthropic.Anthropic()
        # Flipped to False the first time the API rejects the beta parameter,
        # so we stop paying for a doomed round trip on every later turn.
        self._fallback_supported = settings.enable_refusal_fallback

    # -- plain message request (used by the researcher agent) ----------------
    def send_message(self, **kwargs: Any) -> anthropic.types.Message:
        """Call the Messages API, retrying once without the refusal-fallback beta.

        Any keyword argument the SDK accepts (model, system, messages, tools,
        max_tokens, thinking, ...) is passed straight through.
        """
        if self._fallback_supported:
            try:
                return self.client.beta.messages.create(
                    betas=[REFUSAL_FALLBACK_BETA],
                    fallbacks="default",
                    **kwargs,
                )
            except anthropic.BadRequestError as exc:
                message = str(exc).lower()
                if not any(word in message for word in ("fallback", "beta", "speed")):
                    raise  # A real problem with our request - let it surface.
                self._fallback_supported = False
                print(
                    "  [note] this API version did not accept the refusal-fallback "
                    "option; continuing without it."
                )
        return self.client.messages.create(**kwargs)

    # -- structured request (used by the writer agent) -----------------------
    def parse(self, *, output_format: Any, **kwargs: Any) -> Any:
        """Ask for a response that matches a Pydantic model, and validate it.

        Returns the parsed model instance. `messages.parse` does the schema
        plumbing; older SDKs without it fall back to a raw JSON schema request.
        """
        if hasattr(self.client.messages, "parse"):
            response = self.client.messages.parse(output_format=output_format, **kwargs)
            parsed = getattr(response, "parsed_output", None)
            if parsed is not None:
                return parsed
            # Very unusual, but don't crash on an empty parse - fall through.

        import json

        schema = output_format.model_json_schema()
        response = self.client.messages.create(
            output_config={"format": {"type": "json_schema", "schema": schema}},
            **kwargs,
        )
        text = next(block.text for block in response.content if block.type == "text")
        return output_format.model_validate(json.loads(text))


def describe_refusal(response: anthropic.types.Message) -> str | None:
    """Return a human-readable reason if Claude declined the request."""
    if response.stop_reason != "refusal":
        return None
    details = getattr(response, "stop_details", None)
    category = getattr(details, "category", None) or "unspecified"
    explanation = getattr(details, "explanation", None) or ""
    return f"Claude declined this request (category: {category}). {explanation}".strip()
