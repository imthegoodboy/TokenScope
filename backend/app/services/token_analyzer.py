class TokenAnalyzer:
    PRICING = {
        "openai": {
            "gpt-4o": {"prompt": 2.50, "completion": 10.00},
            "gpt-4o-mini": {"prompt": 0.15, "completion": 0.60},
            "gpt-4-turbo": {"prompt": 10.00, "completion": 30.00},
            "gpt-3.5-turbo": {"prompt": 0.50, "completion": 1.50},
        },
        "gemini": {
            "gemini-1.5-pro": {"prompt": 1.25, "completion": 5.00},
            "gemini-1.5-flash": {"prompt": 0.035, "completion": 0.14},
            "gemini-1.0-pro": {"prompt": 0.50, "completion": 1.50},
        },
        "anthropic": {
            "claude-3-5-sonnet": {"prompt": 3.00, "completion": 15.00},
            "claude-3-opus": {"prompt": 15.00, "completion": 75.00},
            "claude-3-haiku": {"prompt": 0.25, "completion": 1.25},
        }
    }

    def calculate_cost(self, provider: str, model: str, prompt_tokens: int, completion_tokens: int) -> float:
        model_pricing = self.PRICING.get(provider, {}).get(model, {})

        if not model_pricing:
            model_pricing = {"prompt": 1.0, "completion": 2.0}

        prompt_cost = (prompt_tokens / 1_000_000) * model_pricing["prompt"]
        completion_cost = (completion_tokens / 1_000_000) * model_pricing["completion"]

        return round(prompt_cost + completion_cost, 6)

    def estimate_tokens(self, text: str) -> int:
        return len(text.split())
