---
type: notes
title: "W19 · S2 · Prompt Engineering and Calling an LLM API from Python"
slug: w19-s2-prompting-llm-api
topic: LLM APIs
subject: programming-fundamentals
minutes: 45
description: Prompt patterns that work (role, examples, step-by-step, output format), calling an LLM over HTTP from Python with the key in an environment variable, getting and validating JSON output, and handling keys and errors safely.
---
# Prompt engineering and calling an LLM API from Python

A **prompt** is the input you give the model. Because the model's output depends entirely on its context (S1), a
clear prompt is the cheapest way to get better results. Then you will call a model from your own code, which is what
turns a chat assistant into a feature of an application.

## Prompt patterns

| Pattern | What you add | Example fragment |
|---|---|---|
| **Role and audience** | who the model should act as, who reads the output | "You are a placement mentor. The reader is a final-year B.Tech student." |
| **Task and context** | exactly what to do, with the material it needs | "Rewrite the bullet below. Facts: built with React and Express, 40 users in the pilot." |
| **Constraints** | length, tone, what not to do | "Maximum 25 words. Do not add facts that are not given." |
| **Examples (few-shot)** | one to three input → output pairs | "Input: made website. Output: Built a responsive portfolio site in React…" |
| **Step-by-step** | ask it to work through steps before answering | "First list the skills shown, then write the bullet." |
| **Output format** | a precise structure | "Return JSON with keys `bullet` (string) and `skills` (list of strings)." |

A weak prompt and a strong one for the same job:

```text
Weak:   improve my resume point: did a project on ML

Strong: You are a placement mentor reviewing a fresher's resume for software roles.
        Rewrite the project bullet using: action verb + what was built + technology + measurable result.
        Use only the facts given; if a result is missing, write [add metric] instead of inventing one.
        Facts: built a placement-prediction model; Python, scikit-learn; compared 4 models; best F1 0.81
        on a synthetic dataset.
        Return JSON: {"bullet": string, "skills": [string]}.
```

The instruction "write [add metric] instead of inventing one" matters: your resume must contain only true,
verifiable claims.

**System and user messages.** Most chat APIs accept a list of messages with roles. The **system** message holds
standing instructions (role, rules, format); **user** messages hold the request; **assistant** messages hold earlier
replies when you continue a conversation.

## Keys and configuration

An API key is a password that spends money. Treat it like one:

- Store it in an **environment variable** or a `.env` file listed in `.gitignore`; commit only `.env.example` with
  empty values.
- In a deployed app, keep it **server-side** (in the host's secrets settings), never in browser code.
- In this programme, use the **tutor-provided key** for labs. Do not enter payment details anywhere.
- If a key is ever committed or shared, tell your tutor so it can be **revoked**; deleting the commit is not enough.

```text
# .env   (never committed)
LLM_API_URL=<endpoint from your provider or tutor>
LLM_API_KEY=<your key>
LLM_MODEL=<model name from your provider or tutor>
```

```bash
pip install requests python-dotenv
```

## Calling an LLM over HTTP

Providers offer official SDKs, but every one of them is an HTTPS API underneath. The function below sends a chat
request with `requests`. Request and response field names differ between providers, so check your provider's API
reference: the shape shown is the common chat-style one (a `messages` list in, the reply text inside the response),
and only the two marked lines usually need changing.

```python
# llm.py
import os

import requests
from dotenv import load_dotenv

load_dotenv()                                    # reads .env into environment variables

API_URL = os.environ["LLM_API_URL"]
API_KEY = os.environ["LLM_API_KEY"]
MODEL = os.environ["LLM_MODEL"]


class LLMError(Exception):
    pass


def chat(messages: list[dict], temperature: float = 0.2, max_tokens: int = 500) -> str:
    """Send chat messages and return the reply text."""
    try:
        response = requests.post(
            API_URL,
            headers={"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"},
            json={"model": MODEL, "messages": messages,                  # <- check your provider's request shape
                  "temperature": temperature, "max_tokens": max_tokens},
            timeout=60,
        )
    except requests.RequestException as exc:
        raise LLMError(f"network error: {exc}") from exc

    if response.status_code == 429:
        raise LLMError("rate limit reached; wait and retry")
    if response.status_code >= 400:
        raise LLMError(f"API error {response.status_code}: {response.text[:200]}")

    data = response.json()
    return data["choices"][0]["message"]["content"]                     # <- check your provider's response shape
```

Notes:

- `os.environ["LLM_API_KEY"]` fails immediately with a `KeyError` if the key is missing, which is better than a
  confusing error later.
- Always set a `timeout`. Network calls can hang.
- Never print or log the key, and never put it in a URL.
- Handle `429` (rate limit) and `5xx` (server) errors; for a production app, retry a few times with an increasing
  wait.

## Structured output: getting JSON you can use

Free text is hard for code to use. Ask for JSON, then **parse and validate** it, because the model can still return
something malformed.

```python
import json

from llm import LLMError, chat

SYSTEM = (
    "You are a placement mentor. Rewrite resume bullets as: action verb + what was built + technology + "
    "measurable result. Use only facts given; write [add metric] if a result is missing. "
    'Reply with JSON only, no other text: {"bullet": string, "skills": [string]}'
)


def improve_bullet(raw: str) -> dict:
    reply = chat([{"role": "system", "content": SYSTEM},
                  {"role": "user", "content": raw}], temperature=0.2)
    text = reply.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    try:
        result = json.loads(text)
    except json.JSONDecodeError as exc:
        raise LLMError(f"model did not return valid JSON: {reply[:120]}") from exc

    if not isinstance(result.get("bullet"), str) or not isinstance(result.get("skills"), list):
        raise LLMError("JSON is missing the expected keys")
    if len(result["bullet"].split()) > 40:
        raise LLMError("bullet too long")
    return result


if __name__ == "__main__":
    print(improve_bullet("did a project on ML for placement prediction using python"))
```

Many providers also offer a **JSON mode** or **structured output** option that constrains the reply to a schema you
send. Use it when available, and keep the validation anyway. The Pydantic library is a convenient way to declare and
check the expected shape in larger projects.

## Cost, privacy and testing habits

- Keep prompts focused: you pay for every input and output token.
- Cache results for identical inputs during development instead of calling the API repeatedly.
- Send only what the task needs. A resume bullet needs the project facts, not the student's name, phone or marks.
- Test with a fixed set of inputs and check **properties** (valid JSON, length limit, no invented numbers) rather than
  exact wording, since outputs vary.

## Lab: résumé-bullet improver script

Build `week-19/bullet_improver.py`:

1. Read bullets from `bullets.txt` (one per line); write each original and improved bullet to `improved.csv` with
   the extracted skills.
2. Use the system prompt above, temperature 0.2, JSON output and validation.
3. If a bullet fails validation, retry once; if it fails again, record `ERROR` for that row and continue.
4. Keep the key in `.env`; commit `.env.example` and confirm with `git status` that `.env` is not tracked.
5. Try three prompt variations (no examples, with two examples, with a step-by-step instruction) on the same five
   bullets; compare the outputs in a short table in your README and pick the best prompt.

## Check yourself

1. Name the prompt patterns in: "You are an interviewer. Ask me one SQL question at a time. Reply as JSON with keys
   `question` and `difficulty`."
2. Why parse and validate JSON from the model even when the prompt says "reply with JSON only"?
3. You accidentally pushed `.env` with your key to GitHub and deleted it in the next commit. Is the key safe? What
   should you do?
