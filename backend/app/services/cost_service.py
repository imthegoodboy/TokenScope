# Token pricing per 1M tokens
TOKEN_PRICING = {
    "openai": {
        "gpt-4o": {"input": 5.00, "output": 15.00},
        "gpt-4o-mini": {"input": 0.15, "output": 0.60},
        "gpt-4-turbo": {"input": 10.00, "output": 30.00},
        "gpt-3.5-turbo": {"input": 0.50, "output": 1.50},
    },
    "anthropic": {
        "claude-3-5-sonnet": {"input": 3.00, "output": 15.00},
        "claude-3-5-haiku": {"input": 0.80, "output": 4.00},
        "claude-3-opus": {"input": 15.00, "output": 75.00},
        "claude-3-sonnet": {"input": 3.00, "output": 15.00},
    },
    "gemini": {
        "gemini-2.0-flash": {"input": 0.00, "output": 0.00},
        "gemini-1.5-pro": {"input": 1.25, "output": 5.00},
        "gemini-1.5-flash": {"input": 0.075, "output": 0.30},
        "gemini-1.0-pro": {"input": 0.50, "output": 1.50},
    },
}


def get_cost(
    prompt_tokens: int,
    completion_tokens: int,
    provider: str,
    model: str,
) -> float:
    """Calculate cost in USD."""
    provider = provider.lower()
    model_pricing = TOKEN_PRICING.get(provider, {}).get(model.lower())

    if not model_pricing:
        # Default fallback pricing
        input_price = 1.0 / 1_000_000
        output_price = 3.0 / 1_000_000
    else:
        input_price = model_pricing["input"] / 1_000_000
        output_price = model_pricing["output"] / 1_000_000

    return (prompt_tokens * input_price) + (completion_tokens * output_price)


def estimate_cost(
    text: str,
    provider: str,
    model: str,
    is_completion: bool = False,
) -> float:
    """Estimate cost for a given text."""
    from app.services.token_service import count_tokens

    tokens = count_tokens(text, provider, model)
    provider = provider.lower()
    model_pricing = TOKEN_PRICING.get(provider, {}).get(model.lower())

    if not model_pricing:
        price = 1.0 / 1_000_000 if not is_completion else 3.0 / 1_000_000
    else:
        price = model_pricing["input"] / 1_000_000 if not is_completion else model_pricing["output"] / 1_000_000

    return tokens * price


def get_supported_models(provider: str) -> dict:
    """Get supported models and pricing for a provider."""
    return TOKEN_PRICING.get(provider.lower(), {})
