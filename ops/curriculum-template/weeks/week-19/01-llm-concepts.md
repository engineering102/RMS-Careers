---
type: notes
title: "W19 · S1 · How LLMs Work, Where They Fail and Responsible AI"
slug: w19-s1-llm-concepts-responsible-ai
topic: Generative AI
subject: programming-fundamentals
minutes: 40
description: A conceptual picture of large language models: tokens, embeddings, transformer intuition, context windows and temperature, followed by their failure modes (hallucination, bias, privacy) and the rules for using them responsibly.
---
# How LLMs work, where they fail and responsible AI

You have probably used an AI chat assistant. This week you build with one. To build well, you need an accurate
mental model of what a **large language model (LLM)** is doing, because most mistakes people make with LLMs come from
treating them as something they are not: a database, a search engine or a calculator.

## The one-sentence version

An LLM is a neural network trained on a very large amount of text to **predict the next token** given the tokens so
far. Generating an answer means repeating that prediction: pick a token, append it, predict again.

Everything else (answering questions, writing code, summarising) emerges from doing next-token prediction very well,
plus further training on instruction-following examples and human feedback so that the model behaves like a helpful
assistant.

## Tokens

Models do not read characters or whole words; they read **tokens**, chunks of text from a fixed vocabulary.
Common words are usually one token; rare words, names and code are split into several pieces.

```text
"Placement preparation"  ->  "Pl" "acement" " preparation"     (an illustrative split; every model's tokenizer differs)
```

Tokens matter in practice:

- **Limits** (context window, maximum output) are measured in tokens, not words or characters.
- **Cost and speed** of an API call usually depend on input plus output tokens.
- **Odd failures:** counting letters in a word or reversing a string can go wrong because the model sees tokens, not
  letters.

A rough rule for English is that a token is a bit less than a word on average, but measure with your provider's
tokenizer when it matters.

## Embeddings

The model turns each token into an **embedding**: a long list of numbers (a vector) that represents meaning. Texts with
similar meaning end up with vectors that point in similar directions, so similarity can be measured numerically, for
example with **cosine similarity** (1 = same direction, 0 = unrelated).

```python
import numpy as np

def cosine(a, b):
    a, b = np.asarray(a, dtype=float), np.asarray(b, dtype=float)
    return float(a @ b / (np.linalg.norm(a) * np.linalg.norm(b)))

# toy 3-dimensional "embeddings"; real ones have hundreds or thousands of dimensions
print(round(cosine([0.9, 0.1, 0.0], [0.8, 0.2, 0.1]), 3))   # high: similar meaning
print(round(cosine([0.9, 0.1, 0.0], [0.0, 0.2, 0.9]), 3))   # low: different meaning
```

Embedding models that turn a whole sentence or paragraph into one vector are the basis of semantic search and RAG in
S3.

## Transformer intuition

Modern LLMs use the **transformer** architecture. Its key idea is **attention**: when processing each token, the model
weighs how relevant every other token in the context is. In "The bank raised its interest rate", attention lets "bank"
draw on "interest rate" and be understood as a financial bank, not a river bank.

A transformer stacks many attention layers. Each refines every token's representation using the context, and the
final layer produces a probability for every token in the vocabulary as the next one. You do not need the maths for
this course; you need the consequence: **the model's output depends entirely on the tokens in its context**.

## Context window

The **context window** is the maximum number of tokens the model can consider at once: your instructions, the
conversation so far, any documents you paste, and the answer it is writing. Practical consequences:

- The model has **no memory between API calls**. A chat app "remembers" because it re-sends the conversation each
  time.
- Text outside the window is invisible to the model. Long documents must be shortened, summarised or retrieved in
  pieces (RAG).
- Long contexts cost more and can dilute attention; relevant, focused context usually gives better answers.

## Temperature and sampling

At each step the model produces probabilities for possible next tokens. **Temperature** controls how they are
sampled:

| Temperature | Behaviour | Use for |
|---|---|---|
| Low (around 0) | almost always the most likely token; repeatable, focused | extraction, classification, JSON output, factual Q&A |
| Medium | some variety | drafting, rewriting |
| High | more surprising, more mistakes | brainstorming |

Even at temperature 0, outputs are not guaranteed to be identical across runs or model versions, so never rely on
exact wording in tests.

## Where LLMs fail

| Failure | What it looks like | Why | Mitigation |
|---|---|---|---|
| **Hallucination** | confident, fluent, wrong: invented citations, APIs, statistics, people | the model generates plausible text, not verified facts | ground answers in supplied sources (RAG), ask for sources, verify |
| Outdated knowledge | unaware of recent events or library versions | training data has a cut-off date | give current documents in the prompt |
| Bias | stereotyped assumptions about gender, region, caste, college | patterns in training text | test with varied inputs; human review of consequential outputs |
| Arithmetic and logic slips | wrong totals, skipped steps | token prediction is not calculation | compute in code; check results |
| Prompt injection | text inside a document tells the model to ignore your instructions | the model cannot reliably tell instructions from data | treat retrieved text as data; limit what the app can do |
| Privacy leaks | personal data pasted into a third-party service | the prompt leaves your machine | never send personal data; anonymise |

A hallucination is not a bug that will be fixed by the next version: it is a property of how generation works. Design
your application so that a wrong answer is caught or limited.

## Responsible use

The programme's rules (also in the syllabus integrity policy):

- [ ] **Never paste personal data** (names with marks, phone numbers, Aadhaar numbers, addresses, health information) into
  external AI tools. Use synthetic or anonymised data.
- [ ] **Keys stay secret.** API keys live in environment variables or server-side configuration, never in code, Git
  or screenshots.
- [ ] **Verify before you rely.** Facts, numbers, code and citations from an LLM are drafts until checked.
- [ ] **Disclose AI use** in project READMEs: what you used it for.
- [ ] **No AI in tests** unless the paper explicitly allows it. In projects you must be able to explain and change
  every line you submit.
- [ ] **Keep a human in the loop** for decisions about people: shortlisting, grading, eligibility.

## Lab: compare model outputs and identify hallucinations

Work in pairs with the tutor-provided tool or key (do not enter payment details anywhere):

1. Ask the same three factual questions about your own college or a local topic, at a low and a high temperature (or
   across two models if available). Record the answers in a table.
2. Ask for "three research papers about placement outcomes in Indian engineering colleges, with authors and links".
   Check every citation. Mark each as real, partly real or invented.
3. Ask a question whose answer is in a short passage, first without the passage and then with it pasted in, with the
   instruction "answer only from the passage; say 'not in the passage' otherwise". Compare.
4. Write a half-page note: which failures you saw, and one rule you will follow when using LLMs in your project.

## Check yourself

1. Why can a model fail to count the letter "r" in a word correctly, even though it writes fluent essays?
2. A chatbot "forgot" what you told it an hour ago in the same conversation. Give a likely reason.
3. For an app that extracts dates and amounts from invoices into JSON, would you choose a low or a high temperature?
   Why?
