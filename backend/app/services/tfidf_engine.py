from sklearn.feature_extraction.text import TfidfVectorizer
import re

from .token_analyzer import TokenAnalyzer

_TARGET_TO_PRICING_MODEL = {
    "chatgpt": ("openai", "gpt-4o"),
    "gemini": ("gemini", "gemini-1.5-flash"),
    "claude": ("anthropic", "claude-3-5-sonnet"),
}

_token_analyzer = TokenAnalyzer()


class TFIDFEngine:
    def __init__(self):
        self.vectorizer = TfidfVectorizer(
            stop_words='english',
            ngram_range=(1, 2),
            max_features=1000
        )
        self.fitted = False

    def analyze(self, text: str) -> dict:
        tokens = text.split()
        scores = {}

        important_words = {
            "analyze", "calculate", "explain", "describe", "compare", "summarize",
            "write", "create", "generate", "help", "find", "solve", "implement",
            "fix", "debug", "review", "optimize", "improve", "design", "build"
        }

        for token in tokens:
            clean_token = re.sub(r'[^\w\s]', '', token.lower())
            if clean_token in important_words:
                scores[token] = 0.9
            elif len(token) > 5:
                scores[token] = 0.5
            else:
                scores[token] = 0.2

        return scores

    def enhance_prompt(self, text: str, target_model: str = "chatgpt") -> str:
        tokens = text.split()
        important_tokens = []

        scores = self.analyze(text)
        threshold = 0.3

        for i, token in enumerate(tokens):
            if scores.get(token, 0) >= threshold:
                important_tokens.append(token)
            elif i == 0 or i == len(tokens) - 1:
                important_tokens.append(token)
            elif token[0].isupper():
                important_tokens.append(token)
            elif i < 3:
                important_tokens.append(token)

        enhanced = ' '.join(important_tokens)

        context_additions = {
            "chatgpt": "Provide a clear, concise response.",
            "gemini": "Give a precise and accurate answer.",
            "claude": "Reply clearly and directly.",
        }

        if len(enhanced.split()) < len(tokens) * 0.7:
            if not enhanced.endswith('.'):
                enhanced += '.'
            enhanced += ' ' + context_additions.get(target_model, "Provide a clear response.")

        return enhanced.strip()

    def estimate_cost(self, text: str, target_model: str) -> float:
        """Input-only cost (prompt tokens) using TokenAnalyzer $/1M rates for the selected target."""
        n = len(text.split())
        key = (target_model or "chatgpt").lower()
        provider, model = _TARGET_TO_PRICING_MODEL.get(key, ("openai", "gpt-4o"))
        return _token_analyzer.calculate_cost(provider, model, n, 0)
