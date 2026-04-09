import httpx
from typing import List, Dict, Any

class ProxyForwarder:
    async def forward(
        self,
        provider: str,
        api_key: str,
        model: str,
        messages: List[Dict[str, str]],
        settings: Dict[str, Any]
    ) -> Dict[str, Any]:

        if provider == "openai":
            return await self.forward_openai(api_key, model, messages, settings)
        elif provider == "gemini":
            return await self.forward_gemini(api_key, model, messages, settings)
        elif provider == "anthropic":
            return await self.forward_anthropic(api_key, model, messages, settings)
        else:
            raise ValueError(f"Unsupported provider: {provider}")

    async def forward_openai(
        self,
        api_key: str,
        model: str,
        messages: List[Dict[str, str]],
        settings: Dict[str, Any]
    ) -> Dict[str, Any]:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": model,
                    "messages": messages,
                    "temperature": settings.get("temperature", 0.7),
                    "max_tokens": settings.get("max_tokens", 2048)
                },
                timeout=60.0
            )

            if response.status_code != 200:
                error = response.json()
                raise Exception(f"OpenAI API error: {error.get('error', {}).get('message', 'Unknown error')}")

            return response.json()

    async def forward_gemini(
        self,
        api_key: str,
        model: str,
        messages: List[Dict[str, str]],
        settings: Dict[str, Any]
    ) -> Dict[str, Any]:
        contents = []
        for msg in messages:
            if msg.get("role") == "system":
                continue
            role = "user" if msg.get("role") == "user" else "model"
            contents.append({
                "role": role,
                "parts": [{"text": msg.get("content", "")}]
            })

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}",
                headers={"Content-Type": "application/json"},
                json={
                    "contents": contents,
                    "generationConfig": {
                        "temperature": settings.get("temperature", 0.7),
                        "maxOutputTokens": settings.get("max_tokens", 2048)
                    }
                },
                timeout=60.0
            )

            if response.status_code != 200:
                error = response.json()
                raise Exception(f"Gemini API error: {error.get('error', {}).get('message', 'Unknown error')}")

            data = response.json()
            response_text = data["candidates"][0]["content"]["parts"][0]["text"]

            return {
                "id": "gemini-" + model,
                "model": model,
                "choices": [{
                    "message": {"role": "assistant", "content": response_text},
                    "finish_reason": "stop"
                }],
                "usage": {
                    "prompt_tokens": data.get("usageMetadata", {}).get("promptTokenCount", 0),
                    "completion_tokens": data.get("usageMetadata", {}).get("candidatesTokenCount", 0),
                    "total_tokens": data.get("usageMetadata", {}).get("totalTokenCount", 0)
                }
            }

    async def forward_anthropic(
        self,
        api_key: str,
        model: str,
        messages: List[Dict[str, str]],
        settings: Dict[str, Any]
    ) -> Dict[str, Any]:
        system_msg = ""
        filtered_messages = []
        for msg in messages:
            if msg.get("role") == "system":
                system_msg = msg.get("content", "")
            else:
                filtered_messages.append(msg)

        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": api_key,
                    "Content-Type": "application/json",
                    "anthropic-version": "2023-06-01",
                    "anthropic-dangerous-direct-browser-access": "true"
                },
                json={
                    "model": model,
                    "messages": filtered_messages,
                    "system": system_msg or None,
                    "temperature": settings.get("temperature", 0.7),
                    "max_tokens": settings.get("max_tokens", 2048)
                },
                timeout=60.0
            )

            if response.status_code != 200:
                error = response.json()
                raise Exception(f"Anthropic API error: {error.get('error', {}).get('type', 'Unknown error')}")

            data = response.json()
            return {
                "id": data["id"],
                "model": model,
                "choices": [{
                    "message": {"role": "assistant", "content": data["content"][0]["text"]},
                    "finish_reason": data["stop_reason"]
                }],
                "usage": {
                    "prompt_tokens": data["usage"]["input_tokens"],
                    "completion_tokens": data["usage"]["output_tokens"],
                    "total_tokens": data["usage"]["input_tokens"] + data["usage"]["output_tokens"]
                }
            }
