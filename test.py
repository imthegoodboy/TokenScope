import requests

# Your proxy URL
PROXY_URL = "http://localhost:8000/api/v1/proxy/nUnjRjMuIy1KFBh3"

# Send request through your proxy
response = requests.post(PROXY_URL, json={
    "messages": [
        {"role": "user", "content": "Hello, how are you?"}
    ]
})

print(response.json())