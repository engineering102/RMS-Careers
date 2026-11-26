---
type: notes
title: "W19 · S4 · Building an AI App, AI Coding Assistants and Academic Integrity"
slug: w19-s4-ai-app-coding-assistants
topic: AI Applications
subject: programming-fundamentals
minutes: 40
description: Wrapping a model or RAG pipeline in a Streamlit or Gradio app with safe key handling and clear failure states, preparing a two-minute demo, and using AI coding assistants productively within the programme's integrity rules.
---
# Building an AI app, AI coding assistants and academic integrity

A pipeline in a notebook is a prototype. An **application** is something another person can open, use and
trust. This session turns your S3 pipeline (or your Week 18 model) into a small app, prepares the Mini Project 4 demo,
and sets the rules for working with AI coding assistants.

## Project layout

```text
mp4-handbook-assistant/
├── app.py               # Streamlit UI only
├── rag.py               # load, chunk, embed, store, retrieve, answer (from S3)
├── llm.py               # chat() from S2
├── build_index.py       # run once: creates rag_store/
├── eval.md              # test questions and results
├── requirements.txt
├── .env.example         # variable names only, no values
├── .gitignore           # .env, .venv/, rag_store/, __pycache__/
└── README.md
```

Keep the UI thin: `app.py` should call functions from `rag.py`, not contain the pipeline. Then you can test the
pipeline without the UI, and swap Streamlit for Gradio without touching the logic.

## A Streamlit chat app over RAG

```python
# app.py
import streamlit as st

from llm import LLMError
from rag import answer, load_store

st.set_page_config(page_title="Handbook assistant")
st.title("Handbook assistant")
st.caption("Answers come only from the indexed handbook. Always check the cited pages.")


@st.cache_resource
def get_store():
    return load_store("rag_store")        # opened once and shared across re-runs


store = get_store()

if "history" not in st.session_state:
    st.session_state.history = []         # survives re-runs within one browser session

for turn in st.session_state.history:
    with st.chat_message(turn["role"]):
        st.markdown(turn["content"])

question = st.chat_input("Ask about the handbook")
if question:
    st.session_state.history.append({"role": "user", "content": question})
    with st.chat_message("user"):
        st.markdown(question)

    with st.chat_message("assistant"):
        try:
            with st.spinner("Searching the handbook..."):
                result = answer(store, question)
            st.markdown(result["answer"])
            if result["sources"]:
                with st.expander("Sources"):
                    for source in result["sources"]:
                        st.write(source)
            reply = result["answer"]
        except LLMError as exc:
            reply = "The assistant is unavailable right now. Please try again in a minute."
            st.error(reply)
            print(f"LLM error: {exc}")     # server log for you; never show raw errors or keys to users
    st.session_state.history.append({"role": "assistant", "content": reply})
```

| Streamlit feature | Why it is here |
|---|---|
| `st.cache_resource` | opens the vector store or loads a model once, not on every re-run (use `cache_data` for data like DataFrames) |
| `st.session_state` | keeps the chat history between re-runs |
| `st.chat_input`, `st.chat_message` | chat-style layout |
| `st.spinner` | tells the user something is happening |
| `try / except` | a failed API call shows a friendly message instead of a stack trace |

Here `answer()` takes the store as an argument, a small change from S3 so the cached store is reused.

**Track A version** (data/ML app): use `st.navigation` or the `pages/` folder for three pages (EDA highlights, model
performance, prediction form). Load the joblib pipeline with `st.cache_resource`, build the form with `st.form` and
`st.number_input` / `st.selectbox` (whose limits double as input validation), and show feature importances or
coefficients so users can see what drives a prediction.

## Gradio as an alternative

Gradio builds a similar interface with less layout code and is popular for ML demos:

```python
import gradio as gr

from rag import answer, load_store

store = load_store("rag_store")


def respond(message, history):
    result = answer(store, message)
    sources = "\n".join(f"- {s}" for s in result["sources"])
    return f"{result['answer']}\n\nSources:\n{sources}" if sources else result["answer"]


gr.ChatInterface(respond, title="Handbook assistant").launch()
```

Either is acceptable for Mini Project 4. Pick one and do it well.

## Keys in a deployed app

Locally, the key comes from `.env`. When you deploy (Streamlit Community Cloud or Hugging Face Spaces, the stretch
goal), set it in the platform's **secrets** settings, never in the repository. Anyone who can see your public repo or
browser code could otherwise spend on the key. In this programme, use only the tutor-provided key from server-side
configuration.

## Preparing the two-minute demo

| Time | Show |
|---|---|
| 0:00–0:15 | the problem and who it is for, in one sentence |
| 0:15–1:15 | the app working: two good questions (or predictions), one "I don't know" case (or a validation error) |
| 1:15–1:40 | how it works: the pipeline diagram from your README |
| 1:40–2:00 | evaluation result and one honest limitation |

Record with any screen recorder, keep the browser zoomed so text is readable, and never show your `.env` file or
key on screen. In the live viva, either partner must be able to explain any line.

## AI coding assistants: productive use

AI coding assistants (chat assistants and in-editor tools) can speed up work, and also let you submit code you do not
understand. Use them where they make **you** better:

| Productive | Unproductive |
|---|---|
| "Explain what this error means and where to look" | pasting the assignment and submitting the output |
| "Explain this line of pandas, step by step" | accepting a 100-line suggestion you have not read |
| asking for test cases you had not thought of | asking it to "fix" code until it runs, without knowing why |
| generating boilerplate you then read and adapt | letting it choose libraries or APIs without checking they exist |
| reviewing your code for bugs, then verifying each claim | trusting its explanation of your dataset without checking |

Assistants hallucinate too: invented function names, parameters that do not exist, outdated APIs. Run the code,
read the official documentation for anything unfamiliar, and test.

## Academic integrity rules

From the programme's integrity and AI-tool policy:

- AI assistants **may** be used to learn: explanations, hints and debugging help.
- AI assistants and internet search are **not allowed in weekly tests, phase tests or the final exam** unless the
  paper explicitly permits them.
- In projects you must be able to **explain and change any line** you submit; tutors run short viva spot checks.
- Copied work (from peers, the internet or AI, without understanding) receives **zero** for that item and a
  re-attempt at a capped score; repeated cases go to the coordinator.
- **Never enter student personal data** into external AI tools.

Good practice: add an "AI assistance" line to each README saying what you used AI for, for example "used an assistant
to explain FAISS index types and to suggest test questions; all code written and reviewed by us".

## Lab: Mini Project 4 demo

Pairs present their Mini Project 4 progress: a working app on at least one track, the README draft and the evaluation
(Track B `eval.md`, or Track A model metrics). Each partner explains one part of the code chosen by the tutor.

## Check yourself

1. Why should `app.py` call functions in `rag.py` instead of containing the pipeline itself?
2. What is the difference between `st.cache_data` and `st.cache_resource`, and which fits a vector store?
3. A teammate's code calls a pandas method you cannot find in the documentation, suggested by an assistant. What do you
   do before submitting?
