from sklearn.feature_extraction.text import TfidfVectorizer
import re

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
            "gemini": "Give a precise and accurate answer."
        }

        if len(enhanced.split()) < len(tokens) * 0.7:
            if not enhanced.endswith('.'):
                enhanced += '.'
            enhanced += ' ' + context_additions.get(target_model, "Provide a clear response.")

        return enhanced.strip()

    def estimate_cost(self, text: str, model: str) -> float:
        tokens = len(text.split())
        token_cost = 0.001

        if "gpt-4" in model.lower():
            token_cost = 0.01
        elif "claude" in model.lower():
            token_cost = 0.008

        return round(tokens * token_cost / 1000, 6)
