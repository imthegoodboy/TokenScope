#!/usr/bin/env python3
"""Test script to verify TokenScope backend API"""

import asyncio
import httpx
import json

BASE_URL = "http://localhost:8000/api/v1"
USER_ID = "test_user_123"

async def test_api():
    print("Testing TokenScope API...\n")

    async with httpx.AsyncClient(timeout=30.0) as client:
        # Test health endpoint
        print("1. Testing health endpoint...")
        response = await client.get("http://localhost:8000/health")
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.json()}\n")

        # Test creating a proxy key
        print("2. Testing proxy key creation...")
        key_data = {
            "api_key": "sk-test-key",
            "provider": "openai",
            "model": "gpt-4o-mini",
            "temperature": 0.7,
            "max_tokens": 2048,
            "auto_enhance": False
        }
        response = await client.post(
            f"{BASE_URL}/keys",
            json=key_data,
            headers={"X-User-Id": USER_ID}
        )
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            proxy_key = response.json()
            print(f"   Created proxy ID: {proxy_key['proxy_id']}")
        else:
            print(f"   Error: {response.text}")
            proxy_key = None
        print()

        if proxy_key:
            # Test stats overview
            print("3. Testing stats overview...")
            response = await client.get(
                f"{BASE_URL}/stats/overview",
                headers={"X-User-Id": USER_ID}
            )
            print(f"   Status: {response.status_code}")
            print(f"   Response: {response.json()}\n")

            # Test analyzer
            print("4. Testing prompt analyzer...")
            response = await client.post(
                f"{BASE_URL}/analyze",
                json={"prompt": "Please explain quantum computing in simple terms", "target_model": "chatgpt"},
                headers={"X-User-Id": USER_ID}
            )
            print(f"   Status: {response.status_code}")
            if response.status_code == 200:
                result = response.json()
                print(f"   Original tokens: {result['original']['tokens']}")
                print(f"   Suggestion tokens: {result['suggestion']['tokens']}")
                print(f"   Token savings: {result['suggestion']['token_savings']}")
            else:
                print(f"   Error: {response.text}")
            print()

            # Test enhancer
            print("5. Testing prompt enhancer...")
            response = await client.post(
                f"{BASE_URL}/enhance",
                json={"prompt": "Write code for a REST API", "target_model": "chatgpt"},
                headers={"X-User-Id": USER_ID}
            )
            print(f"   Status: {response.status_code}")
            if response.status_code == 200:
                result = response.json()
                print(f"   Original: {result['original'][:50]}...")
                print(f"   Enhanced: {result['enhanced'][:50]}...")
            else:
                print(f"   Error: {response.text}")
            print()

        print("All API tests completed!")

if __name__ == "__main__":
    asyncio.run(test_api())
