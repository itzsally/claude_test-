# Two-Agent Research Pipeline

A small, working system with exactly two AI agents:

1. **The Scout** — goes out to the open web and Reddit, digs through what real
   people are saying about your topic, and records every finding with a source
   link.
2. **The Editor** — takes that pile of raw findings and turns it into a short,
   readable brief: bottom line, key points, where people disagree, what the
   research missed.

```
you ─► "what do people think of X?"
         │
         ▼
   ┌───────────────┐   web search · web fetch · Reddit API · save_finding
   │  AGENT 1      │◄──────────────────────────────────────────────────┐
   │  the Scout    │──────────────────────────────────────────────────►│
   └───────┬───────┘        (loops until it has enough)               │
           │  raw.json — every finding, with its URL
           ▼
   ┌───────────────┐
   │  AGENT 2      │   no internet access — it can only use what Agent 1 found
   │  the Editor   │
   └───────┬───────┘
           ▼
     brief.md — the thing you actually read
```

Written for someone who has never built an agent before. Nothing here assumes
you know what an API is; the setup is five steps and takes about fifteen
minutes.

---

## First: is there something I could just download instead?

Fair question, and worth answering before you build anything. Here is the
honest landscape.

| What you want | Use this instead of building |
|---|---|
| A one-off deep research answer, no setup | The "deep research" mode in Claude, ChatGPT or Perplexity. Genuinely good. Start here if you only need this occasionally. |
| Same thing, repeatable, but **no code** | [n8n](https://n8n.io) (self-hostable, has a Reddit node and an AI-agent node), [Dify](https://dify.ai), or [Flowise](https://flowiseai.com). You drag boxes and connect them. |
| A code framework for multi-agent systems | [LangGraph](https://langchain-ai.github.io/langgraph/), [CrewAI](https://www.crewai.com/), or Anthropic's [Claude Agent SDK](https://code.claude.com/docs/en/agent-sdk). More powerful than this repo, and more to learn. |
| Hosted scrapers for specific platforms | [Apify](https://apify.com) actors, [Firecrawl](https://firecrawl.dev), [Bright Data](https://brightdata.com). They sell the data-collection part. Read the section on Facebook below before you buy. |
| Reddit specifically, in Python | [PRAW](https://praw.readthedocs.io) — the well-known Reddit library. This project talks to Reddit's API directly instead, to keep the dependency list tiny and the code readable. |

**So why build this?** Because the off-the-shelf options give you either a
black box you can't adjust, or a framework you have to learn before you get
anything. This repo is under 1,800 lines of plain Python — a good share of it
comments — and the one file that matters is 265 lines long. Once you understand it, you can change what the agents look at, what
questions they chase, and how the report is laid out — which is the part that
actually matters for research you care about.

**And one thing no product will give you:** deep automated access to Facebook.
That limit is Facebook's, not the tool's. Read on.

---

## What you can and cannot reach (read this part)

This matters more than any code, so let's be straight about it.

### Reddit — fully supported, properly

Reddit has an **official API** that is free for this kind of use (roughly 100
requests a minute). You create credentials in your own Reddit account, and
this project uses them. You get real post scores, real comment threads, real
subreddit data. No browser automation, no fake accounts, nothing fragile.
This is the good path and it is the one this project takes.

### The open web — fully supported

Claude's built-in web search and web-fetch tools run on Anthropic's servers.
No extra API key, no scraping code to maintain. The Scout uses these for news
coverage, forums, review sites, blogs — and to reach Reddit-adjacent
discussion that lives elsewhere.

### Facebook — partly reachable, and honestly not much

Here is the part people get sold on and then discover doesn't work:

- **Anything behind a login is off limits.** Private groups, personal
  profiles, most of what you see in your own feed. Reaching it means logging
  in with an account and automating that session, which violates Facebook's
  Terms of Service, gets accounts banned, and breaks every few weeks when they
  change their markup. This project does not do it and you should not want it
  to — not for ethical points, but because a pipeline that breaks weekly and
  risks your account is not a pipeline.
- **Public Pages and public posts are reachable** when search engines have
  indexed them. The Scout is instructed to try `site:facebook.com <topic>`
  queries and fetch what comes back. Expect thin results, heavy on seller
  pages and marketplace listings. The Scout is told to say so rather than pad
  the report, which is why you will sometimes see "Facebook coverage was thin"
  in the caveats. That is the system being honest, not broken.
- **If you genuinely need Facebook data,** these are the real doors:
  - [Meta Content Library](https://transparency.meta.com/researchtools/meta-content-library/)
    — full public post data, for approved academic and nonprofit researchers.
  - [Meta Ad Library](https://www.facebook.com/ads/library/) — fully public,
    no approval needed. Excellent if your topic involves advertising or
    political messaging.
  - [Graph API](https://developers.facebook.com/docs/graph-api/) — full
    access to Pages **you own or administer**.

**Practical upshot:** treat Reddit plus the open web as your research base,
and Facebook as an occasional bonus. In practice Reddit is where the honest
opinions are anyway — the votes tell you how many people agreed, which
Facebook never will.

---

## Setup

### Step 1 — Check you have Python

Open a terminal and run:

```bash
python3 --version
```

You want 3.10 or higher. If it says "command not found", install Python from
[python.org/downloads](https://www.python.org/downloads/) and reopen the
terminal.

### Step 2 — Get the code and install the three libraries

```bash
git clone https://github.com/itzsally/claude_test-.git
cd claude_test-
pip3 install -r requirements.txt
```

If `pip3` complains about permissions or a "managed environment", use a
virtual environment — a private folder for this project's libraries:

```bash
python3 -m venv .venv
source .venv/bin/activate        # on Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### Step 3 — Get your Claude API key (required)

This is what makes the agents think, and it is the one thing you must have.

1. Go to [console.anthropic.com](https://console.anthropic.com/settings/keys).
2. Sign up, then add a small amount of credit (5 USD is plenty to start).
3. Click **Create Key** and copy it. It starts with `sk-ant-`.

Now create your settings file:

```bash
cp .env.example .env
```

Open `.env` in any text editor and paste your key after `ANTHROPIC_API_KEY=`.
Save it. That file is git-ignored, so your key will not get committed.

> An API key is separate from a Claude.ai subscription and is billed by usage.
> See [what this costs](#what-this-costs) below — a typical run is cents.

### Step 4 — Get Reddit credentials (optional, but do it)

Two minutes, free, and it is the difference between reading *about* Reddit and
reading Reddit.

1. Go to [reddit.com/prefs/apps](https://www.reddit.com/prefs/apps) while
   logged in.
2. Click **create another app...** at the bottom.
3. Fill in: **name** anything, **type** `script`, **redirect uri**
   `http://localhost:8080` (it is required by the form but never used).
4. Click **create app**. You now see a short string under the app's name —
   that is your **client id**. The field labelled **secret** is your
   **client secret**.
5. Put both in `.env`, and set `REDDIT_USER_AGENT` to include your own Reddit
   username (Reddit asks apps to identify themselves).

### Step 5 — Check everything before spending anything

```bash
python3 run.py --self-check
```

It prints exactly what is configured and what is missing. You can also run the
test suite, which costs nothing and calls no API:

```bash
python3 test_pipeline.py
```

---

## Using it

The normal case — research a topic and get a brief:

```bash
python3 run.py "what do people actually think of the Rabbit R1?"
```

You will see the Scout working, tool call by tool call, then the Editor
writing up. Everything lands in a new folder under `runs/`:

- **`brief.md`** — the report. This is the one you read.
- `brief.json` — same content, structured, if you want to feed it elsewhere.
- `raw.json` — every finding the Scout saved, with sources and its full trail.

### Useful variations

```bash
# Point the Scout at specific communities
python3 run.py "best budget espresso machine" --subreddit espresso --subreddit coffee

# Steer the research
python3 run.py "Ozempic side effects people report" --guidance "focus on the last 3 months"

# Change who the brief is written for
python3 run.py "is Kubernetes overkill for small teams?" --audience "a non-technical founder"

# Go deeper (more turns = more thorough, slower, pricier)
python3 run.py "EU AI Act compliance complaints" --turns 25

# Gather only — inspect the raw findings before paying for a write-up
python3 run.py "topic" --scout-only

# Re-write the brief from research you already have. Cheap and fast:
# perfect for tweaking the Editor's prompt without re-researching.
python3 run.py --from-raw runs/20260917-143022-topic/raw.json

# See what would be sent to the API, without sending it
python3 run.py "topic" --dry-run
```

Want to see a finished brief without paying for research first? Run the Editor
against the bundled sample findings:

```bash
python3 run.py --from-raw research_agents/sample_data/demo_raw.json
```

(That sample data is invented — it exists to test the plumbing, not to be
cited.)

---

## How it actually works

Worth ten minutes, because once this clicks you can build any agent.

### An agent is a loop, and that is nearly all it is

A chatbot answers. An agent **acts, sees the result, and decides what to do
next**. That is the whole difference, and it is about twenty lines of code:

1. Send the model your question *plus a list of tools it is allowed to use*.
2. The model replies with either an answer or "please run `web_search` with
   this query".
3. If it asked for a tool, your code runs it and sends the result back.
4. Go to 1. Stop when the model stops asking for tools.

That loop is in `research_agents/agent_scout.py`, and it is the most important
file to read. A **tool** is just a function you described to the model in JSON:
a name, what it does, and what arguments it takes. The model never runs your
code — it asks, you run it, you report back. That is also why the agent is
safe to reason about: it can only ever do the things you handed it.

### The three kinds of tool here

| Tool | Who runs it | Needs a key? |
|---|---|---|
| `web_search`, `web_fetch` | Anthropic's servers | No — included |
| `reddit_search_posts`, `reddit_read_comments`, `reddit_find_communities` | Your machine, via Reddit's official API | Reddit id + secret |
| `save_finding` | Your machine — appends to a list | No |

`save_finding` is the quiet hero. Without it, the Scout would ramble and its
insights would be trapped in prose. Because every finding must arrive as a
claim, evidence, a source URL and a confidence level, the Editor gets clean
structured input — and a finding with no usable URL is **rejected**, which is
the main reason this thing doesn't invent sources.

### Why the Editor is a separate agent

It would be simpler to have one agent do both. Two is better here:

- **Different jobs need different instructions.** "Be exhaustive, chase every
  lead" and "be ruthless, cut to eight points" fight each other in one prompt.
- **The Editor has no internet access.** It physically cannot add a source
  that the Scout didn't find. That is a real guardrail against invented
  citations, not a stylistic choice.
- **You can iterate cheaply.** Research once, then re-run the Editor with
  `--from-raw` as many times as you like for pennies.

### Structured output: why the layout never drifts

The Editor doesn't return prose. It returns data matching an exact shape —
`title`, `bottom_line`, `key_points`, `themes`, `disagreements`,
`notable_quotes`, `gaps_and_caveats`, `next_questions` — defined as Python
classes at the top of `research_agents/agent_editor.py`. The API *guarantees*
the response matches that shape.

Plain Python then renders it to markdown. So every brief has the same sections
in the same order with the same formatting, run after run. If you want a
different layout, edit `brief_to_markdown()` and nothing else changes. If you
want a different *section*, add a field to the `Brief` class and the model
fills it in.

### The files

```
run.py                          the command line: flags in, pipeline out
test_pipeline.py                tests that cost nothing (fake API, real logic)
research_agents/
  config.py                     all settings, read from .env
  llm.py                        the only place that talks to Claude
  agent_scout.py                AGENT 1: system prompt + the agentic loop
  agent_editor.py               AGENT 2: report shape + markdown rendering
  pipeline.py                   glues the two together, writes the files
  tools/
    __init__.py                 tool definitions and dispatch
    reddit.py                   Reddit's official API, with OAuth handled
  sample_data/demo_raw.json     invented findings, for testing agent 2
```

### Changing what the agents do

Nearly all behaviour is prompt, not code:

- **How the Scout researches** → `SYSTEM_PROMPT` in `agent_scout.py`. Want it
  to always check news coverage, or weight recent posts more heavily, or
  always search three specific subreddits? Write that instruction in plain
  English and it will follow it.
- **How the brief reads** → `SYSTEM_PROMPT` in `agent_editor.py`.
- **What sections the brief has** → the `Brief` class, same file.
- **A new source** (YouTube comments, Hacker News, an RSS feed, your own
  documents) → write a function, add a schema next to the Reddit ones in
  `tools/__init__.py`, and handle its name in `Toolbox.run()`. Three small
  edits; copy the shape of `reddit_find_communities`.

---

## What this costs

Both agents default to **Claude Opus 5**, the strongest model. A typical run
with 14 research turns lands in the range of **10 to 60 US cents** — the Scout
is nearly all of it, since research means many turns over a growing
conversation. Deep runs with `--turns 30` on a broad topic can reach a few
dollars. The exact tokens and a rough dollar estimate print at the end of
every run, so you are never guessing.

Three levers, cheapest first:

```bash
# 1. Prompt caching is already on — the repeated part of each turn is billed
#    at a fraction of the normal rate. You get this for free.

# 2. Fewer turns. The single biggest lever.
python3 run.py "topic" --turns 6

# 3. Think less hard.
python3 run.py "topic" --effort medium
```

Or use a cheaper model for the research grind while keeping the best model for
the write-up. In `.env`:

```
SCOUT_MODEL=claude-sonnet-5
EDITOR_MODEL=claude-opus-5
```

The Scout does many turns and mostly gathers, so it tolerates a smaller model
better than the Editor does — the Editor's judgement about what matters is
where quality shows up most. `claude-haiku-4-5` is cheaper still if you are
just experimenting.

---

## When something goes wrong

| What you see | What it means |
|---|---|
| `ANTHROPIC_API_KEY is not set` | No `.env` file, or the key line is blank. Run `python3 run.py --self-check`. |
| `authentication_error` from the API | Key typo, or no credit on the account. Check [console billing](https://console.anthropic.com/settings/billing). |
| `Could not authenticate with Reddit` | Wrong id or secret. The **client id** is the small string under your app's name, not the app name itself. |
| `Reddit rate limit hit` | You went over ~100 requests a minute. Wait a minute. |
| The Scout saved no findings | Usually a topic too narrow or too new to have a public conversation. Try broader words, or `--turns 20`. |
| "Facebook coverage was thin" in the brief | Expected. See [what you can and cannot reach](#what-you-can-and-cannot-reach-read-this-part). |
| `this API version did not accept the refusal-fallback option` | Harmless. The run continues; one optional feature was skipped. |
| Findings look shallow | Raise `--turns`, and name the communities with `--subreddit`. Pointing the Scout at the right place beats letting it wander. |

Still stuck? `python3 test_pipeline.py` tells you whether the problem is your
setup or the code.

---

## Honest limitations

- **It reports what people said, not what is true.** A brief distilled from
  Reddit is a good map of opinion and a poor map of fact. The `gaps_and_caveats` section exists because of this. Check the linked sources before
  you rely on anything.
- **Loud voices dominate public forums.** People post when they are delighted
  or furious. The quiet middle is invisible, on every platform.
- **Facebook coverage is thin by design.** Covered above.
- **The Scout can be wrong about relevance.** It decides what to chase. Read
  `raw.json` when a brief feels off — you will usually see the wrong turn it
  took, and a line of `--guidance` fixes it.
- **Deleted and edited content.** Reddit shows `[deleted]` where a comment
  once was; those are skipped, which can quietly bias a thread's tone.

---

## Licence and use

Your code, do as you like with it. Two standing rules worth keeping: respect
each platform's terms of service, and do not present a machine-written brief
as human research without saying so. Every generated `brief.md` carries a
footer noting how it was made — leave it there.
