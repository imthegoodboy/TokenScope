from sklearn.feature_extraction.text import TfidfVectorizer
import numpy as np
from typing import List
from app.services.token_service import tokenize_text


def compute_tfidf_scores(prompt: str, user_history: List[str] = None) -> List[dict]:
    """Compute TF-IDF importance scores for each word in the prompt."""
    if user_history is None:
        user_history = []

    # Build corpus: history + current prompt
    corpus = user_history + [prompt]
    words = tokenize_text(prompt, "openai", "gpt-4o")

    if len(words) == 0:
        return []

    try:
        vectorizer = TfidfVectorizer(
            analyzer="word",
            lowercase=True,
            stop_words=None,  # Keep all words
            ngram_range=(1, 1),
            max_features=5000,
        )
        tfidf_matrix = vectorizer.fit_transform(corpus)
        feature_names = vectorizer.get_feature_names_out()

        # Get scores for the last document (current prompt)
        scores = tfidf_matrix[-1].toarray().flatten()

        # Map words to scores
        word_scores = []
        seen = set()
        for word in words:
            clean_word = word.lower().strip(".,!?;:()[]{}'\"")
            if clean_word in seen:
                continue
            seen.add(clean_word)

            if clean_word in feature_names:
                idx = list(feature_names).index(clean_word)
                score = float(scores[idx])
            else:
                score = 0.0

            word_scores.append({
                "token": clean_word,
                "score": score,
                "importance": _score_to_importance(score),
            })

        return word_scores

    except Exception:
        # Fallback: uniform scores
        return [
            {
                "token": w.lower(),
                "score": 1.0 / len(words) if words else 0,
                "importance": "medium",
            }
            for w in words
        ]


def _score_to_importance(score: float) -> str:
    """Convert TF-IDF score to importance level."""
    if score > 0.3:
        return "high"
    elif score > 0.1:
        return "medium"
    else:
        return "low"


def optimize_prompt(
    prompt: str,
    target_tokens: int = None,
    user_history: List[str] = None,
) -> dict:
    """Optimize a prompt by keeping the most important tokens."""
    word_scores = compute_tfidf_scores(prompt, user_history)
    words = tokenize_text(prompt, "openai", "gpt-4o")

    if not word_scores:
        return {
            "original": prompt,
            "optimized": prompt,
            "saved_tokens": 0,
            "kept_key_tokens": [],
        }

    # Sort by score descending
    sorted_scores = sorted(word_scores, key=lambda x: x["score"], reverse=True)

    # Keep top N tokens by importance
    if target_tokens is None:
        target_tokens = max(len(sorted_scores) // 2, 1)

    kept = sorted_scores[:target_tokens]
    # Reorder to maintain original sequence
    kept_set = {t["token"] for t in kept}
    reordered = [t for t in word_scores if t["token"] in kept_set]

    # Reconstruct optimized prompt (simplified — preserves word order)
    optimized_words = [w["token"] for w in reordered]
    optimized = " ".join(optimized_words)

    saved = len(word_scores) - len(kept)

    return {
        "original": prompt,
        "optimized": optimized,
        "saved_tokens": saved,
        "kept_key_tokens": kept[:15],
    }
