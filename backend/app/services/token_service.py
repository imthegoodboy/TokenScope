from typing import List


def count_tokens_openai(text: str, model: str = "gpt-4o") -> int:
    """Count tokens using tiktoken for OpenAI models."""
    try:
        import tiktoken
        encoding = tiktoken.encoding_for_model(model)
        return len(encoding.encode(text))
    except ImportError:
        # Fallback: rough estimate
        return len(text.split()) * 1.3


def count_tokens_anthropic(text: str) -> int:
    """Estimate tokens for Anthropic models."""
    try:
        # Anthropic's tokenizer: roughly 3.5 chars per token
        return len(text) // 3 + len(text.split()) // 2
    except Exception:
        return len(text.split()) * 1.3


def count_tokens_gemini(text: str) -> int:
    """Estimate tokens for Google Gemini models."""
    # Gemini uses SentencePiece, estimate ~4 chars per token
    return len(text) // 4 + len(text.split()) // 2


def count_tokens(text: str, provider: str, model: str) -> int:
    """Count tokens based on provider."""
    provider = provider.lower()
    if provider == "openai":
        return count_tokens_openai(text, model)
    elif provider == "anthropic":
        return count_tokens_anthropic(text)
    elif provider in ("gemini", "google"):
        return count_tokens_gemini(text)
    else:
        return len(text.split()) * 1.3


def tokenize_text(text: str, provider: str, model: str) -> List[str]:
    """Split text into tokens."""
    # Simple word-based tokenization
    words = text.split()
    return [w.strip() for w in words if w.strip()]
