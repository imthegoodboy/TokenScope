TokenScope
Build a smart LLM token usage dashboard with token-level importance highlighting

AI / ML | Beginner friendly | 18 hours | Solo or team of 2–3

PROBLEM BACKGROUND

Every time you send a message to an AI like ChatGPT or Claude, you are spending tokens — the currency of large language models (LLMs). But most developers and users have no idea which parts of their prompt are actually influencing the AI’s response, and which words are just “noise” eating up their token budget.

This creates two real problems: wasted money (you're sending useless tokens to the API), and poor AI outputs (because the important context is buried under irrelevant text).

YOUR CHALLENGE

Build TokenScope — a web app that takes any user prompt, sends it to an LLM API, and then does three things:

Track token usage
Show how many tokens were used in the prompt vs. response, and estimate the cost in USD.
Highlight important tokens
Visually highlight which words/tokens in the prompt likely influenced the response the most (using attention scores or TF-IDF as a proxy).
Suggest a trimmed prompt
Use a simple ML model or heuristic to suggest a shorter version of the prompt that retains the key tokens, reducing cost.

SCORING RUBRIC (100 pts total)

Token tracking + cost display — 25 pts — Accurate token count, correct USD cost estimate
Token importance visualization — 30 pts — Clear heat-map or highlight on the prompt text
Prompt trimming suggestion — 25 pts — Shorter prompt preserving meaning, shows savings
UI / UX + demo quality — 20 pts — Clean interface, smooth live demo presentation

HINTS FOR PARTICIPANTS

Use the OpenAI API or Gemini free tier — both return token counts directly in the API response object.

For token importance, use TF-IDF from sklearn — one function call, no GPU needed, gives an importance score per word.

For visualization, color-code tokens by importance: warm color = high impact, gray = low impact (like a heat map over the prompt).

For trimming, remove tokens below a threshold score and display the new token count and cost savings.

Frontend can be as simple as a React app or a plain HTML page with a textarea — keep it simple and demo-ready.

BONUS CHALLENGES

Compare 2 prompts side by side and show which is more cost-efficient

Multi-turn conversation token tracking (not just single prompts)

Token usage history chart across multiple queries in the session

Export the token analysis report as a downloadable PDF

TokenScope — Hackathon Problem Statement
AI/ML Track | 18 hours | Beginner level