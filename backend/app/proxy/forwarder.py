import httpx
import tiktoken
import time
from typing import Any


class ProxyError(Exception):
    def __init__(self, message: str, status_code: int, provider: str):
        self.message = message
        self.status_code = status_code
        self.provider = provider
        super().__init__(message)


def count_tokens_openai(text: str, model: str = "gpt-4o") -> int:
    try:
        enc = tiktoken.encoding_for_model(model)
        return len(enc.encode(text))
    except Exception:
        return int(len(text.split()) * 1.3)


async def forward_openai(
    api_key: str, model: str, messages: list,
    temperature: float = 0.7, max_tokens: int = 2048, timeout: int = 60,
) -> dict:
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    body = {"model": model, "messages": messages, "temperature": temperature, "max_tokens": max_tokens}
    start = time.time()
    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.post("https://api.openai.com/v1/chat/completions", headers=headers, json=body)
    latency_ms = int((time.time() - start) * 1000)
    data = resp.json()
    if resp.status_code != 200:
        raise ProxyError(data.get("error", {}).get("message", "OpenAI failed"), resp.status_code, "openai")
    return {"raw": data, "latency_ms": latency_ms, "provider": "openai"}


async def forward_anthropic(
    api_key: str, model: str, messages: list,
    temperature: float = 0.7, max_tokens: int = 2048, timeout: int = 60,
) -> dict:
    # Extract system message (Anthropic requires it as a separate param, not in messages)
    system_text = None
    anthropic_messages = []
    for m in messages:
        role = m.get("role", "user")
        content = m.get("content", "")
        if role == "system":
            system_text = content
        else:
            # Anthropic only supports "user" and "assistant" roles
            anthropic_messages.append({"role": role, "content": content})

    # Anthropic requires at least one user message
    if not anthropic_messages:
        anthropic_messages = [{"role": "user", "content": "Hello"}]

    # Anthropic requires alternating user/assistant messages — merge consecutive same-role
    merged = []
    for msg in anthropic_messages:
        if merged and merged[-1]["role"] == msg["role"]:
            merged[-1]["content"] += "\n" + msg["content"]
        else:
            merged.append(dict(msg))
    # Ensure first message is from user
    if merged and merged[0]["role"] != "user":
        merged.insert(0, {"role": "user", "content": "Continue the conversation."})

    headers = {
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
    }
    body = {
        "model": model,
        "messages": merged,
        "max_tokens": max_tokens,
        "temperature": temperature,
    }
    if system_text:
        body["system"] = system_text

    start = time.time()
    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.post("https://api.anthropic.com/v1/messages", headers=headers, json=body)
    latency_ms = int((time.time() - start) * 1000)
    data = resp.json()
    if resp.status_code != 200:
        error_msg = data.get("error", {})
        if isinstance(error_msg, dict):
            error_msg = error_msg.get("message", "Anthropic failed")
        raise ProxyError(str(error_msg), resp.status_code, "anthropic")
    return {"raw": data, "latency_ms": latency_ms, "provider": "anthropic"}


async def forward_gemini(
    api_key: str, model: str, messages: list,
    temperature: float = 0.7, max_tokens: int = 2048, timeout: int = 60,
) -> dict:
    # Extract system message (Gemini uses systemInstruction, not in contents)
    system_text = None
    contents = []
    for m in messages:
        role_raw = m.get("role", "user")
        content = m.get("content", "")
        if role_raw == "system":
            system_text = content
            continue
        role = "model" if role_raw == "assistant" else "user"
        contents.append({"role": role, "parts": [{"text": content}]})

    if not contents:
        contents = [{"role": "user", "parts": [{"text": "Hello"}]}]

    body = {
        "contents": contents,
        "generationConfig": {"temperature": temperature, "maxOutputTokens": max_tokens},
    }
    if system_text:
        body["systemInstruction"] = {"parts": [{"text": system_text}]}

    start = time.time()
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.post(url, json=body)
    latency_ms = int((time.time() - start) * 1000)
    data = resp.json()
    if resp.status_code != 200:
        raise ProxyError(str(data.get("error", {}).get("message", "Gemini failed")), resp.status_code, "gemini")
    return {"raw": data, "latency_ms": latency_ms, "provider": "gemini"}


async def forward_to_provider(
    provider: str, api_key: str, model: str, messages: list, **kwargs
) -> dict:
    p = provider.lower()
    if p == "openai":
        return await forward_openai(api_key, model, messages, **kwargs)
    elif p == "anthropic":
        return await forward_anthropic(api_key, model, messages, **kwargs)
    elif p in ("gemini", "google"):
        return await forward_gemini(api_key, model, messages, **kwargs)
    else:
        raise ProxyError(f"Provider {provider} not supported", 400, provider)
