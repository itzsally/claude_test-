"""Reddit access through Reddit's own official API.

This uses the documented OAuth endpoints with credentials you create yourself,
which is the supported way to read Reddit programmatically. It is not scraping:
no browser automation, no logged-in session, no hidden content.

Free tier limits (as of writing) are generous for research use - roughly 100
queries per minute per client id. We stay far below that.
"""

from __future__ import annotations

import datetime as _dt
import time
from typing import Any

import requests

TOKEN_URL = "https://www.reddit.com/api/v1/access_token"
API_BASE = "https://oauth.reddit.com"
REQUEST_TIMEOUT = 30

# Keep individual text fields short. Long bodies blow up the context window
# (and your bill) without adding much signal.
MAX_SELFTEXT = 700
MAX_COMMENT = 450


class RedditError(RuntimeError):
    """Raised when Reddit refuses a request."""


def _truncate(text: str | None, limit: int) -> str:
    text = (text or "").strip()
    if len(text) <= limit:
        return text
    return text[:limit].rstrip() + " ..."


def _to_date(epoch: float | None) -> str:
    if not epoch:
        return ""
    return _dt.datetime.fromtimestamp(epoch, tz=_dt.timezone.utc).strftime("%Y-%m-%d")


class RedditClient:
    """Minimal read-only Reddit client with automatic token refresh."""

    def __init__(self, client_id: str, client_secret: str, user_agent: str):
        self.client_id = client_id
        self.client_secret = client_secret
        self.user_agent = user_agent
        self._token: str | None = None
        self._token_expires_at = 0.0
        self._session = requests.Session()

    # -- auth ---------------------------------------------------------------
    def _fetch_token(self) -> str:
        """Get an application-only access token.

        Tries the `client_credentials` grant (what a Reddit app of type
        "script" gets), then the installed-app grant as a fallback, because
        which one works depends on the app type you created.
        """
        grants: list[dict[str, str]] = [
            {"grant_type": "client_credentials"},
            {
                "grant_type": "https://oauth.reddit.com/grants/installed_client",
                "device_id": "DO_NOT_TRACK_THIS_DEVICE",
            },
        ]
        errors: list[str] = []
        for grant in grants:
            try:
                response = self._session.post(
                    TOKEN_URL,
                    auth=(self.client_id, self.client_secret),
                    data=grant,
                    headers={"User-Agent": self.user_agent},
                    timeout=REQUEST_TIMEOUT,
                )
            except requests.RequestException as exc:
                errors.append(f"{grant['grant_type']}: network error: {exc}")
                continue
            if response.status_code == 200:
                payload = response.json()
                token = payload.get("access_token")
                if token:
                    self._token_expires_at = time.time() + float(
                        payload.get("expires_in", 3600)
                    ) - 60
                    return token
                errors.append(f"{grant['grant_type']}: no access_token in response")
            else:
                errors.append(
                    f"{grant['grant_type']}: HTTP {response.status_code} "
                    f"{response.text[:160]}"
                )
        raise RedditError(
            "Could not authenticate with Reddit. Check REDDIT_CLIENT_ID / "
            "REDDIT_CLIENT_SECRET in your .env file. Details: " + " | ".join(errors)
        )

    def _auth_header(self) -> dict[str, str]:
        if not self._token or time.time() >= self._token_expires_at:
            self._token = self._fetch_token()
        return {"Authorization": f"Bearer {self._token}", "User-Agent": self.user_agent}

    # -- raw request --------------------------------------------------------
    def _get(self, path: str, params: dict[str, Any]) -> Any:
        params = {**params, "raw_json": 1}
        try:
            response = self._session.get(
                f"{API_BASE}{path}",
                headers=self._auth_header(),
                params=params,
                timeout=REQUEST_TIMEOUT,
            )
        except requests.RequestException as exc:
            raise RedditError(f"Network error talking to Reddit: {exc}") from exc

        if response.status_code == 401:
            # Token may have been revoked early - refresh once and retry.
            self._token = None
            response = self._session.get(
                f"{API_BASE}{path}",
                headers=self._auth_header(),
                params=params,
                timeout=REQUEST_TIMEOUT,
            )
        if response.status_code == 429:
            raise RedditError("Reddit rate limit hit. Wait a minute and try again.")
        if response.status_code >= 400:
            raise RedditError(
                f"Reddit returned HTTP {response.status_code} for {path}: "
                f"{response.text[:200]}"
            )
        return response.json()

    # -- public operations --------------------------------------------------
    def search_posts(
        self,
        query: str,
        subreddit: str | None = None,
        sort: str = "relevance",
        time_filter: str = "year",
        limit: int = 20,
    ) -> list[dict[str, Any]]:
        """Search posts site-wide, or inside one subreddit."""
        limit = max(1, min(int(limit), 50))
        params: dict[str, Any] = {
            "q": query,
            "sort": sort,
            "t": time_filter,
            "limit": limit,
            "type": "link",
        }
        if subreddit:
            subreddit = subreddit.lstrip("/").removeprefix("r/")
            path = f"/r/{subreddit}/search"
            params["restrict_sr"] = 1
        else:
            path = "/search"

        payload = self._get(path, params)
        posts = []
        for child in payload.get("data", {}).get("children", []):
            data = child.get("data", {})
            posts.append(
                {
                    "id": data.get("id"),
                    "title": data.get("title"),
                    "subreddit": f"r/{data.get('subreddit', '')}",
                    "author": data.get("author"),
                    "score": data.get("score"),
                    "num_comments": data.get("num_comments"),
                    "date": _to_date(data.get("created_utc")),
                    "url": "https://www.reddit.com" + (data.get("permalink") or ""),
                    "link_url": data.get("url_overridden_by_dest") or "",
                    "text": _truncate(data.get("selftext"), MAX_SELFTEXT),
                }
            )
        return posts

    def top_comments(self, post_id: str, limit: int = 30) -> dict[str, Any]:
        """Fetch a post plus its highest-voted comments."""
        limit = max(1, min(int(limit), 60))
        post_id = post_id.strip().removeprefix("t3_")
        payload = self._get(
            f"/comments/{post_id}",
            {"limit": limit, "depth": 2, "sort": "top"},
        )
        if not isinstance(payload, list) or len(payload) < 2:
            raise RedditError(f"Unexpected comment payload for post {post_id}")

        post_children = payload[0].get("data", {}).get("children", [])
        post = post_children[0].get("data", {}) if post_children else {}

        comments: list[dict[str, Any]] = []
        for child in payload[1].get("data", {}).get("children", []):
            if child.get("kind") != "t1":
                continue  # skip "load more comments" placeholders
            data = child.get("data", {})
            body = _truncate(data.get("body"), MAX_COMMENT)
            if not body or body in {"[deleted]", "[removed]"}:
                continue
            comments.append(
                {
                    "author": data.get("author"),
                    "score": data.get("score"),
                    "date": _to_date(data.get("created_utc")),
                    "body": body,
                }
            )
        comments.sort(key=lambda c: c.get("score") or 0, reverse=True)
        return {
            "post_title": post.get("title"),
            "subreddit": f"r/{post.get('subreddit', '')}",
            "score": post.get("score"),
            "url": "https://www.reddit.com" + (post.get("permalink") or ""),
            "text": _truncate(post.get("selftext"), MAX_SELFTEXT),
            "comments": comments[:limit],
        }

    def find_subreddits(self, query: str, limit: int = 10) -> list[dict[str, Any]]:
        """Find communities that discuss a topic."""
        limit = max(1, min(int(limit), 25))
        payload = self._get("/subreddits/search", {"q": query, "limit": limit})
        results = []
        for child in payload.get("data", {}).get("children", []):
            data = child.get("data", {})
            results.append(
                {
                    "name": f"r/{data.get('display_name', '')}",
                    "subscribers": data.get("subscribers"),
                    "description": _truncate(data.get("public_description"), 220),
                    "url": "https://www.reddit.com" + (data.get("url") or ""),
                }
            )
        return results
